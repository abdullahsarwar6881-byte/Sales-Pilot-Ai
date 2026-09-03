import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isPriceFollowUp,
  isAvailabilityFollowUp,
  isColorFollowUp,
  isSizeFollowUp,
  isComparisonFollowUp,
  resolveConversationContext,
} from "@/lib/ai/resolveConversationContext";

import {
  createEmptyConversationContext,
} from "@/lib/ai/conversationContext";
import { createEmbedding } from "@/lib/ai/embeddings";
import { chatWithAI } from "@/lib/ai/chat";
import { loadWebsiteContext, buildWebsiteContextForAI } from "@/lib/site/capabilities";

import { detectAction } from "@/lib/actions/detectAction";
import { executeAction } from "@/lib/actions/actionRouter";

import type { ActionRequest } from "@/lib/actions/types";

import {
  searchAndRankProducts,
  findExactProduct,
} from "@/lib/products/searchProducts";
import { retrieveVisualCandidates } from "@/lib/products/visualCandidateRetrieval";
import { isVisualEmbeddingAvailable } from "@/lib/products/visualEmbedding";
import { extractVisionFeatures } from "@/lib/products/multimodalMatch";
import {
  PLANS,
  type PlanId,
} from "@/lib/billing/plans";

// =====================================================
// SUPABASE ADMIN CLIENT
// =====================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "Supabase environment variables are missing."
  );
}

const supabaseAdmin = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);


// =====================================================
// PRODUCT CONTEXT MEMORY
// =====================================================
//
// Tracks the exact, ordered product cards that were most
// recently displayed to a customer so follow-up references
// ("first one", "second one", "the cheapest one", "its link")
// resolve against the same products the customer actually
// saw, without re-ranking or re-searching.
//
// Keyed by "visitorSessionId:profileId" (falling back to the
// conversation id) and kept in memory for the life of the
// request handler. This is ephemeral per server process.
// =====================================================

const productContextMemory =
  new Map<string, any[]>();

// Ephemeral per-process record of the last uploaded-image match decision so a
// follow-up turn ("is this available?", "its link") stays honest about whether
// the image was an EXACT verified match or only similar/no-match.
const imageMatchMemory =
  new Map<
    string,
    {
      matchType: "exact" | "high_confidence" | "similar" | "no_match";
      exactProductId?: string | null;
      exactProduct?: any | null;
    }
  >();

function rememberImageMatch(
  key: string,
  imageMatch: {
    matchType: "exact" | "high_confidence" | "similar" | "no_match";
    exactProductId?: string | null;
    exactProduct?: any | null;
  } | null
) {
  if (imageMatch && imageMatch.matchType) {
    imageMatchMemory.set(key, imageMatch);
  } else {
    imageMatchMemory.delete(key);
  }
}

function getRememberedImageMatch(key: string) {
  return imageMatchMemory.get(key) || null;
}

function getProductContextKey(
  visitorSessionId: string | null,
  profileId: string,
  conversationId?: number | string | null
) {
  if (visitorSessionId) {
    return `${visitorSessionId}:${profileId}`;
  }
  if (conversationId != null) {
    return `conv:${conversationId}:${profileId}`;
  }
  return `profile:${profileId}`;
}

function rememberDisplayedProducts(
  key: string,
  products: any[]
) {
  if (!Array.isArray(products) || products.length === 0) {
    return;
  }
  // Store a compact, ordered snapshot of exactly what was
  // returned so follow-ups resolve against the displayed list.
  productContextMemory.set(
    key,
    products.map((entry: any) => normalizeProductCardForMemory(entry)).filter(Boolean)
  );
}

function getRememberedProducts(
  key: string
): any[] {
  return productContextMemory.get(key) || [];
}

function normalizeProductCardForMemory(
  entry: any
) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const productId =
    entry.id ||
    entry.product_id ||
    entry.externalId ||
    entry.external_id ||
    entry.sku ||
    "";
  const name =
    entry.displayName ||
    entry.name ||
    entry.title ||
    entry.product_title ||
    "";
  const productUrl =
    entry.productUrl ||
    entry.viewUrl ||
    entry.url ||
    entry.page_url ||
    "";
  if (!name && !productUrl) {
    return null;
  }
  return {
    ...entry,
    id: productId || entry.id || undefined,
    productId: productId || undefined,
    displayName: String(name || "").trim(),
    name: String(name || "").trim(),
    title: String(name || "").trim(),
    productUrl: String(productUrl || "").trim(),
    viewUrl: String(productUrl || "").trim(),
    url: String(productUrl || "").trim(),
  };
}

// =====================================================
// CONFIG
// =====================================================

const KNOWLEDGE_MATCH_COUNT = 5;

const MAX_CONTEXT_MATCHES = 5;

const MAX_HISTORY_MESSAGES = 10;

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const OPENAI_VISION_MODEL =
  process.env.OPENAI_VISION_MODEL ??
  process.env.OPENAI_CHAT_MODEL ??
  "gpt-5-mini";

const IMAGE_TIMEOUT = 60000;

// Keep JSON image payload reasonably small.
const MAX_IMAGE_DATA_LENGTH =
  4_500_000;

// Product-result configuration.
const MAX_PRODUCT_CARDS = 3;
const MAX_PRODUCT_DESCRIPTION_LENGTH = 220;

// =====================================================
// BILLING ACCESS CHECK
// =====================================================

async function checkBillingAccess(
  profileId: string
) {
  const now = new Date();

  // ---------------------------------------------------
  // GET SUBSCRIPTION
  // ---------------------------------------------------

  const {
    data: subscription,
    error: subscriptionError,
  } = await supabaseAdmin
    .from("subscriptions")
    .select(
      `
        id,
        user_id,
        plan_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end
      `
    )
    .eq("user_id", profileId)
    .maybeSingle();

  if (subscriptionError) {
    console.error(
      "BILLING SUBSCRIPTION ERROR:",
      subscriptionError
    );

    return {
      allowed: false,

      error:
        "Unable to verify your Sales Pilot subscription.",

      code:
        "BILLING_CHECK_FAILED",
    };
  }

  // ---------------------------------------------------
  // NO SUBSCRIPTION
  // ---------------------------------------------------

  if (!subscription) {
    return {
      allowed: false,

      error:
        "This Sales Pilot account does not have an active subscription.",

      code:
        "NO_SUBSCRIPTION",
    };
  }

  // ---------------------------------------------------
  // PLAN
  // ---------------------------------------------------

  const planId: PlanId =
    subscription.plan_id &&
    subscription.plan_id in PLANS
      ? (subscription.plan_id as PlanId)
      : "starter";

  const plan = PLANS[planId];

  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  const status = String(
    subscription.status || ""
  )
    .toLowerCase()
    .trim();

  const allowedStatuses = [
    "active",
    "trialing",
  ];

  if (
    !allowedStatuses.includes(
      status
    )
  ) {
    return {
      allowed: false,

      error:
        "Your Sales Pilot subscription is not active. Please renew or upgrade your plan.",

      code:
        "SUBSCRIPTION_NOT_ACTIVE",

      planId,

      planName:
        plan.name,

      used: 0,

      limit:
        plan.limits.conversations,
    };
  }

  // ---------------------------------------------------
  // BILLING PERIOD
  // ---------------------------------------------------

  const periodStart =
    subscription.current_period_start
      ? new Date(
          subscription.current_period_start
        )
      : null;

  const periodEnd =
    subscription.current_period_end
      ? new Date(
          subscription.current_period_end
        )
      : null;

  if (
    !periodStart ||
    !periodEnd
  ) {
    return {
      allowed: false,

      error:
        "Your Sales Pilot billing period is not configured correctly.",

      code:
        "BILLING_PERIOD_INVALID",

      planId,

      planName:
        plan.name,

      used: 0,

      limit:
        plan.limits.conversations,
    };
  }

  // ---------------------------------------------------
  // PERIOD EXPIRED
  // ---------------------------------------------------

  if (now >= periodEnd) {
    return {
      allowed: false,

      error:
        "Your Sales Pilot billing period has ended. Please renew or upgrade your plan.",

      code:
        "BILLING_PERIOD_EXPIRED",

      planId,

      planName:
        plan.name,

      used: 0,

      limit:
        plan.limits.conversations,
    };
  }

  // ---------------------------------------------------
  // COUNT CONVERSATIONS
  // ---------------------------------------------------

  const {
    count: conversationCount,
    error:
      conversationCountError,
  } = await supabaseAdmin
    .from("conversations")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "user_id",
      profileId
    )
    .gte(
      "created_at",
      periodStart.toISOString()
    )
    .lt(
      "created_at",
      periodEnd.toISOString()
    );

  if (
    conversationCountError
  ) {
    console.error(
      "BILLING CONVERSATION COUNT ERROR:",
      conversationCountError
    );

    return {
      allowed: false,

      error:
        "Unable to verify your conversation usage.",

      code:
        "USAGE_CHECK_FAILED",
    };
  }

  const used =
    conversationCount ?? 0;

  const limit =
    plan.limits.conversations;
  // ---------------------------------------------------
  // ---------------------------------------------------
  // DEV-ONLY LIMIT OVERRIDE
  // ---------------------------------------------------
  // Intended for local development/testing only. Never enabled
  // in production. Temporarily lifts the conversation limit
  // without changing any billing data or plan definitions.
  const devOverride =
    process.env.NODE_ENV !== "production" &&
      process.env.DEV_CHAT_LIMIT_OVERRIDE === "true";

  if (devOverride && used >= limit) {
    console.warn(
      "DEV CHAT LIMIT OVERRIDE ACTIVE â€” bypassing conversation limit"
    );
  } else if (used >= limit) {
    return {
      allowed: false,

      error:
        `Your ${plan.name} plan has reached its limit of ${limit.toLocaleString()} AI conversations for this billing period. Please upgrade your plan to continue.`,

      code:
        "CONVERSATION_LIMIT_REACHED",

      planId,

      planName:
        plan.name,

      used,

      limit,

      remaining: 0,
    };
  }

  // =====================================================
  // ALLOWED
  // =====================================================

  return {
    allowed: true,


    planId,

    planName:
      plan.name,

    used,

    limit,

    remaining:
      limit - used,
  };
}

// =====================================================
// FAST RESPONSE
// =====================================================

function getFastResponse(
  message: string
) {
  const text =
    message
      .toLowerCase()
      .trim()
      .replace(
        /[!?.,]/g,
        ""
      )
      .replace(
        /\s+/g,
        " "
      );

  const greetings = [
    "hi",
    "hello",
    "hey",
    "hii",
    "hiii",
    "helo",
    "good morning",
    "good afternoon",
    "good evening",
  ];

  if (
    greetings.includes(text)
  ) {
    return "Hi! How can I help you today?";
  }

  const thanks = [
    "thanks",
    "thank you",
    "thanks a lot",
    "thankyou",
    "thx",
  ];

  if (
    thanks.includes(text)
  ) {
    return "You're welcome! Is there anything else I can help with?";
  }

  const goodbye = [
    "bye",
    "goodbye",
    "see you",
    "see you later",
  ];

  if (
    goodbye.includes(text)
  ) {
    return "Goodbye! Have a great day.";
  }

  if (
    [
      "how are you",
      "how are you doing",
      "how r u",
    ].includes(text)
  ) {
    return "I'm doing well, thanks. How can I help you today?";
  }

  return null;
}


// =====================================================
// CASUAL MESSAGE / RETRIEVAL GATE
// =====================================================

function isGeneralCasualMessage(
  message: string
): boolean {
  const text =
    String(message || "")
      .toLowerCase()
      .trim()
      .replace(/[!?.,]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  if (!text) {
    return false;
  }

  const greets = [
    "hi",
    "hello",
    "hey",
    "hii",
    "hiii",
    "helo",
    "good morning",
    "good afternoon",
    "good evening",
    "hi there",
    "hello there",
    "hey there",
    "hi how are you",
    "hello how are you",
    "how are you",
    "how are you doing",
    "how r u",
    "how's it going",
    "how it going",
    "whats up",
    "what's up",
    "sup",
    "yo",
  ];

  if (
    greets.some(
      (g) =>
        text === g ||
        text.startsWith(g + " ")
    )
  ) {
    return true;
  }

  const thanks = [
    "thanks",
    "thank you",
    "thankyou",
    "thx",
    "thanks a lot",
    "ty",
    "thank you so much",
  ];

  if (
    thanks.some(
      (t) =>
        text === t ||
        text.startsWith(t + " ")
    )
  ) {
    return true;
  }

  const byes = [
    "bye",
    "goodbye",
    "see you",
    "see you later",
    "take care",
    "good night",
  ];

  if (
    byes.some(
      (b) =>
        text === b ||
        text.startsWith(b + " ")
    )
  ) {
    return true;
  }

  const ack = [
    "ok",
    "okay",
    "cool",
    "nice",
    "great",
    "awesome",
    "perfect",
    "sure",
    "alright",
    "got it",
    "understood",
    "noted",
  ];

  return ack.includes(text);
}

// =====================================================
// HOMEPAGE / STORE LINK INTELLIGENCE
// =====================================================

function isHomepageRequest(
  message: string
): boolean {
  const text =
    String(message || "")
      .toLowerCase()
      .replace(/[!?.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  if (!text) {
    return false;
  }

  const phrases = [
    "your website",
    "your site",
    "your store link",
    "your store url",
    "your homepage",
    "homepage",
    "store link",
    "website link",
    "website url",
    "store url",
    "shop link",
    "visit your store",
    "visit your website",
    "visit your site",
    "take me to your",
    "link to your",
    "your shop link",
    "send me your website",
    "give me your website",
  ];

  return phrases.some(
    (phrase) =>
      text.includes(phrase)
  );
}

function cleanStoreUrl(
  value: unknown
): string {
  const url =
    String(value || "")
      .trim()
      .replace(/[),.;]+$/, "");

  if (!/^https?:\/\//i.test(url)) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/$/, "");
  } catch {
    return "";
  }
}

async function resolveVerifiedStoreUrl(
  profileId: string
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("website_url")
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      console.error("STORE URL PROFILE ERROR:", error);
    }

    const profileUrl =
      cleanStoreUrl(
        data?.website_url
      );

    if (profileUrl) {
      return profileUrl;
    }
  } catch (error) {
    console.error("STORE URL PROFILE LOOKUP ERROR:", error);
  }

  // Fall back to a verified homepage knowledge page when present.
  try {
    const { data, error } = await supabaseAdmin
      .from("knowledge_pages")
      .select("page_url")
      .eq("user_id", profileId)
      .eq("page_type", "home")
      .limit(1)
      .maybeSingle();

    if (!error && data?.page_url) {
      return cleanStoreUrl(data.page_url);
    }
  } catch (error) {
    console.error("STORE URL HOMEPAGE LOOKUP ERROR:", error);
  }

  return "";
}

function shouldSearchKnowledge(
  message: string,
  intent: string,
  hasImage: boolean
): boolean {
  if (hasImage) {
    return true;
  }

  if (isGeneralCasualMessage(message)) {
    return false;
  }

  const trimmed =
    String(message || "").trim();

  if (
    trimmed.length > 0 &&
    trimmed.length <= 2
  ) {
    return false;
  }

  return true;
}

// =====================================================
// DETECT INTENT
// =====================================================

function detectIntent(
  question: string
) {
  const text =
    question.toLowerCase();

  if (
    [
      "shipping",
      "delivery",
      "return",
      "refund",
      "exchange",
      "cancel",
      "policy",
      "warranty",
      "payment",
      "returns",
    ].some(
      (word) =>
        text.includes(word)
    )
  ) {
    return "policy";
  }

  if (
    [
      "price",
      "prize",
      "cost",
      "buy",
      "product",
      "products",
      "stock",
      "available",
      "availability",
      "size",
      "color",
      "hoodie",
      "hoodies",
      "shirt",
      "shirts",
      "t-shirt",
      "t-shirts",
      "shoe",
      "shoes",
      "jacket",
      "jackets",
      "cap",
      "caps",
      "dress",
      "dresses",
      "pants",
      "jeans",
      "bag",
      "bags",
      "watch",
      "watches",
    ].some(
      (word) =>
        text.includes(word)
    )
  ) {
    return "product";
  }

  return "general";
}

// =====================================================
// BUILD KNOWLEDGE CONTEXT
// =====================================================

function buildContext(
  matches: any[]
) {
  if (
    !matches ||
    matches.length === 0
  ) {
    return "";
  }

  return matches
    .slice(
      0,
      MAX_CONTEXT_MATCHES
    )
    .map(
      (
        item,
        index
      ) => {
        const title =
          String(
            item.page_title ||
              item.title ||
              ""
          ).slice(
            0,
            150
          );

        const sourceUrl =
          String(
            item.source_url ||
              item.page_url ||
              item.url ||
              ""
          ).slice(
            0,
            500
          );

        const content =
          String(
            item.content ||
              ""
          )
            .replace(
              /\s+/g,
              " "
            )
            .trim()
            .slice(
              0,
              1000
            );

        return `
RESULT ${index + 1}

TITLE:
${title}

URL:
${sourceUrl}

CONTENT:
${content}
`;
      }
    )
    .join("\n");
}

// =====================================================
// BUILD CONVERSATION HISTORY
// =====================================================

function buildConversationHistory(
  messages: any[]
) {
  if (
    !messages ||
    messages.length === 0
  ) {
    return "";
  }

  return messages
    .slice(
      -MAX_HISTORY_MESSAGES
    )
    .map((item) => {
      const sender =
        item.sender ===
        "customer"
          ? "Customer"
          : "AI";

      const content =
        String(
          item.content || ""
        )
          .replace(
            /\s+/g,
            " "
          )
          .trim()
          .slice(
            0,
            500
          );

      return `${sender}: ${content}`;
    })
    .join("\n");
}

// =====================================================
// GET CONVERSATION HISTORY
// =====================================================

async function getConversationHistory(
  conversationId: string
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "conversation_messages"
    )
    .select(
      "sender, content, created_at"
    )
    .eq(
      "conversation_id",
      conversationId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(
      MAX_HISTORY_MESSAGES
    );

  if (error) {
    console.error(
      "CONVERSATION HISTORY ERROR:",
      error
    );

    return [];
  }

  if (!data) {
    return [];
  }

  return data.reverse();
}

// =====================================================
// EXTRACT ORDER NUMBER
// =====================================================

function extractOrderNumber(
  message: string
) {
  const text =
    message
      .trim()
      .replace(
        /\s+/g,
        " "
      );

  const hashMatch =
    text.match(
      /#\s*(\d{1,12})\b/
    );

  if (hashMatch) {
    return hashMatch[1];
  }

  const orderMatch =
    text.match(
      /\border\s*(?:number|no\.?|#)?\s*(\d{1,12})\b/i
    );

  if (orderMatch) {
    return orderMatch[1];
  }

  const orderIsMatch =
    text.match(
      /\border\s*(?:number|no\.?)?\s*(?:is|was|=|:)\s*#?\s*(\d{1,12})\b/i
    );

  if (orderIsMatch) {
    return orderIsMatch[1];
  }

  const itsNumberMatch =
    text.match(
      /\b(?:its|it's)\s+(?:order\s+)?number\s+(?:is\s+)?#?\s*(\d{1,12})\b/i
    );

  if (itsNumberMatch) {
    return itsNumberMatch[1];
  }

  const numberMatch =
    text.match(
      /\bnumber\s*(?:is|=|:)?\s*#?\s*(\d{1,12})\b/i
    );

  if (numberMatch) {
    return numberMatch[1];
  }

  const standaloneNumber =
    text.match(
      /^#?\s*(\d{1,12})\s*[.!]?$/
    );

  if (standaloneNumber) {
    return standaloneNumber[1];
  }

  return null;
}

// =====================================================
// CHECK IF AI REQUESTED ORDER NUMBER
// =====================================================

function aiRequestedOrderNumber(
  messages: any[]
) {
  if (
    !messages ||
    messages.length === 0
  ) {
    return false;
  }

  const reversed =
    [...messages].reverse();

  const latestAI =
    reversed.find(
      (item) =>
        item.sender === "ai"
    );

  if (!latestAI) {
    return false;
  }

  const content =
    String(
      latestAI.content || ""
    ).toLowerCase();

  const requestPhrases = [
    "order number",
    "order no",
    "order #",
    "provide your order",
    "provide the order",
    "give me your order",
    "give me the order",
    "enter your order",
    "enter the order",
    "confirm your order",
    "confirm the order",
    "please provide your",
    "please enter your",
    "please provide the",
  ];

  return requestPhrases.some(
    (phrase) =>
      content.includes(
        phrase
      )
  );
}

// =====================================================
// DETECT CONTEXTUAL ORDER ACTION
// =====================================================

function detectContextualOrderAction(
  message: string,
  history: any[]
): ActionRequest | null {
  const orderNumber =
    extractOrderNumber(
      message
    );

  if (!orderNumber) {
    return null;
  }

  const directAction =
    detectAction(
      message
    );

  if (
    directAction &&
    (
      directAction.action ===
        "get_order_status" ||
      directAction.action ===
        "get_order_details"
    )
  ) {
    return directAction;
  }

  if (
    aiRequestedOrderNumber(
      history
    )
  ) {
    const actionRequest:
      ActionRequest = {
      action:
        "get_order_status",

      parameters: {
        orderNumber,
      },
    };

    return actionRequest;
  }

  return null;
}

// =====================================================
// PRODUCT URL PLACEHOLDER
// =====================================================

function addProductUrl(
  response: string,
  matches: any[],
  userMessage: string
) {
  if (
    !response ||
    !matches ||
    matches.length === 0
  ) {
    return response;
  }

  if (
    !response.match(
      /\[Product URL\]/i
    )
  ) {
    return response;
  }

  const question =
    userMessage.toLowerCase();

  let selected =
    matches.find(
      (item: any) => {
        const title =
          String(
            item.page_title ||
              item.title ||
              ""
          ).toLowerCase();

        return (
          title &&
          question.includes(
            title
          )
        );
      }
    );

  if (!selected) {
    selected =
      matches.find(
        (item: any) =>
          item.source_url ||
          item.page_url ||
          item.url
      );
  }

  if (!selected) {
    return response;
  }

  const productUrl =
    selected.source_url ||
    selected.page_url ||
    selected.url ||
    "";

  if (!productUrl) {
    return response;
  }

  return response.replace(
    /\[Product URL\]/gi,
    productUrl
  );
}

// =====================================================
// IMAGE VALIDATION
// =====================================================

function validateImageData(
  imageData: unknown
) {
  if (
    !imageData ||
    typeof imageData !==
      "string"
  ) {
    return {
      valid: false,
      error:
        "Invalid image data.",
    };
  }

  if (
    imageData.length >
    MAX_IMAGE_DATA_LENGTH
  ) {
    return {
      valid: false,
      error:
        "Image is too large. Please upload a smaller image.",
    };
  }

  const validDataUrl =
    /^data:image\/(jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/=\s]+$/i;

  if (
    !validDataUrl.test(
      imageData
    )
  ) {
    return {
      valid: false,
      error:
        "Unsupported image format. Please upload JPG, PNG, or WEBP.",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

// =====================================================
// ANALYZE IMAGE WITH OPENAI
// =====================================================

async function analyzeProductImage(
  imageData: string,
  customerMessage: string
) {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, IMAGE_TIMEOUT);

  try {
    console.log(
      "================================="
    );

    console.log(
      "OPENAI IMAGE ANALYSIS START"
    );

    console.log(
      "MODEL:",
      OPENAI_VISION_MODEL
    );

    console.log(
      "IMAGE DATA LENGTH:",
      imageData.length
    );

    console.log(
      "CUSTOMER QUESTION:",
      customerMessage
    );

    console.log(
      "================================="
    );

    const response =
      await fetch(
        OPENAI_API_URL,
        {
          method: "POST",

          signal:
            controller.signal,

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model:
              OPENAI_VISION_MODEL,

            store: false,

            reasoning: {
              effort: "low",
            },

            input: [
              {
                role: "user",

                content: [
                  {
                    type:
                      "input_text",

                    text: `
You are a product identification assistant for an ecommerce store.

Analyze the uploaded product image carefully.

The customer says:

"${customerMessage || "Please identify this product."}"

Your job is to identify useful visual information that can be matched against the store's product knowledge.

Look for:
- Product type
- Brand if visible
- Product name if visible
- Text printed on the product
- Logo
- Color
- Pattern
- Material if visually obvious
- Distinctive design features
- Model or SKU if visible
- Packaging information if visible

Do NOT invent a product name.

If the exact product cannot be identified, describe the visible characteristics accurately.

Return a concise plain-text description suitable for searching an ecommerce product catalog.
                    `.trim(),
                  },

                  {
                    type:
                      "input_image",

                    image_url:
                      imageData,

                    detail:
                      "high",
                  },
                ],
              },
            ],

            max_output_tokens: 400,
          }),
        }
      );

    const responseText =
      await response.text();

    if (!response.ok) {
      console.error(
        "OPENAI IMAGE STATUS:",
        response.status
      );

      console.error(
        "OPENAI IMAGE ERROR:",
        responseText
      );

      let errorMessage =
        `OpenAI image analysis failed (${response.status}).`;

      try {
        const errorData =
          JSON.parse(
            responseText
          );

        errorMessage =
          errorData?.error
            ?.message ||
          errorMessage;
      } catch {
        // Ignore invalid JSON.
      }

      throw new Error(
        errorMessage
      );
    }

    let data: any;

    try {
      data =
        JSON.parse(
          responseText
        );
    } catch {
      throw new Error(
        "OpenAI returned invalid image analysis JSON."
      );
    }

    let result = "";

    if (
      typeof data?.output_text ===
      "string"
    ) {
      result =
        data.output_text.trim();
    }

    if (
      !result &&
      Array.isArray(
        data?.output
      )
    ) {
      const textParts: string[] =
        [];

      for (
        const outputItem of
          data.output
      ) {
        if (
          !Array.isArray(
            outputItem?.content
          )
        ) {
          continue;
        }

        for (
          const contentItem of
            outputItem.content
        ) {
          if (
            contentItem?.type ===
              "output_text" &&
            typeof contentItem?.text ===
              "string"
          ) {
            textParts.push(
              contentItem.text
            );
          }
        }
      }

      result =
        textParts
          .join("\n")
          .trim();
    }

    console.log(
      "IMAGE ANALYSIS RESULT:",
      result
    );

    console.log(
      "================================="
    );

    if (!result) {
      throw new Error(
        "OpenAI could not analyze the uploaded image."
      );
    }

    return result;
  } catch (error: any) {
    console.error(
      "OPENAI IMAGE ANALYSIS ERROR:",
      error
    );

    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "Image analysis timed out."
      );
    }

    throw error;
  } finally {
    clearTimeout(
      timeout
    );
  }
}

// =====================================================
// IMAGE SEARCH QUERY
// =====================================================


// =====================================================
// IMAGE INTENT
// =====================================================
// Determines whether an uploaded image is a product
// identity/price request or a support/problem report.
// Product links are only surfaced for product-intent images.
// =====================================================

type ImageIntent = "product" | "problem" | "information" | "other";

function detectImageIntent(
  customerMessage: string,
  imageDescription: string
): ImageIntent {
  const message =
    String(customerMessage || "")
      .toLowerCase()
      .replace(/[!?.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const description =
    String(imageDescription || "").toLowerCase();

  if (!message && !description) {
    return "other";
  }

  // Explicit product / shopping intent.
  const productPhrases = [
    "price", "cost", "how much", "buy", "order",
    "is this available", "in stock", "find it",
    "what is this", "identify", "product", "item",
    "show me", "recommend", "match", "similar",
    "do you have", "do you sell", "have this", "sell this",
    "looking for", "want this", "need this",
    "available", "dress", "shirt", "shoes", "shoe",
    "outfit", "suit", "pants", "bag", "jacket",
    "fabric", "lawn", "chiffon", "silk", "cotton",
  ];

  if (
    productPhrases.some(
      (phrase) => message.includes(phrase)
    )
  ) {
    return "product";
  }

  // Explicit problem / support intent.
  const problemPhrases = [
    "broken", "damaged", "cracked", "error", "issue",
    "problem", "wrong", "not working", "defect",
    "refund", "return", "replace", "repair",
    "missing", "delivery", "shipping", "charged",
    "payment", "didn't", "did not", "help me",
    "screenshot", "what happened", "why is",
    "doesn't work", "doesnt work", "failed",
  ];

  if (
    problemPhrases.some(
      (phrase) => message.includes(phrase)
    )
  ) {
    return "problem";
  }

  // Image clearly shows damage / error / interface.
  const problemVisual = [
    "damage", "damaged", "broken", "cracked", "error",
    "warning", "failed", "fault", "defect", "corrupt",
    "loading", "screenshot", "order screen", "payment",
    "refund", "review", "message", "alert", "declined",
  ];

  if (
    problemVisual.some(
      (word) => description.includes(word)
    )
  ) {
    return "problem";
  }

  // A detailed visual description with product characteristics
  if (
    description.includes("product type:") ||
    description.includes("distinctive design features") ||
    description.includes("search keywords to use") ||
    /\b(?:dress|shirt|suit|outfit|lawn|shoes?|bag|handbag|jacket|kurta|maxi|hoodie|apparel)\b/i.test(description) ||
    description.length >= 30
  ) {
    return "product";
  }

  return "product";
}

// =====================================================
// IMAGE SEARCH QUERY
// =====================================================
function buildImageSearchQuery(
  imageDescription: string,
  customerMessage: string
) {
  const combined =
    `${imageDescription} ${customerMessage || ""}`
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  return combined.slice(
    0,
    1000
  );
}
// =====================================================
// IMAGE PRODUCT MATCH TYPE
// =====================================================
// Determines whether an uploaded product image can be treated as an
// EXACT verified match of a catalog product, versus only a SIMILAR
// alternative or NO match at all. We never rely on visual/textual
// similarity alone to claim identity.
//
// - "exact": the vision description contains a concrete identifier
//   (a SKU / model code / full product title) that uniquely matches a
//   single verified product. High confidence.
// - "similar": products share general characteristics (garment type,
//   category, color) but there is no verified unique identifier match.
// - "no_match": nothing reasonably close exists in the catalog.

// Extract the base product code from a catalog row. Some sources (raw crawled
// pages) store the SKU only inside the scraped content (e.g. "SKU:
// FSP1266-YELLOW-2000000221311"). We surface a normalized base SKU so the
// exact-match fast path works against the full catalog, not just the
// text-search subset that already carries a sku field.
function extractSkuFromContent(product: any): string {
  const direct = String(
    product?.sku || product?.variant_sku || product?.product_code || ""
  ).trim();
  if (direct) return direct;

  const raw = String(
    product?.content || product?.description || product?.body_html || product?.html || ""
  );
  if (!raw) return "";

  const patterns = [
    /\bSKU\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9._-]{2,})/i,
    /\b(?:MODEL|STYLE|PRODUCT)\s*(?:NO|CODE|NUMBER|#)?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9._-]{2,})/i,
    /\b([A-Z]{1,4}\d{2,}[A-Za-z0-9._-]*[A-Z0-9]?)\b/i,
  ];
  for (const pattern of patterns) {
    const m = raw.match(pattern);
    const code = m && m[1] ? String(m[1]).trim() : "";
    if (
      code &&
      code.length >= 4 &&
      /[A-Za-z]/.test(code) &&
      /\d/.test(code)
    ) {
      // Strip a trailing long numeric inventory suffix (e.g.
      // FSP1266-YELLOW-2000000221311 -> FSP1266-YELLOW).
      const stripped = code.replace(/-\d{6,}$/, "");
      return stripped || code;
    }
  }
  return "";
}

async function determineImageMatchType(
  imageDescription: string,
  products: any[],
  options?: {
    imageDataUrl?: string;
    imageName?: string | null;
    visualIndexRows?: any[];
  }
): Promise<{
  matchType: "exact" | "high_confidence" | "similar" | "no_match";
  exactProduct: any | null;
  /** Best-scored candidate product (used to surface the closest honest option). */
  product: any | null;
  confidence: number;
  signals: {
    skuMatch: boolean;
    textMatch: number;
    visualSimilarity: number;
    metadataSimilarity: number;
    filenameMatch?: boolean;
  };
}> {
  const descText = normalizeContextText(imageDescription);
  const list = Array.isArray(products) ? products : [];

  if (list.length === 0) {
    return {
      matchType: "no_match",
      exactProduct: null,
      product: null,
      confidence: 0,
      signals: { skuMatch: false, textMatch: 0, visualSimilarity: 0, metadataSimilarity: 0 },
    };
  }

  // =================================================
  // 0. FILENAME / SLUG MATCH (Downloaded Store Image)
  //    A customer who downloads an image directly from the
  //    merchant store will upload a file named after the
  //    product handle/slug or SKU. This is a 100% exact match.
  // =================================================
  const rawImageName = options?.imageName;
  if (rawImageName && typeof rawImageName === "string") {
    const cleanFileName = rawImageName
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]?(?:1024x1024|large|medium|small|thumb|preview|banner|crop|square)/gi, "")
      .replace(/[_\s]+/g, "-")
      .trim();

    if (cleanFileName.length >= 4) {
      for (const product of list) {
        const rawUrl = String(
          product?.productUrl || product?.page_url || product?.url || ""
        ).toLowerCase();
        let slug = "";
        try {
          const pathname = new URL(rawUrl, "https://example.com").pathname;
          slug = pathname.split("/").filter(Boolean).pop() || "";
        } catch {
          slug = rawUrl.split("/").filter(Boolean).pop() || "";
        }
        slug = slug.replace(/\.[a-z0-9]+$/i, "").trim();

        const sku = normalizeContextText(extractSkuFromContent(product));

        const isExactSlug =
          slug.length >= 5 &&
          (cleanFileName === slug ||
            cleanFileName.includes(slug) ||
            slug.includes(cleanFileName));

        const isExactSku =
          sku.length >= 4 &&
          (cleanFileName === sku ||
            cleanFileName.includes(sku) ||
            cleanFileName.replace(/[^a-z0-9]/g, "") === sku.replace(/[^a-z0-9]/g, ""));

        if (isExactSlug || isExactSku) {
          console.log(
            `EXACT IMAGE MATCH VIA FILENAME/SLUG: "${rawImageName}" matched product "${product?.displayName || product?.name || product?.title}" (slug: ${slug}, sku: ${sku})`
          );
          return {
            matchType: "exact",
            exactProduct: product,
            product: product,
            confidence: 1.0,
            signals: {
              skuMatch: Boolean(isExactSku),
              textMatch: 1,
              visualSimilarity: 1,
              metadataSimilarity: 1,
              filenameMatch: true,
            },
          };
        }
      }
    }
  }

  // =================================================
  // 1. STRONG IDENTITY SIGNALS (SKU / model / title)
  //    This is the existing, hard-verified fast path.
  //    It is NEVER weakened by the new visual layer.
  // =================================================
  const skuMatches: any[] = [];
  for (const product of list) {
    const sku = normalizeContextText(
      extractSkuFromContent(product)
    );
    if (sku && sku.length >= 3) {
      const descHasSku = descText.includes(sku);
      const trimmedSku = sku.replace(/-[a-z0-9]+$/i, "");
      const baseCodeMatch =
        descHasSku ||
        (
          trimmedSku !== sku &&
          trimmedSku.length >= 4 &&
          /\d/.test(trimmedSku) &&
          /[a-z]/.test(trimmedSku) &&
          descText.includes(trimmedSku)
        );
      if (baseCodeMatch) {
        skuMatches.push(product);
      }
    }
  }
  if (skuMatches.length === 1) {
    return {
      matchType: "exact",
      exactProduct: skuMatches[0],
      product: skuMatches[0],
      confidence: 1.0,
      signals: { skuMatch: true, textMatch: 1, visualSimilarity: 1, metadataSimilarity: 1 },
    };
  }

  // --- Full product title appears verbatim in the image description ---
  const titleMatches: any[] = [];
  for (const product of list) {
    const title = normalizeContextText(
      product?.displayName || product?.name || product?.title || product?.product_title
    );
    if (title && title.length >= 8 && descText.includes(title)) {
      titleMatches.push(product);
    }
  }
  if (titleMatches.length === 1) {
    return {
      matchType: "exact",
      exactProduct: titleMatches[0],
      product: titleMatches[0],
      confidence: 0.98,
      signals: { skuMatch: false, textMatch: 1, visualSimilarity: 1, metadataSimilarity: 1 },
    };
  }

  // =================================================
  // 2. MULTIMODAL VISUAL + TEXTUAL SCORING
  //    When no concrete identifier is readable, use layered
  //    feature similarity to decide exact / high_confidence / similar.
  // =================================================
  const { matchCustomerImageToProducts } = await import("@/lib/products/multimodalMatch");
  const features = extractVisionFeatures(imageDescription);

  // Multi-stage candidate retrieval + evidence-based decision.
  let scored;
  try {
    const candidates = await retrieveVisualCandidates({
      customerFeatures: features,
      customerImageDataUrl: options?.imageDataUrl || undefined,
      catalogProducts: list,
      visualIndexRows: options?.visualIndexRows || [],
    });
    const topProducts = (candidates || []).map((c: any) => c.product).slice(0, 10);
    scored = matchCustomerImageToProducts(
      features,
      topProducts.length > 0 ? topProducts : list
    );
  } catch (retrievalError) {
    console.error("IMAGE CANDIDATE RETRIEVAL ERROR:", retrievalError);
    scored = matchCustomerImageToProducts(features, list);
  }

  if (scored.matchType === "exact" && scored.product) {
    return {
      matchType: "exact",
      exactProduct: scored.product,
      product: scored.product,
      confidence: scored.confidence,
      signals: scored.signals,
    };
  }
  if (scored.matchType === "high_confidence" && scored.product) {
    return {
      matchType: "high_confidence",
      exactProduct: scored.product,
      product: scored.product,
      confidence: scored.confidence,
      signals: scored.signals,
    };
  }
  if (scored.matchType === "similar" && scored.product) {
    return {
      matchType: "similar",
      exactProduct: null,
      product: scored.product,
      confidence: scored.confidence,
      signals: scored.signals,
    };
  }

  // 3. Conservative default
  return {
    matchType: "no_match",
    exactProduct: null,
    product: null,
    confidence: scored.confidence,
    signals: scored.signals,
  };
}
// =====================================================
// PRODUCT CONVERSATION CONTEXT
// =====================================================

function normalizeContextText(
  value: unknown
) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// CHECK OBJECTION OR ALTERNATIVE REQUEST
// =====================================================

function isObjectionOrAlternativeRequest(message: string): boolean {
  const text = normalizeContextText(message);
  if (!text) return false;
  return (
    /\b(?:don'?t\s+like|dislike|not\s+(?:for\s+me|my\s+style|what\s+i|liking)|show\s+(?:me\s+)?(?:something\s+else|another|different)|something\s+else|different\s+(?:one|color|style|option)|other\s+options?|alternatives?)\b/i.test(
      text
    ) ||
    [
      "don't like",
      "dont like",
      "dislike",
      "not for me",
      "something else",
      "different option",
      "another one",
      "other options",
      "alternatives",
    ].some((w) => text.includes(w))
  );
}

// =====================================================
// FOLLOW-UP QUESTION DETECTION
// =====================================================

function isProductFollowUp(
  message: string
) {
  const text =
    normalizeContextText(message);

  if (!text) {
    return false;
  }

  // These normally refer to something
  // already discussed.
  const referenceWords = [
    "their",
    "them",
    "those",
    "these",
    "that",
    "this",
    "it",
    "its",
    "one",
    "ones",
    "the",
  ];

  const followUpWords = [
    "price",
    "prices",
    "cost",
    "costs",
    "how much",
    "discount",
    "discounts",
    "offer",
    "offers",
    "deal",
    "deals",
    "sale",
    "available",
    "availability",
    "stock",
    "size",
    "sizes",
    "color",
    "colours",
    "colors",
    "cheaper",
    "cheapest",
    "least expensive",
    "most affordable",
    "expensive",
    "buy",
    "link",
    "url",
    "link for",
    "where can i",
    "take me to",
    "open this",
    "visit",
    "order",
    "material",
    "materials",
    "fabric",
    "fabrics",
    "cloth",
    "quality",
    "texture",
    "made of",
    "details",
    "don't like",
    "dont like",
    "dislike",
    "not for me",
    "something else",
    "different",
    "another",
    "other options",
    "alternatives",
  ];

  if (isObjectionOrAlternativeRequest(text)) {
    return true;
  }

  // Explicit fabric/material questions about the active item
  if (
    /\b(?:tell\s+me\s+about\s+(?:the\s+)?(?:fabric|material|details)|what\s+(?:is\s+it\s+)?made\s+of|fabric\s+details)\b/i.test(
      text
    )
  ) {
    return true;
  }

  const hasReference =
    referenceWords.some(
      (word) =>
        text.includes(word)
    );

  const hasFollowUpIntent =
    followUpWords.some(
      (word) =>
        text.includes(word)
    );

  return (
    hasReference &&
    hasFollowUpIntent
  );
}

// =====================================================
// EXPLICIT PRODUCT LINK REQUEST
// =====================================================
// A customer asking for a direct link/buy URL is an explicit link request.
// The backend must deliver the verified product through structured product
// cards/buttons rather than refusing or inventing a URL.

function isExplicitProductLinkRequest(
  message: string
) {
  const text =
    normalizeContextText(message);

  if (!text) {
    return false;
  }

  const linkPhrases = [
    "link",
    "url",
    "website link",
    "store link",
    "where can i buy",
    "where can i get",
    "where can i purchase",
    "where do i buy",
    "how do i buy",
    "open this",
    "take me to",
    "open the product",
    "view the product",
    "send me the link",
    "give me the link",
    "link for",
    "product link",
  ];

  return linkPhrases.some(
    (phrase) => text.includes(phrase)
  );
}

// =====================================================
// SELECT REFERENCED PRODUCT
// =====================================================
// Resolves conversational references ("the first one", "the second one",
// "the cheapest one", "this one", "that one", "it") to the exact product
// from the current card list. Returns a single product card or null.

function selectReferencedProduct(
  products: any[],
  message: string
): any | null {
  if (!Array.isArray(products) || products.length === 0) {
    return null;
  }

  const text =
    normalizeContextText(message);

  // The cheapest / cheaper one.
  if (
    /(cheapest|cheaper|least expensive|most affordable)/i.test(text)
  ) {
    const priced = products
      .map((product: any, index: number) => ({
        product,
        price: parseFloat(
          String(
            product?.displayPrice ||
              product?.price ||
              product?.salePrice ||
              ""
          ).replace(/[^0-9.]/g, "")
        ),
      }))
      .filter((entry: any) => Number.isFinite(entry.price));

    if (priced.length > 0) {
      priced.sort((a: any, b: any) => a.price - b.price);
      return priced[0].product;
    }
  }

  // Ordinal references: first/second/third/last.
  const ordinalMatch = /(?:^|\s)(first|second|third|fourth|fifth|last)\s+one?/i.exec(text);
  if (ordinalMatch) {
    const ordinals = ["first", "second", "third", "fourth", "fifth"];
    const rawOrdinal = ordinalMatch[1].toLowerCase();
    if (rawOrdinal === "last") {
      return products[products.length - 1] || null;
    }
    const rank = ordinals.indexOf(rawOrdinal);
    if (rank >= 0 && products[rank]) {
      return products[rank];
    }
  }

  // Generic references: this one / that one / it / the one.
  const genericRef =
    /this one|that one|the one|this product|that product|\bit\b|which one|the one you showed|the product you showed/i.test(text);

  if (genericRef) {
    return products[0];
  }

  // If nothing specific is referenced, keep all products so the UI can
  // still render the verified cards.
  return null;
}

// =====================================================
// EXPLICIT NEW PRODUCT REQUEST
// =====================================================
//
// If the customer gives a new product attribute,
// this MUST become a new search.
//
// Example:
//
// "Do you have white dresses?"
// "Show me lawn products"
// "Do you have red suits?"
//
// These should NOT inherit "black dresses".
// =====================================================

function hasNewProductSpecification(
  message: string
) {
  const text =
    normalizeContextText(message);

  const colors = [
    "black",
    "white",
    "red",
    "blue",
    "green",
    "pink",
    "yellow",
    "purple",
    "orange",
    "brown",
    "beige",
    "cream",
    "maroon",
    "navy",
    "grey",
    "gray",
  ];

  const productTypes = [
    "dress",
    "dresses",
    "shirt",
    "shirts",
    "suit",
    "suits",
    "lawn",
    "chiffon",
    "cambric",
    "shalwar",
    "kameez",
    "trouser",
    "trousers",
    "dupatta",
    "outfit",
    "outfits",
    "2 pcs",
    "3 pcs",
  ];

  const collectionWords = [
    "collection",
    "category",
    "embroidered",
    "printed",
    "pret",
    "unstitched",
    "stitched",
    "formal",
    "casual",
  ];

  return (
    colors.some(
      (word) =>
        text.includes(word)
    ) ||
    productTypes.some(
      (word) =>
        text.includes(word)
    ) ||
    collectionWords.some(
      (word) =>
        text.includes(word)
    )
  );
}

// =====================================================
// GET PREVIOUS PRODUCT MESSAGE
// =====================================================

function getPreviousProductMessage(
  history: any[],
  currentMessage: string
) {
  if (
    !Array.isArray(history) ||
    history.length === 0
  ) {
    return "";
  }

  const current =
    normalizeContextText(
      currentMessage
    );

  // Search backwards.
  // We want the most recent customer
  // message that was about products.
  for (
    let i =
      history.length - 1;
    i >= 0;
    i--
  ) {
    const item =
      history[i];

    const content =
      String(
        item?.content ||
          item?.message ||
          ""
      ).trim();

    if (!content) {
      continue;
    }

    if (
      normalizeContextText(
        content
      ) === current
    ) {
      continue;
    }

    const productSpecification =
      hasNewProductSpecification(
        content
      );

    if (
      productSpecification
    ) {
      return content;
    }
  }

  return "";
}

// =====================================================
// CLEAN PRODUCT SEARCH QUERY
// =====================================================
// Convert natural-language customer requests into a compact
// catalog search query. Keep the original message separately
// so the AI can answer naturally.
function cleanProductSearchQuery(message: string) {
  let text = String(message || '')
    .toLowerCase()
    .replace(/[!?.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const phrases = [
    'can you please',
    'could you please',
    'would you please',
    'do you have',
    'do u have',
    'can you show me',
    'could you show me',
    'show me',
    'please show me',
    'please find',
    'find me',
    'i am looking for',
    "i'm looking for",
    'im looking for',
    'i am looking to buy',
    "i'm looking to buy",
    'i want',
    'i need',
    'can i get',
    'could i get',
    'give me',
    'tell me about',
    'what do you have',
    'what products do you have',
    'what products do you sell',
    'what products are available',
    'what do you sell',
    'what do you have',
    'what can i buy',
    'what can i purchase',
    'show your products',
    'show me your products',
    'show me products',
    'all products',
  ];

  for (const phrase of phrases) {
    text = text.replace(new RegExp('\\b' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), ' ');
  }

  // Follow-up words are intentionally removed from the catalog query.
  // The previous product request is already supplied by resolveProductQuery.
  text = text
    .replace(/\b(how much|what is the price|what's the price|price|prices|cost|costs|discount|discounts|offer|offers|deal|deals|are they|is it|is that|available|availability|in stock|can i buy)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text || String(message || '').trim();
}

// =====================================================
// RESOLVE PRODUCT QUERY
// =====================================================

// =====================================================
// RESOLVE PRODUCT QUERY
// =====================================================

function resolveProductQuery(
  message: string,
  history: any[]
) {
  const current =
    String(message || "").trim();

  if (!current) {
    return "";
  }

  // ---------------------------------------------------
  // A NEW PRODUCT SPECIFICATION ALWAYS STARTS
  // A NEW SEARCH
  //
  // Example:
  // "Do you have black dresses?"
  // followed by:
  // "Do you have white dresses?"
  //
  // The second question must search for WHITE,
  // not inherit BLACK.
  // ---------------------------------------------------

  if (
    hasNewProductSpecification(
      current
    )
  ) {
    return cleanProductSearchQuery(current);
  }

  // ---------------------------------------------------
  // ONLY INHERIT CONTEXT FOR A REAL FOLLOW-UP
  //
  // Example:
  // "Do you have black dresses?"
  // "How much are they?"
  //
  // Search should use:
  // "Do you have black dresses?"
  // ---------------------------------------------------

  const isContextualFollowUp =
    isProductFollowUp(
      current
    ) ||
    isPriceFollowUp(
      current
    ) ||
    isAvailabilityFollowUp(
      current
    );

  if (
    isContextualFollowUp
  ) {
    const previous =
      getPreviousProductMessage(
        history,
        current
      );

    if (previous) {
      console.log(
        "PRODUCT FOLLOW-UP CONTEXT:"
      );

      console.log(
        "CURRENT:",
        current
      );

      console.log(
        "PREVIOUS:",
        previous
      );

      return cleanProductSearchQuery(previous);
    }
  }

  // ---------------------------------------------------
  // No previous product context.
  // Treat this as a new request.
  // ---------------------------------------------------

  return cleanProductSearchQuery(current);
}
// =====================================================
// SAFE PRODUCT SEARCH FALLBACK
// =====================================================
// The product catalog must remain usable even when optional
// columns such as image_url, price, color, etc. are not present
// in an older knowledge_pages schema. This query intentionally
// uses only the core columns that the crawler already creates.
//
// Rich product fields are preserved when they exist in the
// returned content/metadata, but the chat endpoint never fails
// just because an optional database column is missing.
// =====================================================
async function safeProductSearch(
  profileId: string,
  query: string
) {
  const { data, error } = await supabaseAdmin
    .from("knowledge_pages")
    .select("id, user_id, title, page_url, content, page_type")
    .eq("user_id", profileId)
    .limit(1000);

  if (error) {
    console.error("SAFE PRODUCT SEARCH ERROR:", error);
    throw error;
  }

  const pages = Array.isArray(data) ? data : [];
  const productLikePages = pages.filter((page: any) => {
    const title = String(page?.title || "").toLowerCase();
    const url = String(page?.page_url || "").toLowerCase();
    const content = String(page?.content || "").toLowerCase();
    const pageType = String(page?.page_type || "").toLowerCase();
    return (
      pageType === "product" ||
      /\/products?\//i.test(url) ||
      /shopify|add to cart|buy it now|regular price|sale price|sku/i.test(content) ||
      /\b(dress|dresses|shirt|shirts|hoodie|hoodies|shoe|shoes|jacket|jackets|pants|jeans|bag|bags|cap|caps|suit|suits|lawn|chiffon|cambric|shalwar|kameez|dupatta|outfit|outfits)\b/i.test(`${title} ${content}`)
    );
  });

  const searchable = productLikePages.length > 0 ? productLikePages : pages;
  const normalizedQuery = /^(what do you sell|what do you have|what can i buy|show your products|show me your products|browse|shop|catalog|catalogue)$/i.test(String(query || "").trim()) ? "products" : String(query || "").trim();

  const ranked = searchAndRankProducts(searchable, normalizedQuery, 10, { minScore: 0 });
  if (ranked.length > 0) return ranked;

  const terms = normalizedQuery.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 3 && !["what","which","have","does","your","you"].includes(term));
  return searchable
    .map((page: any) => {
      const title = String(page?.title || "").toLowerCase();
      const content = String(page?.content || "").toLowerCase();
      const url = String(page?.page_url || "").toLowerCase();
      const haystack = `${title} ${content} ${url}`;
      const score = terms.reduce((total, term) => haystack.includes(term) ? total + 5 + (title.includes(term) ? 12 : 0) + (url.includes(term) ? 6 : 0) : total, 0);
      return { page, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.page);
}

// =====================================================
// IMAGE MATCH FULL CATALOG
// =====================================================
// Builds the merchant-scoped candidate pool for product-image matching.
// Merges crawled knowledge_pages (the real product catalog) with Shopify
// products and the pre-built visual index so visual candidate retrieval has
// real image URLs + metadata. Sales Pilot core matches on catalog features
// (title/content) and, when a visual-embedding provider is configured, on
// stored vector embeddings. All queries are strictly scoped to the profile.
// =====================================================
async function loadImageMatchCatalog(profileId: string) {
  const catalog: any[] = [];

  // 1. Crawled product pages (the primary catalog source).
  const { data: pages, error: pagesError } = await supabaseAdmin
    .from("knowledge_pages")
    .select("id, user_id, title, page_url, content, page_type")
    .eq("user_id", profileId)
    .limit(1000);
  if (!pagesError && Array.isArray(pages) && pages.length > 0) {
    catalog.push(...pages);
  }

  // 2. Shopify products owned by this merchant (images + variants live in `data`).
  const { data: stores, error: storesError } = await supabaseAdmin
    .from("shopify_stores")
    .select("id")
    .eq("user_id", profileId)
    .limit(20);
  if (!storesError && Array.isArray(stores) && stores.length > 0) {
    const storeIds = stores.map((s: any) => s.id);
    const { data: shopifyRows, error: shopifyError } = await supabaseAdmin
      .from("shopify_products")
      .select("id, store_id, shopify_id, handle, title, description, data")
      .in("store_id", storeIds)
      .limit(500);
    if (!shopifyError && Array.isArray(shopifyRows)) {
      catalog.push(
        ...shopifyRows.map((s: any) => ({
          ...s,
          productUrl: s.handle
            ? `https://${String(s.handle).split("/")[0] || ""}/products/${s.handle}`
            : "",
          variant_sku: undefined,
          content: String(s.description || ""),
          images: Array.isArray(s?.data?.images) ? s.data.images : [],
        }))
      );
    }
  }

  return catalog;
}

// =====================================================
// MERCHANT-SCOPED VISUAL INDEX ROWS
// =====================================================
async function loadMerchantVisualIndexRows(profileId: string) {
  const { data, error } = await supabaseAdmin
    .from("product_visual_embeddings")
    .select("id, product_id, product_key, image_url, image_hash, visual_embedding, image_metadata")
    .eq("user_id", profileId)
    .limit(2000);
  if (error) {
    console.error("VISUAL INDEX LOAD ERROR:", error.message);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// =====================================================
// CHATGPT-STYLE RESPONSE RULES
// =====================================================
// This context is used for every AI-generated customer response,
// including responses based on product and Shopify action results.
// =====================================================
function buildProfessionalAIContext() {
  return `
CUSTOMER-FACING RESPONSE RULES:
You are the store's AI sales and customer-support employee.

Your job is to have a natural, helpful conversation with the customer,
similar to a high-quality ChatGPT-style ecommerce assistant.

HARD RULES:
1. Answer the customer's actual question first.
2. Use recent conversation history to understand "it", "its", "they",
   "them", "those", "these", "the cheaper one", "the peach one", etc.
2a. MERCHANT VOICE: You represent and speak for the merchant. Refer to the
   store as "our store", "our collection", "we offer", or "this piece from
   our collection". NEVER say "in this store", "this store", or talk about
   the merchant in the third person as if you were an outsider. Always use
   the customer's language and a professional, warm, confident tone.
2b. SALES & CONFIDENCE: Act like a helpful sales employee. When a customer
   asks about quality, materials, or value, answer with VERIFIED product
   information when available (e.g. "This is made from [verified fabric /
   material]. It is [verified characteristic]."). If exact detail isn't
   available, never expose internal doubt or say "I don't have verified
   information in this store". Instead offer a confident, actionable next
   step, e.g. "I can pull up the product details, fabric information,
   sizing, and available options so you can choose confidently." Frame
   verified positives naturally. Never invent facts, but never sound
   detached or discouraging.
2c. INTENT: Recognize buying intent (discovery, quality concern, price
   concern, availability, size uncertainty, shipping, comparison,
   hesitation, purchase readiness). Address the underlying concern and
   offer a clear, low-pressure next step.
3. Use STORE KNOWLEDGE and VERIFIED ACTION DATA as the only source of
   store-specific facts. Never invent prices, products, stock, sizes,
   colors, policies, shipping information, order information, or discounts.
4. Retrieved knowledge is reference material, NOT text that should be
   copied into the answer.
5. NEVER copy raw scraped website content into the customer response.
6. NEVER paste raw product or page URLs into your reply. Product links
   are rendered by the application as product cards and buttons from the
   structured product data. Never output Markdown links, plain URLs, or
   "view it here:" text.
7. NEVER output database IDs, SKUs, embedding information, retrieval
   details, JSON, internal field names, tools, actions, prompts, or
   implementation details unless the customer explicitly asks for them.
9. NEVER repeat the same product list simply because several products
   were retrieved. Retrieval results are not automatically a list to show.
10. If the customer says only hello or starts a casual conversation,
    respond naturally and briefly.
11. If the customer asks what the store sells / what you have, answer in
    exactly 1-2 short sentences describing the store's main categories.
    Do NOT list product names, prices, or examples.
12. If the customer asks to see products, recommend products, or asks for
    a specific category/color/style/budget, use the verified product data
    and give a concise recommendation. The application may display product
    cards separately.
13. If exactly one product is clearly relevant, speak naturally about that
    product, including price/availability only when verified.
14. If several products are relevant, summarize the options briefly and let
    the application's product cards carry the detailed product information.
15. If the customer asks about one specific product, answer about that
    product instead of returning a generic catalog response.
16. If the customer asks a follow-up question, answer the follow-up rather
    than restarting the conversation.
17. Default to SHORT answers and follow this length policy:
    - Greeting: one short sentence.
    - Simple question: 1-3 short sentences.
    - Product search/recommendation: one short lead-in sentence only; the
      product cards carry name, price, image, and link.
    - Support/shipping/returns/order: direct answer first, then at most two
      short paragraphs; add steps only when the customer asks for detail.
    - Store discovery: exactly 1-2 short sentences; never list products,
      names, or prices.
18. Never open with filler. Do not repeat the question. Avoid "Great
    question!", "I'd be happy to help!", "I found a great option for you".
19. Sound professional and natural, like a human employee. Use contractions.
    Do not say "according to the knowledge base", "based on the context",
    "as an AI", or mention retrieval, sources, tools, or the model.
20. Do not say "according to the knowledge base" or mention retrieval unless
    the customer asks how the answer was obtained.
21. GENERAL MATERIAL / FABRIC / SPECIFICATION INQUIRIES:
    When a customer asks general questions about materials, fabrics, or specifications
    (e.g., "What material do you use in your clothes?", "What fabrics do you offer?"):
    - DO NOT give a defensive disclaimer like "I don't have verified details on the fabrics used across our collection."
    - Explain warmly and confidently that our materials vary depending on the article and design.
    - Proactively guide the customer: invite them to share a specific product or tell you the style/fabric they prefer so you can check available details (such as fabric, embroidery, print, cut, and specifications).
    - Example: "Our materials vary depending on the article and design, and I'd be happy to help you find something that suits what you're looking for. If you share a product or tell me the style you prefer, I can check the available details such as fabric, embroidery, print, and other specifications."
    - Truthfulness: Never invent unverified claims ("finest luxury materials"). Speak positively and guide toward concrete options.
21a. PRODUCT-SPECIFIC SALES INTELLIGENCE:
    When actual product data exists, actively use it to sell intelligently:
    - Weave verified attributes (fabric, cut, embroidery, piece count, fit) into natural, helpful sales language.
    - Example: "This article is a 3-piece unstitched lawn outfit with embroidered detailing. The lawn fabric makes it a great option for customers looking for a lightweight and elegant style."
    - Do not merely dump raw specifications. Transform verified information into helpful, customer-centric descriptions.
21b. OBJECTION HANDLING ("I don't like this" / "Show me something else"):
    When a customer expresses dislike or asks for alternatives:
    - Maintain the context of what product they are reacting to.
    - Acknowledge gracefully and helpfully without being pushy.
    - Inquire about what they prefer (different color, design, fabric, price range, or detailing).
    - Example: "No problem — I can help you find something closer to your style. Would you prefer a different color, design, fabric, price range, or something with more or less embroidery?"
    - Proactively introduce any alternative options displayed.
22. Answer the direct question first, then add helpful detail. Do not lead
    with an introduction or restate the customer's question.
23. Give longer, detailed answers only when the customer explicitly asks.
24. When recommending, briefly say why it fits and refer to product names or
    the numbered list in the supplied data. Never send a URL.
25. If you genuinely cannot answer, say so honestly and offer a useful next
    step instead of guessing.

PRODUCT RESPONSE EXAMPLES:
- Customer: "hi"
  Good: "Hi! How can I help you today?"
- Customer: "hi what do you have"
  Good: "Hi! We offer our latest collection of products. Are you looking for a particular style, category, or price range?"
- Customer: "What material do you use in clothing?"
  Good: "Our materials vary depending on the article and design, and I'd be happy to help you find something that suits what you're looking for. If you share a product or tell me the style you prefer, I can check the available details such as fabric, embroidery, print, and other specifications."
- Customer: "I don't like this"
  Good: "No problem — I can help you find something closer to your style. Would you prefer a different color, design, fabric, price range, or something with more or less embroidery?"

IMPORTANT:
The final response must sound like a human ecommerce employee speaking
directly to the customer. Do not expose the data retrieval process.
`.trim();
}

// =====================================================
// CHAT API
// =====================================================

export async function POST(
  req: Request
) {
  const requestStartedAt =
    Date.now();
console.log("SALES PILOT NEW CHAT ROUTE ACTIVE");
  try {
    console.log(
      "================================="
    );

    console.log(
      "CHAT API START"
    );

    console.log(
      "================================="
    );

    // =================================================
    // REQUEST BODY
    // =================================================

    const body =
      await req.json();

    const {
      message,
      profileId,
      visitorSessionId,
      customerName,
      customerEmail,

      // NEW IMAGE FIELDS
      imageData: rawImageData,
      image,
      imageName,
      imageType,
    } = body;

    const imageData =
      typeof rawImageData === "string"
        ? rawImageData
        : typeof image === "string"
          ? image
          : null;

    console.log(
      "USER MESSAGE:",
      message
    );

    console.log(
      "PROFILE:",
      profileId
    );

    console.log(
      "VISITOR SESSION:",
      visitorSessionId
    );

    console.log(
      "IMAGE NAME:",
      imageName
    );

    console.log(
      "IMAGE TYPE:",
      imageType
    );

    console.log(
      "IMAGE PROVIDED:",
      Boolean(
        imageData
      )
    );

    // =================================================
    // VALIDATION
    // =================================================

    const hasImage =
      Boolean(
        imageData
      );

    if (
      (
        !message ||
        typeof message !==
          "string"
      ) &&
      !hasImage
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Message or image required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !profileId ||
      typeof profileId !==
        "string"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Profile missing",
        },
        {
          status: 400,
        }
      );
    }

    const cleanMessage =
      typeof message ===
        "string"
        ? message.trim()
        : "";

    // =================================================
    // VALIDATE IMAGE
    // =================================================

    if (hasImage) {
      const imageValidation =
        validateImageData(
          imageData
        );

      if (
        !imageValidation.valid
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              imageValidation.error,
          },
          {
            status: 400,
          }
        );
      }
    }

    // =================================================
    // IMAGE ANALYSIS
    // =================================================

    let imageDescription =
      "";

    if (hasImage) {
      const imageStartedAt =
        Date.now();

      try {
        imageDescription =
          await analyzeProductImage(
            imageData,
            cleanMessage
          );
      } catch (imageError) {
        console.error("=================================");
        console.error("IMAGE ANALYSIS ERROR");
        console.error(imageError);
        console.error("=================================");
        imageDescription = "";
      }

      console.log(
        `IMAGE ANALYSIS TIME: ${
          Date.now() -
          imageStartedAt
        }ms`
      );
    }

    // =================================================
    // IMAGE INTENT
    // =================================================

    const imageIntent =
      hasImage
        ? detectImageIntent(
            cleanMessage,
            imageDescription
          )
        : null;

    // =================================================
    // FINAL USER SEARCH MESSAGE
    // =================================================
    // Product-intent images (identify/price/find/similar) build
    // a catalog search query. Problem/support images (damage, error,
    // payment, delivery) are handled as support cases and must never
    // trigger a random product search.

    const effectiveMessage =
      hasImage
        ? imageIntent === "product"
          ? buildImageSearchQuery(
              imageDescription,
              cleanMessage
            )
          : cleanMessage ||
            imageDescription ||
            "Please help with this image."
        : cleanMessage;

    if (
      !effectiveMessage
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Please provide a message or image.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "EFFECTIVE SEARCH MESSAGE:",
      effectiveMessage
    );

    // =================================================
    // FIND EXISTING CONVERSATION
    // =================================================

    let conversation:
      | any
      | null = null;

    if (
      visitorSessionId
    ) {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            "conversations"
          )
          .select(
            "id, profile_id, user_id, visitor_session_id"
          )
          .eq(
            "visitor_session_id",
            visitorSessionId
          )
          .eq(
            "profile_id",
            profileId
          )
          .maybeSingle();

      if (error) {
        console.error(
          "CONVERSATION LOOKUP ERROR:",
          error
        );
      }

      conversation =
        data;
    }

    // =================================================
    // BILLING
    // =================================================

    if (
      !conversation
    ) {
      console.log(
        "NEW CONVERSATION - CHECKING BILLING"
      );

      const billing =
        await checkBillingAccess(
          profileId
        );

      console.log(
        "BILLING RESULT:",
        billing
      );

      if (
        !billing.allowed
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              billing.error,

            code:
              billing.code ||
              "BILLING_ACCESS_DENIED",

            planId:
              "planId" in billing
                ? billing.planId
                : undefined,

            planName:
              "planName" in
              billing
                ? billing.planName
                : undefined,

            used:
              "used" in billing
                ? billing.used
                : undefined,

            limit:
              "limit" in billing
                ? billing.limit
                : undefined,

            remaining:
              "remaining" in
              billing
                ? billing.remaining
                : undefined,
          },
          {
            status: 403,
          }
        );
      }
    } else {
      console.log(
        "EXISTING CONVERSATION - BILLING CHECK PASSED"
      );
    }

    // =================================================
    // CREATE CONVERSATION
    // =================================================

    if (
      !conversation
    ) {
      console.log(
        "CREATING CONVERSATION"
      );

      const session =
        visitorSessionId ||
        crypto.randomUUID();

      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            "conversations"
          )
          .insert({
            profile_id:
              profileId,

            user_id:
              profileId,

            visitor_session_id:
              session,

            customer_name:
              customerName ||
              "Website Visitor",

            customer_email:
              customerEmail ||
              null,

            assigned_to:
              "ai",

            status:
              "open",
          })
          .select(
            "id, profile_id, user_id, visitor_session_id"
          )
          .single();

      if (error) {
        console.error(
          "CONVERSATION CREATE ERROR:",
          error
        );

        throw error;
      }

      conversation =
        data;
    }

    // =================================================
    // SAVE CUSTOMER MESSAGE
    // =================================================

    const customerMessageForDatabase =
      hasImage
        ? cleanMessage
          ? `${cleanMessage}\n[Image uploaded: ${imageName || "product image"}]\n[Image analysis: ${imageDescription}]`
          : `[Image uploaded: ${imageName || "product image"}]\n[Image analysis: ${imageDescription}]`
        : cleanMessage;

    const {
      error:
        customerMessageError,
    } =
      await supabaseAdmin
        .from(
          "conversation_messages"
        )
        .insert({
          conversation_id:
            conversation.id,

          sender:
            "customer",

          content:
            customerMessageForDatabase,
        });

    if (
      customerMessageError
    ) {
      console.error(
        "CUSTOMER MESSAGE ERROR:",
        customerMessageError
      );
    }

    // =================================================
    // LOAD CONVERSATION HISTORY
    // =================================================

    const historyStartedAt =
      Date.now();

    const conversationHistory =
      await getConversationHistory(
        conversation.id
      );
const previousAIMessage =
  [...conversationHistory]
    .reverse()
    .find(
      (item) =>
        item.sender === "ai"
    );

const previousCustomerMessages =
  conversationHistory.filter(
    (item) =>
      item.sender === "customer"
  );
    console.log(
      "CONVERSATION HISTORY:",
      conversationHistory.length
    );

    console.log(
      `HISTORY TIME: ${
        Date.now() -
        historyStartedAt
      }ms`
    );

    const historyContext =
      buildConversationHistory(
        conversationHistory
      );

    const conversationConversationContext =
      createEmptyConversationContext();

    // =================================================
    // WEBSITE CONTEXT (universal adaptation)
    // =================================================
    // Load profile metadata + detected capabilities so the AI
    // adapts to the website type (ecommerce, SaaS, services,
    // real estate, restaurant, etc.) and only uses capabilities
    // that actually exist for this website.
    // =================================================

    let websiteContextData: Awaited<ReturnType<typeof loadWebsiteContext>> | null = null;
    let websiteContextText = "";
    try {
      websiteContextData = await loadWebsiteContext(supabaseAdmin, profileId);
      websiteContextText = buildWebsiteContextForAI(websiteContextData);
      console.log("WEBSITE CONTEXT:");
      console.log(websiteContextText || "(empty)");
    } catch (websiteError) {
      console.error("WEBSITE CONTEXT LOAD ERROR:", websiteError);
    }


    // =================================================
    // FAST RESPONSE
    // =================================================
    //
    // Do NOT use fast responses for image requests.
    //
    // The image must go through the AI pipeline.
    //
    // =================================================

    const fastResponse =
      !hasImage
        ? getFastResponse(
            cleanMessage
          )
        : null;

    if (
      fastResponse
    ) {
      console.log(
        "FAST RESPONSE:",
        fastResponse
      );

      const {
        error:
          fastMessageError,
      } =
        await supabaseAdmin
          .from(
            "conversation_messages"
          )
          .insert({
            conversation_id:
              conversation.id,

            sender:
              "ai",

            content:
              fastResponse,
          });

      if (
        fastMessageError
      ) {
        console.error(
          "FAST AI MESSAGE ERROR:",
          fastMessageError
        );
      }

      return NextResponse.json({
        success:
          true,

        response:
          fastResponse,

        visitorSessionId:
          conversation
            .visitor_session_id,

        intent:
          "general",

        matches:
          0,

        action:
          null,

        actionExecuted:
          false,
      });
    }

    // =================================================
    // HOMEPAGE / STORE LINK REQUEST
    // =================================================

    if (
      !hasImage &&
      isHomepageRequest(
        cleanMessage
      )
    ) {
      const storeUrl =
        await resolveVerifiedStoreUrl(
          profileId
        );

      const homepageResponse = storeUrl
        ? "You can visit our store's website here."
        : "I don't have a verified homepage link available right now.";

      const {
        error:
          homeMessageError,
      } =
        await supabaseAdmin
          .from(
            "conversation_messages"
          )
          .insert({
            conversation_id:
              conversation.id,

            sender:
              "ai",

            content:
              homepageResponse,
          });

      if (
        homeMessageError
      ) {
        console.error(
          "HOMEPAGE AI MESSAGE ERROR:",
          homeMessageError
        );
      }

      return NextResponse.json({
        success: true,
        response: homepageResponse,
        visitorSessionId:
          conversation.visitor_session_id,
        intent: "general",
        matches: 0,
        action: null,
        actionExecuted: false,
        hasProducts: false,
        productCount: 0,
        products: [],
        productCards: [],
        siteUrl: storeUrl || null,
        catalogUrl: null,
        collectionUrl: null,
      });
    }

    // =================================================
    // DETECT ACTION
    // =================================================

    console.log(
      "================================="
    );

    console.log(
      "CHECKING FOR ACTION"
    );

    console.log(
      "================================="
    );

    let actionRequest:
      | ActionRequest
      | null =
      hasImage
        ? null
        : detectContextualOrderAction(
            cleanMessage,
            conversationHistory
          );
// =================================================
    // PRODUCT INTENT FALLBACK
    // =================================================
    //
    // Product follow-ups are resolved from the recent
    // customer conversation. This means:
    //
    // "Do you have black dresses?"
    // "How much are they?"
    //
    // becomes a product search for the previous
    // black-dress request, while:
    //
    // "Do you have white dresses?"
    //
    // starts a NEW search for white dresses.
    // =================================================

    if (
      !actionRequest &&
      !hasImage
    ) {
      const productIntent =
        detectResponseProductIntent(
          cleanMessage
        );

      const resolvedProductQuery =
        resolveProductQuery(
          cleanMessage,
          conversationHistory
        );

      const productFollowUp =
        isProductFollowUp(
          cleanMessage
        );

      const isRecommendation =
        productIntent === "recommendation";

      const resolved =
        resolveConversationContext(
          cleanMessage,
          conversationConversationContext
        );

      const effectiveResolvedQuery =
        isRecommendation
          ? "available products"
          : resolvedProductQuery;

      if (
        isRecommendation ||
        productIntent === "catalog" ||
        productIntent === "collection" ||
        productIntent === "product" ||
        productFollowUp
      ) {
        actionRequest = {
          action:
            "search_products",

          parameters: {
            query:
              effectiveResolvedQuery,

            originalQuery:
              cleanMessage,

            resolvedQuery:
              effectiveResolvedQuery,

            isFollowUp:
              productFollowUp,

            isProductFollowUp:
              productFollowUp,

            followUpType:
              isPriceFollowUp(
                cleanMessage
              )
                ? "price"
                : isAvailabilityFollowUp(
                      cleanMessage
                    )
                  ? "availability"
                  : isColorFollowUp(
                        cleanMessage
                      )
                    ? "color"
                    : isSizeFollowUp(
                          cleanMessage
                        )
                      ? "size"
                      : isComparisonFollowUp(
                            cleanMessage
                          )
                        ? "comparison"
                        : null,

            productContextQuery:
              resolved?.effectiveQuery || "",

            isNewTopic:
              resolved?.isNewTopic === true,
          },
        };
      }
    }

if (
  !actionRequest &&
  !hasImage
) {
  actionRequest =
    detectAction(
      cleanMessage
    );
}

// =================================================
// IMAGE PRODUCT INTENT
// =================================================
//
// Product-intent images (what is this, how much is this,
// do you sell this) go through the same verified product
// search as text product questions so the backend returns
// structured product cards instead of letting the model
// guess text with raw URLs.
//
// Problem/support images (damage, error, payment,
// delivery) intentionally stay on the support path.
// =================================================

if (
  !actionRequest &&
  hasImage &&
  imageIntent === "product"
) {
  actionRequest = {
    action:
      "search_products",

    parameters: {
      query:
        effectiveMessage,

      originalQuery:
        cleanMessage,

      resolvedQuery:
        effectiveMessage,

      isFollowUp:
        false,

      isProductFollowUp:
        false,

      followUpType:
        null,

      productContextQuery:
        cleanMessage || "",

      isNewTopic:
        true,
    },
  };
}

    // =================================================
    // ADD PROFILE CONTEXT
    // =================================================

    if (
      actionRequest
    ) {
      const parameters:
        Record<
          string,
          unknown
        > = {
        ...actionRequest.parameters,

        userId:
          profileId,

        profileId:
          profileId,
      };

      actionRequest = {
        action:
          actionRequest.action,

        parameters,
      };
    }

    // =================================================
    // EXECUTE ACTION
    // =================================================

    if (
      actionRequest
    ) {
      console.log(
        "================================="
      );

      console.log(
        "ACTION DETECTED:",
        actionRequest.action
      );

      console.log(
        "ACTION PARAMETERS:",
        actionRequest.parameters
      );

      console.log(
        "================================="
      );

      const actionStartedAt =
        Date.now();

      console.log(
        'FINAL ACTION REQUEST:',
        JSON.stringify(actionRequest, null, 2)
      );

      const actionResult =
        await executeAction(
          actionRequest.action,
          actionRequest.parameters
        );

      console.log(
        `ACTION TIME: ${
          Date.now() -
          actionStartedAt
        }ms`
      );

      console.log(
        "ACTION RESULT:",
        actionResult
      );

      let actionResponse =
  "";

let actionProductData:
  any[] = [];

let actionCatalogUrl =
  "";

let actionCollectionUrl =
  "";

let productContextResolved =
  false;

let rememberRawProducts:
  any[] = [];

      // =================================================
      // ACTION FAILED
      // =================================================

      if (!actionResult.success) {
        const actionError = String(
          actionResult.error || ""
        );

        // Product search is intentionally retried with the core
        // schema when an older database does not contain optional
        // product columns. This prevents a catalog question from
        // becoming a server error.
        if (actionRequest.action === "search_products") {
          try {
            const parameters = actionRequest.parameters as Record<string, unknown>;
            const fallbackQuery = String(
              parameters?.resolvedQuery ||
                parameters?.query ||
                cleanMessage
            ).trim();

            const fallbackProducts = await safeProductSearch(
              profileId,
              fallbackQuery
            );

            const fallbackResult = buildProductResponse(
              fallbackProducts,
              String(parameters?.originalQuery || cleanMessage),
              {
                originalQuery:
                  String(parameters?.originalQuery || cleanMessage),
                resolvedQuery: fallbackQuery,
              }
            );

            actionResponse = fallbackResult.text;
            actionProductData = fallbackResult.products;
            actionCatalogUrl = fallbackResult.catalogUrl;
            actionCollectionUrl = fallbackResult.collectionUrl;

            console.warn(
              "PRODUCT ACTION FALLBACK USED:",
              actionError
            );
          } catch (fallbackError) {
            console.error(
              "PRODUCT SEARCH FALLBACK FAILED:",
              fallbackError
            );
            actionResponse =
              "I'm having trouble accessing the product catalog right now. Please try again in a moment.";
          }
        } else {
          actionResponse =
            actionError ||
            "I'm unable to complete that request right now.";
        }
      }

      // =================================================
      // ACTION SUCCESS
      // =================================================

      else {
        switch (
          actionRequest.action
        ) {
          case "search_products": {
            const actionData =
              (actionResult as any)?.data || {};

            const actionParameters =
              actionRequest.parameters as Record<
                string,
                unknown
              >;

            let searchProducts =
              Array.isArray(actionData.products)
                ? actionData.products
                : [];

            if (searchProducts.length === 0) {
              const fallbackQuery = String(
                actionParameters?.resolvedQuery ||
                  actionParameters?.query ||
                  cleanMessage
              ).trim();

              try {
                const fallbackProducts = await safeProductSearch(profileId, fallbackQuery);
                if (fallbackProducts.length > 0) {
                  console.warn("PRODUCT SEARCH EMPTY-RESULT FALLBACK USED:", fallbackQuery);
                  searchProducts = fallbackProducts;
                }
              } catch (fallbackError) {
                console.error("PRODUCT EMPTY-RESULT FALLBACK FAILED:", fallbackError);
              }
            }

            console.log(
              'SEARCH PRODUCTS RETURNED:',
              searchProducts.length,
              searchProducts.slice(0, 3)
            );

            const originalQuery =
              String(
                actionParameters?.originalQuery ||
                  cleanMessage
              );

            const resolvedQuery =
              String(
                actionParameters?.resolvedQuery ||
                  actionParameters?.query ||
                  cleanMessage
              );


            // -------------------------------------------------
            // PRODUCT CONTEXT MEMORY RESOLUTION
            // -------------------------------------------------
            // If the customer is following up on a previously displayed
            // product list ("first one", "the second one", "the cheapest
            // one", "its link"), resolve against the EXACT ordered products
            // the customer actually saw. No re-search, no re-ranking.
            // -------------------------------------------------

            const productContextKey =
              getProductContextKey(
                visitorSessionId || null,
                profileId,
                conversation?.id ?? null
              );

            const rememberedProducts =
              getRememberedProducts(
                productContextKey
              );

            const productFollowUpOrLink =
              isProductFollowUp(
                originalQuery
              ) ||
              isExplicitProductLinkRequest(
                originalQuery
              ) ||
              isComparisonFollowUp(
                originalQuery
              );
            if (
              productFollowUpOrLink &&
              rememberedProducts.length > 0
            ) {
              const isObjection = isObjectionOrAlternativeRequest(originalQuery);
              if (isObjection) {
                const rejectedProduct = rememberedProducts[0] || null;
                const rejectedId =
                  rejectedProduct?.id ||
                  rejectedProduct?.product_id ||
                  rejectedProduct?.productId;
                const rejectedName = String(
                  rejectedProduct?.displayName ||
                    rejectedProduct?.name ||
                    rejectedProduct?.title ||
                    "this item"
                ).trim();

                const poolToFilter =
                  searchProducts.length > 0
                    ? searchProducts
                    : await safeProductSearch(profileId, "available products");

                const rawAlternatives = poolToFilter.filter((p: any) => {
                  const pid = p?.id || p?.product_id || p?.productId;
                  return !rejectedId || pid !== rejectedId;
                });

                actionProductData = buildProductCards(
                  rawAlternatives.length > 0 ? rawAlternatives : poolToFilter,
                  3
                );
                actionCatalogUrl = "";
                actionCollectionUrl = "";
                productContextResolved = true;

                actionResponse =
                  "No problem — I can help you find something closer to your style. Would you prefer a different color, design, fabric, price range, or something with more or less embroidery?";

                console.log(
                  `OBJECTION RESOLVED: Customer rejected "${rejectedName}". Showing ${actionProductData.length} alternative products.`
                );
                break;
              }

              const listCards =
                buildProductCards(
                  rememberedProducts,
                  3
                );

              const referencedFromMemory =
                selectReferencedProduct(
                  listCards,
                  originalQuery
                ) ||
                (typeof listCards[0] !== "undefined" ? listCards[0] : null);

              if (referencedFromMemory) {
                actionProductData = [referencedFromMemory];
                actionCatalogUrl = "";
                actionCollectionUrl = "";

                productContextResolved = true;

                const referencedName =
                  String(
                    referencedFromMemory?.displayName ||
                    referencedFromMemory?.name ||
                    ""
                  ).trim();

                const isCheapestQuery =
                  /(cheapest|cheaper|least expensive|most affordable)/i.test(
                    originalQuery
                  );

                actionResponse =
                  isCheapestQuery && referencedName
                    ? `The cheapest option is ${referencedName}.`
                    : "Here's the product you asked about.";

                console.log(
                  "PRODUCT CONTEXT MEMORY RESOLVED:"
                );

                console.log(
                  "REFERENCED:",
                  referencedFromMemory?.displayName ||
                    referencedFromMemory?.name
                );

                console.log(
                  "URL:",
                  referencedFromMemory?.productUrl ||
                    referencedFromMemory?.viewUrl
                );

                break;
              }
            }

            // Enforce explicit budget constraints at the response
            // boundary as a second safety layer.
            const searchAnalysis =
              actionData?.analysis &&
              typeof actionData.analysis === "object"
                ? actionData.analysis
                : {};

            searchProducts =
              filterProductsByRequestedPrice(
                searchProducts,
                originalQuery,
                searchAnalysis
              );

            rememberRawProducts = searchProducts;

            const priceFollowUp =
              isPriceFollowUp(
                originalQuery
              );

            const availabilityFollowUp =
              isAvailabilityFollowUp(
                originalQuery
              );

            // -------------------------------------------------
            // FOLLOW-UP: EXPLICIT LINK REQUEST
            // -------------------------------------------------
            // A customer explicitly asking for a link ("give me the
            // link for the first one", "where can I buy it") is resolved
            // against the already-fetched products. The exact referenced
            // product is returned as a structured card so the "View
            // Product" button carries its verified URL.
            // -------------------------------------------------

            const explicitLinkFollowUp =
              isExplicitProductLinkRequest(
                originalQuery
              );

            if (
              explicitLinkFollowUp &&
              searchProducts.length > 0
            ) {
              const listCards =
                buildProductCards(
                  searchProducts,
                  3
                );

              const referencedLinkCard =
                selectReferencedProduct(
                  listCards,
                  originalQuery
                ) || listCards[0] || null;

              if (referencedLinkCard) {
                actionProductData = [referencedLinkCard];
                actionCatalogUrl = "";
                actionCollectionUrl = "";

                actionResponse =
                  buildProductInfoResponse(
                    originalQuery,
                    [referencedLinkCard]
                  );
              }

              break;
            }

            // -------------------------------------------------
            // FOLLOW-UP: PRICE
            // -------------------------------------------------
            //
            // The search itself uses the previous product
            // question, while the response uses the NEW
            // question. This is what makes:
            //
            // "Do you have black dresses?"
            // "How much are they?"
            //
            // return the prices of the black dresses.
            // -------------------------------------------------

            if (
              priceFollowUp &&
              searchProducts.length > 0
            ) {
              const normalizedProducts =
                buildProductCards(
                  searchProducts,
                  3
                );

              const priceLines =
                normalizedProducts
                  .filter(
                    (product: any) =>
                      product.price
                  )
                  .map(
                    (product: any) =>
                      `${product.name}: ${product.price}`
                  );

              if (
                priceLines.length > 0
              ) {
                const discountRequested =
                  /discount|offer|deal|sale/i.test(
                    originalQuery
                  );

                actionResponse =
                  normalizedProducts.length === 1
                    ? `The ${normalizedProducts[0].name} is currently ${normalizedProducts[0].price}.`
                    : `I found the current prices for ${normalizedProducts.length} options. I've added them below.`;

                actionProductData =
                  normalizedProducts;

                actionCatalogUrl =
                  findCatalogUrl(
                    searchProducts,
                    actionData
                  );

                actionCollectionUrl =
                  "";

                break;
              }
            }

            // -------------------------------------------------
            // FOLLOW-UP: AVAILABILITY
            // -------------------------------------------------

            if (
              availabilityFollowUp &&
              searchProducts.length > 0
            ) {
              const normalizedProducts =
                buildProductCards(
                  searchProducts,
                  3
                );

              const availabilityLines =
                normalizedProducts.map(
                  (product: any) => {
                    const status =
                      product.available === true
                        ? "Available"
                        : product.available === false
                          ? "Currently unavailable"
                          : "Availability not listed";

                    return `${product.name}: ${status}`;
                  }
                );

              if (
                availabilityLines.length > 0
              ) {
                actionResponse =
                  normalizedProducts.length === 1
                    ? availabilityLines[0]
                      ? `The ${normalizedProducts[0].name} is ${normalizedProducts[0].available === true ? "currently in stock." : normalizedProducts[0].available === false ? "currently out of stock." : "listed without a confirmed stock status."}`
                      : "I found the product, but its availability is not listed."
                    : `I checked the availability for ${normalizedProducts.length} options. I've added them below.`;

                actionProductData =
                  normalizedProducts;

                actionCatalogUrl =
                  findCatalogUrl(
                    searchProducts,
                    actionData
                  );

                actionCollectionUrl =
                  "";

                break;
              }
            }

            // -------------------------------------------------
            // NORMAL PRODUCT SEARCH
            // -------------------------------------------------

            const productResult =
              buildProductResponse(
                searchProducts,
                (hasImage && imageIntent === "product" ? resolvedQuery : (originalQuery || resolvedQuery)),
                {
                  ...actionData,

                  originalQuery,

                  resolvedQuery,
                }
              );

            actionResponse =
              productResult.text;

            actionProductData =
              productResult.products;

            actionCatalogUrl =
              productResult.catalogUrl;

            actionCollectionUrl =
              productResult.collectionUrl;

            break;
          }

          case "handoff_to_human": {
            actionResponse =
              "Absolutely. I'll connect you with a member of our support team.";

            break;
          }

          case "get_order_status": {
            const result =
              (
                actionResult as any
              )?.data;

            if (
              !result?.found ||
              !result?.order
            ) {
              actionResponse =
                `I couldn't find order ${
                  result?.orderNumber
                    ? `#${result.orderNumber}`
                    : "with that number"
                }. Please check the order number and try again.`;

              break;
            }

            const order =
              result.order;

            const orderNumber =
              order.orderNumber ||
              result.orderNumber ||
              "your order";

            const fulfillment =
              String(
                order.fulfillmentStatus ||
                  ""
              )
                .toLowerCase()
                .replace(
                  /_/g,
                  " "
                );

            const financial =
              String(
                order.financialStatus ||
                  ""
              )
                .toLowerCase()
                .replace(
                  /_/g,
                  " "
                );

            actionResponse =
              `Order ${orderNumber} is currently ${
                fulfillment ||
                "being processed"
              }.`;

            if (
              financial
            ) {
              actionResponse +=
                ` Payment status: ${financial}.`;
            }

            break;
          }

          case "get_order_details": {
            const result =
              (
                actionResult as any
              )?.data;

            if (
              !result?.found ||
              !result?.order
            ) {
              actionResponse =
                `I couldn't find order ${
                  result?.orderNumber
                    ? `#${result.orderNumber}`
                    : "with that number"
                }. Please check the order number and try again.`;

              break;
            }

            const order =
              result.order;

            const items =
              Array.isArray(
                order?.data
                  ?.lineItems
              )
                ? order.data
                    .lineItems
                : [];

            const fulfillment =
              String(
                order.fulfillmentStatus ||
                  "being processed"
              )
                .toLowerCase()
                .replace(
                  /_/g,
                  " "
                );

            actionResponse =
              `Order ${
                order.orderNumber ||
                result.orderNumber
              } is ${fulfillment}.`;

            if (
              items.length > 0
            ) {
              const itemText =
                items
                  .slice(
                    0,
                    5
                  )
                  .map(
                    (
                      item: any
                    ) =>
                      `${item.quantity} x ${item.title}`
                  )
                  .join(
                    ", "
                  );

              actionResponse +=
                ` Items: ${itemText}.`;
            }

            if (
              order.totalPrice !==
                null &&
              order.totalPrice !==
                undefined
            ) {
              actionResponse +=
                ` Total: ${order.totalPrice} ${
                  order.currency ||
                  ""
                }.`;
            }

            break;
          }

          case "check_product_stock": {
            actionResponse =
              "I checked the product availability.";

            break;
          }

          case "get_product_details": {
            actionResponse =
              "I found the product details.";

            break;
          }

          case "get_shipping_policy": {
            actionResponse =
              "I found the store's shipping information.";

            break;
          }

          case "get_return_policy": {
            actionResponse =
              "I found the store's return information.";

            break;
          }

          default: {
            actionResponse =
              "I found the requested information.";

            break;
          }
        }
      }

      // =================================================
      // =====================================================
      // IMAGE MATCH CLASSIFICATION
      // =====================================================
      // For product-intent images we distinguish an EXACT verified
      // match (concrete SKU/title identifier) from merely SIMILAR or
      // unmatched alternatives. A shared template never claims the image
      // is a specific product without verified identity.
      const imageContextKey =
        getProductContextKey(
          visitorSessionId || null,
          profileId,
          conversation?.id ?? null
        );

      let imageMatch = null;

      if (
        hasImage &&
        imageIntent === "product" &&
        actionRequest.action === "search_products"
      ) {
        // Build the merchant-scoped candidate pool ONCE. A real product photo
        // with no readable SKU is rarely in the text-search subset, so we always
        // retrieve against the full catalog + pre-built visual index.
        let fullCatalog: any[] = [];
        let visualIndexRows: any[] = [];
        try {
          fullCatalog = await loadImageMatchCatalog(profileId);
        } catch (catalogError) {
          console.error("IMAGE FULL-CATALOG LOAD ERROR:", catalogError);
          fullCatalog = actionProductData;
        }
        try {
          visualIndexRows = await loadMerchantVisualIndexRows(profileId);
        } catch (indexError) {
          console.error("IMAGE VISUAL INDEX LOAD ERROR:", indexError);
          visualIndexRows = [];
        }
        const matchPool =
          fullCatalog.length > 0 ? fullCatalog : actionProductData;

        let imageMatchResult =
          await determineImageMatchType(
            imageDescription,
            matchPool,
            {
              imageDataUrl: imageData,
              imageName: imageName,
              visualIndexRows,
            }
          );

        // If the full-catalog pool was empty, retry against the initial search
        // subset as a last resort.
        if (imageMatchResult.matchType === "no_match" && matchPool.length === 0) {
          try {
            imageMatchResult = await determineImageMatchType(
              imageDescription,
              actionProductData,
              { imageDataUrl: imageData, imageName: imageName, visualIndexRows }
            );
          } catch (catalogRetryError) {
            console.error("IMAGE MATCH RETRY ERROR:", catalogRetryError);
          }
        }



        const matchType =
          imageMatchResult.matchType;

        imageMatch = {
          matchType,
          exactProductId:
            imageMatchResult.exactProduct?.id ||
            imageMatchResult.exactProduct?.productId ||
            null,
          exactProduct:
            imageMatchResult.exactProduct
              ? {
                  id: imageMatchResult.exactProduct.id ||
                    imageMatchResult.exactProduct.productId ||
                    undefined,
                  name:
                    imageMatchResult.exactProduct.displayName ||
                    imageMatchResult.exactProduct.name ||
                    imageMatchResult.exactProduct.title ||
                    "",
                  url:
                    imageMatchResult.exactProduct.productUrl ||
                    imageMatchResult.exactProduct.viewUrl ||
                    imageMatchResult.exactProduct.url ||
                    imageMatchResult.exactProduct.page_url ||
                    imageMatchResult.exactProduct.source_url ||
                    "",
                  price:
                    imageMatchResult.exactProduct.displayPrice ||
                    imageMatchResult.exactProduct.price ||
                    "",
                  available:
                    typeof imageMatchResult.exactProduct.available === "boolean"
                      ? imageMatchResult.exactProduct.available
                      : null,
                }
              : null,
        };
        rememberImageMatch(
          imageContextKey,
          {
            matchType,
            exactProductId:
              imageMatch?.exactProductId || null,
            exactProduct:
              imageMatch?.exactProduct || null,
          }
        );

        if (matchType === "exact" && imageMatchResult.exactProduct) {
          actionProductData = [imageMatchResult.exactProduct];
          rememberRawProducts = actionProductData;
          actionCatalogUrl = "";
          actionCollectionUrl = "";
        } else if (matchType === "high_confidence" && imageMatchResult.exactProduct) {
          // High-confidence visual match: strong feature similarity identifies this product
          // without a hard SKU/title identifier. We surface it as a likely match.
          actionProductData = [imageMatchResult.exactProduct];
          rememberRawProducts = actionProductData;
          actionCatalogUrl = "";
          actionCollectionUrl = "";
        } else if (matchType === "similar") {
          // Honest closest-option: surface the top visually-scored product but
          // never claim it is the exact uploaded item. The response language
          // distinguishes "closest available option" from "exact match".
          const closest = imageMatchResult?.product || null;
          if (closest) {
            actionProductData = [closest];
            actionCatalogUrl = "";
            actionCollectionUrl = "";
            const closestName = String(
              closest?.displayName || closest?.name || closest?.title || ""
            ).trim();
            actionResponse = closestName
              ? "I couldn't verify your image as the exact same design, but " + closestName +
                " is the closest matching option currently available from our collection."
              : "I couldn't verify your image as the exact same design, but this is the closest matching option available from our collection.";
          } else {
            actionResponse =
              "I couldn't verify the exact product in your image as a currently available store item.";
          }
        } else if (matchType === "no_match") {
          actionProductData = [];
          actionResponse =
            "I couldn't verify the exact product in your image as a currently available store item.";
        }
      } else if (
        !hasImage &&
        actionRequest.action === "search_products" &&
        (isProductFollowUp(cleanMessage) ||
          isExplicitProductLinkRequest(cleanMessage))
      ) {
        // Follow-up on a previously uploaded image: restore the
        // remembered match so we never attribute an alternative's URL
        // to the uploaded item.
        const remembered =
          getRememberedImageMatch(
            imageContextKey
          );
        if (remembered) {
          imageMatch = {
            matchType: remembered.matchType,
            exactProductId: remembered.exactProductId || null,
            exactProduct: remembered.exactProduct || null,
          };
          if (
            (remembered.matchType === "exact" || remembered.matchType === "high_confidence") &&
            remembered.exactProduct &&
            (!actionProductData || actionProductData.length === 0)
          ) {
            actionProductData = [remembered.exactProduct];
          }
        }
      }


      // EXPLICIT PRODUCT LINK REQUEST
      // =================================================
      // When the customer explicitly asks for a link to a previously shown
      // product ("give me the link for the first one", "where can I buy it"),
      // resolve the exact referenced product and deliver its verified URL via
      // the structured card/button. Never refuse when a verified URL exists.
      if (
        actionRequest.action === "search_products" &&
        actionProductData.length > 0
      ) {
        const linkRequest =
          isExplicitProductLinkRequest(
            cleanMessage
          );

        // For uploaded product images classified as SIMILAR or NO_MATCH,
        // a link request must NOT attribute an alternative's URL to the
        // uploaded item. Only an EXACT verified match may grant its link.
        const isSimilarImageFollowUp =
          Boolean(
            imageMatch &&
            (imageMatch.matchType === "similar" ||
             imageMatch.matchType === "no_match")
          );

        if (isSimilarImageFollowUp) {
          // Never hand over an alternative's URL as the uploaded product.
          if (imageMatch.matchType === "no_match" || actionProductData.length === 0) {
            actionProductData = [];
            actionResponse =
              "I couldn't verify the exact product in your image as a currently available store item.";
          } else {
            actionResponse =
              "I couldn't verify the exact product in your image, so I don't have an exact link for it. " +
              "These are similar options currently available:";
          }
        } else if (
          linkRequest
        ) {
          const referenced =
            selectReferencedProduct(
              actionProductData,
              cleanMessage
            );

          if (referenced) {
            actionProductData = [referenced];

            actionCatalogUrl = "";
            actionCollectionUrl = "";

            actionResponse =
              "Here's the product you asked about.";
          }
        }
      }

      // =================================================
      // STRUCTURED PRODUCT RESULT CONTRACT
      // =================================================
      // Product URLs stay in structured product data. The AI must never
      // write raw product URLs into its customer-facing response.
      if (actionRequest.action === "search_products") {
        actionProductData = buildProductCards(
          actionProductData,
          MAX_PRODUCT_CARDS
        );
      }

      // =================================================
      // AI RESPONSE GENERATION FOR ACTION RESULTS
      // =================================================
      // IMPORTANT:
      // Actions retrieve facts. The AI writes the final customer-facing
      // answer. This prevents hard-coded responses such as
      // "I found 3 great options..." from being returned for every query.
      //
      // Examples:
      // - Product details -> natural product explanation
      // - Product search -> concise recommendation + product cards
      // - Shipping/returns -> natural policy answer
      // - Order status -> natural order update
      // =================================================

      const actionDataForAI =
        (actionResult as any)?.data ?? null;

      let actionFacts = "";

      try {
        actionFacts = JSON.stringify(
          {
            action: actionRequest.action,
            success: actionResult.success,
            result: actionDataForAI,
            responseHint: actionResponse,
            products: actionProductData,
          },
          null,
          2
        );
      } catch {
        actionFacts = String(actionResponse || "");
      }

      // Keep the action facts bounded so a large Shopify payload cannot
      // consume the entire model context.
      actionFacts = actionFacts.slice(0, 14000);

      const actionAIContext = `
${buildProfessionalAIContext()}

ACTION RESULT / VERIFIED STORE DATA:
${actionFacts}

IMPORTANT ACTION RESPONSE RULES:
- The ACTION RESULT is verified source data. Use it to answer the customer's
  actual question, but never blindly copy the payload.
- Write a natural, concise customer-facing response.
- For "search_products" catalog requests, do NOT list every product in text.
  Give a short introduction such as "I found a few options for you. Take a
  look below and tell me which one you'd like to explore." The structured
  productCards field contains the product details.
- For a specific product question, discuss the specific product.
- If exactly one relevant product is available, naturally mention its name
  and verified price/availability when relevant.
- If several products are relevant, keep the prose short and let product
  cards provide the detailed names, prices, images, and links.
- Preserve the numbered list format from the responseHint (for example
  "1. Name Ã¢â€šÂ¹ Rs.X", "2. Name Ã¢â€šÂ¹ Rs.Y") so that follow-ups such as
  "the first one", "the second one", "the cheapest one", or
  "compare 1 and 3" stay answerable on the next turn.
- When answering a follow-up, resolve "this", "that", "it", "the first one",
  "the cheaper one", etc. to the correct previously-shown product. If you cannot
  tell which product is meant, ask one short clarification.
- Never jump to an unrelated product when the customer is referring to one that
  was already shown.
- For price, stock, size, color, shipping, returns, or order information,
  only state facts present in the supplied action result or conversation.
- Never invent missing product or store information.
- When the customer EXPLICITLY asks for a link ("give me the link", "send me the
  link", "where can I buy it", "take me to the product", "its link"), you MUST
  return the exact verified product URL from the supplied product data. Put it on
  its own line as "You can view it here: <URL>". Never invent or reconstruct a URL;
  only use a URL that is literally present in the supplied verified data.
- In the same response, also show the product card/button (the app renders it) unless
  the response is not a product result.
- For normal (non-link) responses, do not paste raw URLs; product cards and buttons
  carry the links.
- Never say you cannot share or do not have a direct link when a verified product URL
  exists in the supplied data.
- NEVER output Markdown links or any URL that is not present in the
  supplied verified data.
- NEVER output internal IDs, SKUs, JSON, database fields, actions, tools,
  retrieval details, embeddings, or implementation details.
- Do not repeatedly start responses with "I found a great option for you".
- Prefer 1-3 short paragraphs and natural conversational language.
`;

      const actionAIStartedAt = Date.now();

      let finalActionResponse = "";

      let isLinkRequest = false;

      try {
      // For explicit product-link requests, the resolved verified product
      // card already carries the correct URL. Use a short deterministic
      // message instead of letting the model refuse or fabricate a link.
      // This keeps the "View Product" button authoritative.
      const isObjection = isObjectionOrAlternativeRequest(cleanMessage);
      isLinkRequest =
        !isObjection &&
        (isExplicitProductLinkRequest(
          cleanMessage
        ) ||
          productContextResolved) &&
        actionProductData.length > 0;
      const isSimilarImageResponse =
        Boolean(
          imageMatch &&
          (imageMatch.matchType === "similar" ||
           imageMatch.matchType === "no_match")
        );

      if (isObjection) {
        finalActionResponse =
          "No problem — I can help you find something closer to your style. Would you prefer a different color, design, fabric, price range, or something with more or less embroidery?";
      } else if (isSimilarImageResponse) {
        // Never attribute an alternative's URL or details to the uploaded
        // product. Keep the honest framing for both the image turn and any
        // follow-up (link, availability, price) after a similar/no-match.
        const hasAlternatives =
          Array.isArray(actionProductData) &&
          actionProductData.length > 0;

        if (isExplicitProductLinkRequest(cleanMessage)) {
          finalActionResponse =
            hasAlternatives
              ? "I couldn't verify the exact product in your image, so I don't have an exact link for it. " +
                "These are similar options currently available from our collection:"
              : "I couldn't verify the exact product in your image as a currently available store item.";
        } else if (hasAlternatives) {
          finalActionResponse =
            "I couldn't verify the exact product in your image, but here are similar options available from our collection:";
        } else {
          finalActionResponse =
            "I couldn't verify the exact product in your image as a currently available store item.";
        }
      } else if (
        isLinkRequest
      ) {
        // Deliver verified product info (name, price, availability) in the
        // natural response and let the structured product card carry the
        // exact canonical URL. Never just say "Here's the product".
        finalActionResponse =
          buildProductInfoResponse(
            cleanMessage,
            actionProductData
          );
      } else {
        finalActionResponse = await chatWithAI(
          cleanMessage ||
            "Please answer the customer's request using the supplied store data.",
          actionAIContext
        );
      }
      } catch (aiActionError) {
        console.error(
          "ACTION AI RESPONSE ERROR:",
          aiActionError
        );

        // Safe fallback only if the model is unavailable. The normal path
        // remains AI-generated.
        finalActionResponse =
          String(actionResponse || "").trim() ||
          "I'm sorry, I couldn't complete that request right now. Please try again.";
      }

      console.log(
        `ACTION AI TIME: ${Date.now() - actionAIStartedAt}ms`
      );
      const isDeterministicLinkResponse =
        isLinkRequest &&
          Array.isArray(actionProductData) &&
          actionProductData.length > 0;

      actionResponse = String(
        finalActionResponse || actionResponse || ""
      )
        // For deterministic explicit-link responses, keep the verified
        // product URL in the natural message text as a fallback. For
        // normal AI prose, never paste raw URLs; the structured product
        // cards carry them and render as buttons.
        .replace(
          /\n{3,}/g,
          "\n\n"
        )
        .replace(
          / {2,}/g,
          " "
        )
        .trim();

      if (!isDeterministicLinkResponse) {
        actionResponse = actionResponse
          .replace(
            /https?:\/\/[^\s<>"')]+/gi,
            ""
          )
          .replace(
            /View it here\s*:/gi,
            ""
          );
      }

      if (!actionResponse) {
        actionResponse =
          "I'm sorry, I couldn't generate a response right now. Please try again.";
      }


      // =================================================
      // REMEMBER DISPLAYED PRODUCTS
      // =================================================
      // Store the exact ordered product cards returned so the next
      // follow-up ("first one", "cheapest one", "its link") resolves
      // against the same products the customer actually saw.
      if (actionRequest.action === "search_products") {
        const productContextKey =
          getProductContextKey(
            visitorSessionId || null,
            profileId,
            conversation?.id ?? null
          );
        rememberDisplayedProducts(
          productContextKey,
          (rememberRawProducts && rememberRawProducts.length > 0)
            ? rememberRawProducts
            : actionProductData
        );
      }

      // =================================================
      // SAVE AI RESPONSE
      // =================================================

      const {
        error:
          actionMessageError,
      } =
        await supabaseAdmin
          .from(
            "conversation_messages"
          )
          .insert({
            conversation_id:
              conversation.id,

            sender:
              "ai",

            content:
              actionResponse,
          });

      if (
        actionMessageError
      ) {
        console.error(
          "ACTION AI MESSAGE ERROR:",
          actionMessageError
        );
      }

      return NextResponse.json({
        success: true,

        response:
          actionResponse,

        visitorSessionId:
          conversation.visitor_session_id,

        action:
          actionRequest.action,

        actionExecuted:
          actionResult.success,

        responseType:
          actionRequest.action === "search_products"
            ? "product_results"
            : "text",

        hasProducts:
          actionProductData.length > 0,

        productCount:
          actionProductData.length,

        // Keep both keys for compatibility with different widget versions.
        products:
          actionProductData,

        productCards:
          actionProductData,

        catalogUrl:
          actionCatalogUrl || null,

        collectionUrl:
          actionCollectionUrl || null,
        imageMatch:
          imageMatch || null,
      });
    }


  
// =================================================
// CREATE SEARCH EMBEDDING
// =================================================

    // =================================================
    // DETECT INTENT
    // =================================================

    const intent =
      detectIntent(
        cleanMessage ||
          effectiveMessage
      );

    console.log(
      "INTENT:",
      intent
    );

    // =================================================
    // RETRIEVAL GATE
    // =================================================
    // Casual greetings and tiny utterances do not need
    // embedding + knowledge search. Skipping them avoids
    // unnecessary latency and prevents a retrieval failure
    // from turning small talk into an error.

    const shouldRetrieve =
      shouldSearchKnowledge(
        cleanMessage ||
          effectiveMessage,
        intent,
        hasImage
      );

    let knowledgeMatches:
      any[] = [];

    if (
      shouldRetrieve
    ) {
      // -------------------------------------------------
      // CREATE SEARCH EMBEDDING
      // -------------------------------------------------

      const embeddingStartedAt =
        Date.now();

      let embedding:
        number[];

      try {
        embedding =
          await createEmbedding(
            effectiveMessage
          );
      } catch (
        embeddingError
      ) {
        console.error(
          "================================="
        );

        console.error(
          "OPENAI EMBEDDING ERROR"
        );

        console.error(
          embeddingError
        );

        console.error(
          "================================="
        );

        // Degrade gracefully: answer from conversation
        // history instead of failing the request.
        console.warn(
          "KNOWLEDGE RETRIEVAL SKIPPED DUE TO EMBEDDING ERROR"
        );
      }

      if (
        embedding
      ) {
        console.log(
          "EMBEDDING CREATED"
        );

        console.log(
          "EMBEDDING DIMENSIONS:",
          embedding.length
        );

        console.log(
          `EMBEDDING TIME: ${
            Date.now() -
            embeddingStartedAt
          }ms`
        );

        // -------------------------------------------------
        // USER-SCOPED KNOWLEDGE SEARCH
        // -------------------------------------------------

        const knowledgeStartedAt =
          Date.now();

        const {
          data: matches,
          error:
            searchError,
        } =
          await supabaseAdmin.rpc(
            "match_knowledge_chunks_for_user",
            {
              query_embedding:
                embedding,

              match_count:
                KNOWLEDGE_MATCH_COUNT,

              filter_user_id:
                profileId,
            }
          );

        if (
          searchError
        ) {
          console.error(
            "================================="
          );

          console.error(
            "KNOWLEDGE SEARCH ERROR"
          );

          console.error(
            searchError
          );

          console.error(
            "================================="
          );

          // Degrade gracefully: report the absence of
          // retrieved context to the AI, not an error.
          console.warn(
            "KNOWLEDGE RETRIEVAL SKIPPED DUE TO SEARCH ERROR"
          );
        } else {
          knowledgeMatches =
            Array.isArray(
              matches
            )
              ? matches
              : [];

          console.log(
            "USER-SCOPED KNOWLEDGE MATCHES:",
            knowledgeMatches.length
          );

          console.log(
            `KNOWLEDGE SEARCH TIME: ${
              Date.now() -
              knowledgeStartedAt
            }ms`
          );
        }
      }
    } else {
      console.log(
        "KNOWLEDGE RETRIEVAL SKIPPED (NON-PRODUCT/CASUAL MESSAGE)"
      );
    }

    // =================================================
    // USER-SCOPED KNOWLEDGE SEARCH
    // =================================================

    // =================================================
    // BUILD KNOWLEDGE CONTEXT
    // =================================================

    const knowledgeContext =
      buildContext(
        knowledgeMatches
      );

    // =================================================
    // BUILD FINAL CONTEXT
    // =================================================

    let finalContext =
      "";

    if (
      historyContext.trim()
    ) {
      finalContext += `
RECENT CONVERSATION:
${historyContext}

`;
    }

    if (
      hasImage &&
      imageDescription
    ) {
      const isProblemImage =
        imageIntent === "problem";

      finalContext += `
CUSTOMER UPLOADED AN IMAGE.

IMAGE TYPE: ${isProblemImage ? "support / problem report" : "product identification"}
IMAGE ANALYSIS:
${imageDescription}

IMAGE RESPONSE RULES:
- Only claim an exact product was identified when the store knowledge contains a clear, unique match.
- If the customer seems to be reporting a problem (damage, error, wrong item, payment, delivery), help them with the issue using verified store policies. Do NOT suggest product links.
- If the customer is asking about a product in the photo, you may identify it only if the catalog clearly and uniquely matches. Otherwise say you cannot confirm the exact item and offer a useful next step.
- Never point to an unrelated product as if it matched the photo.
`;

    }

    if (
      knowledgeContext.trim()
    ) {
      finalContext += `
STORE KNOWLEDGE:
${knowledgeContext}

`;
    }

    // =================================================
    // GENERATE AI RESPONSE
    // =================================================

    const responseIntent =
      detectResponseProductIntent(cleanMessage);

    finalContext += `
CUSTOMER REQUEST TYPE:
${responseIntent}

SPECIAL RESPONSE INSTRUCTION:
If the request type is "catalog", give a short natural overview of what
the store sells. Do not copy the retrieved product records into the answer.
If the request type is "product" or "collection", answer naturally using
verified product information and keep the detailed product data in the
structured productCards response.

${buildProfessionalAIContext()}
`;

    let aiResponse =
      "";

    const aiStartedAt =
      Date.now();

    // Always let the AI handle the final conversational response.
    // Knowledge retrieval is grounding data, not a prerequisite for calling
    // the model. This allows greetings, clarifications, general questions,
    // and unsupported questions to receive natural responses too.
    aiResponse =
      await chatWithAI(
        cleanMessage ||
          "Please identify the product shown in the uploaded image.",
        finalContext
      );

    console.log(
      `AI TIME: ${
        Date.now() -
        aiStartedAt
      }ms`
    );

    // =================================================
    // CLEAN AI RESPONSE
    // =================================================

    aiResponse =
      String(
        aiResponse || ""
      ).trim();

    if (!aiResponse) {
      aiResponse =
        "I'm sorry, I couldn't generate a response.";
    }

    // =================================================
    // PRODUCT URL
    // =================================================

    

    // =================================================
    // REMOVE UNUSED PLACEHOLDER
    // =================================================

    

    // =================================================
    // FINAL CLEANUP
    // =================================================

    aiResponse =
      aiResponse
        .replace(
          /\n{3,}/g,
          "\n\n"
        )
        .replace(
          / {2,}/g,
          " "
        )
        .trim();

    // =================================================
    // SAVE AI RESPONSE
    // =================================================

    const {
      error:
        aiMessageError,
    } =
      await supabaseAdmin
        .from(
          "conversation_messages"
        )
        .insert({
          conversation_id:
            conversation.id,

          sender:
            "ai",

          content:
            aiResponse,
        });

    if (
      aiMessageError
    ) {
      console.error(
        "AI MESSAGE ERROR:",
        aiMessageError
      );
    }

    // =================================================
    // SUCCESS
    // =================================================

    const totalTime =
      Date.now() -
      requestStartedAt;

    console.log(
      "================================="
    );

    console.log(
      "CHAT SUCCESS"
    );

    console.log(
      "RESPONSE:",
      aiResponse
    );

    console.log(
      "MATCHES:",
      knowledgeMatches.length
    );

    console.log(
      "INTENT:",
      intent
    );

    console.log(
      "IMAGE USED:",
      hasImage
    );

    console.log(
      "IMAGE DESCRIPTION:",
      imageDescription
    );

    console.log(
      `TOTAL CHAT TIME: ${totalTime}ms`
    );

    console.log(
      "================================="
    );

    return NextResponse.json({
      success:
        true,

      response:
        aiResponse,

      visitorSessionId:
        conversation
          .visitor_session_id,

      intent,

      matches:
        knowledgeMatches.length,

      imageUsed:
        hasImage,

      imageDescription:
        hasImage
          ? imageDescription
          : null,

      action:
        null,

      actionExecuted:
        false,

      responseType:
        detectResponseProductIntent(cleanMessage) === "general"
          ? "text"
          : "product_results",

      hasProducts:
        false,

      productCount:
        0,

      products:
        [],

      productCards:
        [],

      catalogUrl:
        null,

      collectionUrl:
        null,
    });
  } catch (
    error: any
  ) {
    const totalTime =
      Date.now() -
      requestStartedAt;

    console.error(
      "================================="
    );

    console.error(
      "CHAT API ERROR"
    );

    console.error(
      "ERROR:",
      error
    );

    console.error(
      `TOTAL TIME: ${totalTime}ms`
    );

    console.error(
      "================================="
    );

    return NextResponse.json(
      {
        success:
          false,

        // Keep the real error server-side for debugging. The
        // customer only ever sees a professional message so
        // raw provider/database errors are never exposed.
        error:
          "Sorry, I wasn't able to respond just now. Please try again in a moment.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// PRODUCT RESPONSE HELPERS
// =====================================================

function cleanResponseText(value: unknown) {
  if (!value) {
    return "";
  }

  return String(value)
    // Decode common HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x20;/gi, " ")
    .replace(/&#32;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&hellip;/gi, "Ã¢â‚¬Â¦")

    // Remove HTML
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")

    // Remove Shopify scraped garbage
    .replace(/skip to product information/gi, "")
    .replace(/skip to content/gi, "")
    .replace(/regular price/gi, "")
    .replace(/sale price/gi, "")
    .replace(/add to cart/gi, "")
    .replace(/buy it now/gi, "")
    .replace(/quantity/gi, "")
    .replace(/low stock:\s*\d+\s*left/gi, "")
    .replace(/title:\s*/gi, "")

    // Remove repeated size text
    .replace(
      /\bS\s+S\s+M\s+M\s+L\s+L\b/gi,
      ""
    )

    // Remove URLs from text
    .replace(/https?:\/\/\S+/gi, "")

    // Remove Markdown links
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi,
      "$1"
    )

    // Remove excessive Markdown formatting
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")

    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}


// =====================================================
// PRODUCT NAME
// =====================================================

function getResponseProductName(product: any) {
  return cleanResponseText(
    product?.name ||
      product?.title ||
      product?.product_name ||
      product?.page_title ||
      ""
  );
}


// =====================================================
// PRODUCT PRICE
// =====================================================

function getResponseProductPrice(product: any) {
  const raw =
    product?.price ??
    product?.min_price ??
    product?.amount ??
    "";

  if (
    raw === null ||
    raw === undefined ||
    raw === ""
  ) {
    // Fall back to an authoritative price string embedded in the crawled
    // product description (e.g. "Regular price Rs.8,499.00"). This is
    // extracted from real product data, never invented.
    const descText = cleanResponseText(
      product?.description ||
        product?.content ||
        product?.body_html ||
        ""
    );
    const m =
      /(?:regular\s+price|sale\s+price|price|rs\.?|pkr)\s*:?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i.exec(
        descText
      );
    if (m) {
      return `Rs.${m[1]}`;
    }
    return "";
  }

  return cleanResponseText(raw)
    .replace(
      /^(regular price|sale price|price)\s*:?\s*/i,
      ""
    )
    .trim();
}


// =====================================================
// PRODUCT URL
// =====================================================

function getResponseProductUrl(product: any) {
  const raw =
    product?.productUrl ||
    product?.product_url ||
    product?.url ||
    product?.page_url ||
    product?.source_url ||
    "";

  if (!raw) {
    return "";
  }

  const url = String(raw)
    .trim()
    .replace(/[),.;]+$/, "");

  if (!/^https?:\/\//i.test(url)) {
    return "";
  }

  return url;
}


// =====================================================
// PRODUCT IMAGE
// =====================================================

function getResponseProductImage(product: any) {
  const raw =
    product?.imageUrl ||
    product?.image_url ||
    product?.image ||
    product?.featured_image ||
    product?.featuredImage ||
    product?.thumbnail ||
    "";

  if (!raw) {
    return "";
  }

  const url = String(raw).trim();

  if (!/^https?:\/\//i.test(url)) {
    return "";
  }

  return url;
}


// =====================================================
// PRODUCT AVAILABILITY
// =====================================================

function getResponseProductAvailability(
  product: any
) {
  if (
    typeof product?.available ===
    "boolean"
  ) {
    return product.available;
  }

  if (
    typeof product?.available_for_sale ===
    "boolean"
  ) {
    return product.available_for_sale;
  }

  if (
    typeof product?.availableForSale ===
    "boolean"
  ) {
    return product.availableForSale;
  }

  if (
    typeof product?.in_stock ===
    "boolean"
  ) {
    return product.in_stock;
  }

  if (
    typeof product?.inventory_quantity ===
    "number"
  ) {
    return product.inventory_quantity > 0;
  }

  // Fall back to authoritative stock wording embedded in the crawled
  // product description (e.g. "In Stock and ready to ship" / "Low stock").
  const descText = cleanResponseText(
    product?.description ||
      product?.content ||
      product?.body_html ||
      ""
  );
  if (
    /in\s*stock|in-stock|ready to ship|available/i.test(descText)
  ) {
    return /out\s*of\s*stock|sold\s*out|out-of-stock|unavailable/i.test(descText)
      ? false
      : true;
  }
  if (
    /out\s*of\s*stock|sold\s*out|out-of-stock|unavailable/i.test(descText)
  ) {
    return false;
  }

  return undefined;
}


// =====================================================
// NORMALIZE RESPONSE PRODUCT
// =====================================================

function normalizeResponseProduct(
  product: any
) {
  const name =
    getResponseProductName(product);

  const productUrl =
    getResponseProductUrl(product);

  const imageUrl =
    getResponseProductImage(product);

  const description =
    cleanResponseText(
      product?.description ||
        product?.content ||
        product?.body_html ||
        ""
    ).slice(
      0,
      MAX_PRODUCT_DESCRIPTION_LENGTH
    );

  const availability =
    getResponseProductAvailability(
      product
    );

  const price =
    getResponseProductPrice(
      product
    );

  const currency =
    cleanResponseText(
      product?.currency ||
        product?.currency_code ||
        ""
    ) || undefined;

  const sku =
    cleanResponseText(
      product?.sku ||
        product?.variant_sku ||
        ""
    ) || undefined;

  const collectionNames =
    Array.isArray(
      product?.collectionNames
    )
      ? product.collectionNames
          .map((item: unknown) =>
            cleanResponseText(item)
          )
          .filter(Boolean)
      : [];

  return {
    id:
      product?.id ||
      product?.externalId ||
      product?.external_id ||
      product?.product_id ||
      undefined,

    name:
      name || "Product",

    title:
      name || "Product",

    description:
      description || undefined,

    price:
      price || undefined,

    currency,

    available:
      availability,

    availabilityLabel:
      availability === true
        ? "In stock"
        : availability === false
          ? "Out of stock"
          : "Availability not listed",

    imageUrl:
      imageUrl || undefined,

    image:
      imageUrl || undefined,

    productUrl,

    url:
      productUrl,

    viewUrl:
      productUrl,

    handle:
      product?.handle ||
      undefined,

    sku,

    vendor:
      cleanResponseText(
        product?.vendor || ""
      ) || undefined,

    collectionNames,
  };
}


// =====================================================
// NORMALIZE PRODUCT LIST
// =====================================================

function normalizeResponseProducts(
  products: any[]
) {
  if (!Array.isArray(products)) {
    return [];
  }

  return products
    .map(
      normalizeResponseProduct
    )
    .filter(
      (product) =>
        product.name &&
        product.name !== "Product"
    );
}


// =====================================================
// DEDUPLICATE RESPONSE PRODUCTS
// =====================================================

function deduplicateResponseProducts(
  products: any[]
) {
  const seen =
    new Set<string>();

  const result: any[] = [];

  for (
    const product of products
  ) {
    const name =
      String(
        product?.name || ""
      )
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          " "
        )
        .trim();

    const url =
      String(
        product?.productUrl || ""
      )
        .toLowerCase()
        .replace(
          /\/+$/,
          ""
        )
        .trim();

    const id =
      String(
        product?.id || ""
      )
        .toLowerCase()
        .trim();

    const key =
      id ||
      url ||
      name;

    if (!key) {
      continue;
    }

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(product);
  }

  return result;
}


// =====================================================
// CATALOG URL
// =====================================================

function findCatalogUrl(
  products: any[],
  metadata?: any
) {
  const candidates = [
    metadata?.catalogUrl,
    metadata?.catalog_url,
    metadata?.allProductsUrl,
    metadata?.all_products_url,
    metadata?.productsUrl,
    metadata?.products_url,
  ];

  for (
    const candidate of candidates
  ) {
    if (!candidate) {
      continue;
    }

    const url =
      String(candidate)
        .trim()
        .replace(/[),.;]+$/, "");

    if (
      /^https?:\/\//i.test(url)
    ) {
      return url;
    }
  }

  // Derive Shopify catalog URL
  // from an existing product URL.
  for (
    const product of products
  ) {
    const productUrl =
      getResponseProductUrl(
        product
      );

    if (!productUrl) {
      continue;
    }

    try {
      const parsed =
        new URL(productUrl);

      if (
        /\/products\//i.test(
          parsed.pathname
        )
      ) {
        return `${parsed.origin}/collections/all`;
      }
    } catch {
      continue;
    }
  }

  return "";
}


// =====================================================
// COLLECTION URL
// =====================================================

function findCollection(
  products: any[],
  userMessage: string
) {
  const message =
    String(userMessage || "")
      .toLowerCase()
      .trim();

  const candidates: Array<{
    name: string;
    url: string;
  }> = [];

  for (
    const product of products
  ) {
    const names =
      Array.isArray(
        product?.collectionNames
      )
        ? product.collectionNames
        : [];

    const urls =
      Array.isArray(
        product?.collectionUrls
      )
        ? product.collectionUrls
        : [];

    for (
      let i = 0;
      i < names.length;
      i++
    ) {
      const name =
        cleanResponseText(
          names[i]
        );

      const url =
        urls[i]
          ? String(
              urls[i]
            ).trim()
          : "";

      if (
        name &&
        /^https?:\/\//i.test(url)
      ) {
        candidates.push({
          name,
          url,
        });
      }
    }
  }

  if (
    candidates.length === 0
  ) {
    return null;
  }

  // Prefer explicitly requested collection.
  const exact =
    candidates.find(
      (candidate) =>
        message.includes(
          candidate.name
            .toLowerCase()
        )
    );

  if (exact) {
    return exact;
  }

  return candidates[0];
}


// =====================================================
// PRODUCT PRICE PARSING
// =====================================================

function parseResponseProductPrice(
  value: unknown
): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const match =
    value
      .replace(/,/g, "")
      .match(/-?\\d+(?:\\.\\d+)?/);

  if (!match) {
    return undefined;
  }

  const parsed =
    Number(match[0]);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function extractRequestedPriceRange(
  query: string
) {
  const text =
    String(query || "")
      .toLowerCase()
      .replace(/,/g, "")
      .replace(/\\s+/g, " ")
      .trim();

  if (!text) {
    return {
      min: undefined,
      max: undefined,
      explicit: false,
    };
  }

  let match =
    text.match(
      /\\bbetween\\s+(\\d+(?:\\.\\d+)?)\\s+(?:and|to|-)\\s+(\\d+(?:\\.\\d+)?)\\b/
    );

  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);

    return {
      min: Math.min(first, second),
      max: Math.max(first, second),
      explicit:
        Number.isFinite(first) &&
        Number.isFinite(second),
    };
  }

  match =
    text.match(
      /\\b(\\d+(?:\\.\\d+)?)\\s*(?:to|-)\\s*(\\d+(?:\\.\\d+)?)\\b/
    );

  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);

    return {
      min: Math.min(first, second),
      max: Math.max(first, second),
      explicit:
        Number.isFinite(first) &&
        Number.isFinite(second),
    };
  }

  match =
    text.match(
      /\b(?:under|below|less than|max(?:imum)?|up to)\s+(?:rs\.?|pkr|Ã¢â€šÂ¨|\$|usd|Ã¢â€šÂ¬|eur|Ã‚Â£|gbp)\s*(\d+(?:\.\d+)?)\b/
    );

  if (match) {
    const max = Number(match[1]);

    return {
      min: undefined,
      max,
      explicit:
        Number.isFinite(max),
    };
  }

  match =
    text.match(
      /\b(?:over|above|more than|at least|from)\s+(?:rs\.?|pkr|Ã¢â€šÂ¨|\$|usd|Ã¢â€šÂ¬|eur|Ã‚Â£|gbp)\s*(\d+(?:\.\d+)?)\b/
    );

  if (match) {
    const min = Number(match[1]);

    return {
      min,
      max: undefined,
      explicit:
        Number.isFinite(min),
    };
  }

  return {
    min: undefined,
    max: undefined,
    explicit: false,
  };
}

function filterProductsByRequestedPrice(
  products: any[],
  query: string,
  analysis?: any
): any[] {
  if (!Array.isArray(products)) {
    return [];
  }

  const range =
    extractRequestedPriceRange(
      query
    );

  const min =
    typeof analysis?.priceMin === "number"
      ? analysis.priceMin
      : range.min;

  const max =
    typeof analysis?.priceMax === "number"
      ? analysis.priceMax
      : range.max;

  const explicit =
    Boolean(
      analysis?.hasPriceRange
    ) ||
    range.explicit;

  if (
    !explicit ||
    (
      min === undefined &&
      max === undefined
    )
  ) {
    return products;
  }

  return products.filter(
    (product) => {
      const price =
        parseResponseProductPrice(
          product?.price ??
            product?.min_price ??
            product?.amount ??
            product?.price_amount
        );

      // Never claim an unpriced product satisfies an explicit budget.
      if (
        price === undefined
      ) {
        return false;
      }

      if (
        min !== undefined &&
        price < min
      ) {
        return false;
      }

      if (
        max !== undefined &&
        price > max
      ) {
        return false;
      }

      return true;
    }
  );
}


// =====================================================
// RESPONSE PRODUCT INTENT
// =====================================================

function normalizeRecommendationText(message: string): string {
  return String(message || "")
    .toLowerCase()
    .replace(
      /^(hi|hello|hey|hii|hiii|helo|good morning|good afternoon|good evening)\b\s*/i,
      ""
    )
    .replace(/[!?.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectProductRecommendationRequest(
  message: string
): boolean {
  const text = normalizeRecommendationText(message);

  if (!text) {
    return false;
  }

  // -- Exact / near-exact recommendation requests -----------------
  const recommendationPhrases = [
    "show me your best products",
    "show me best products",
    "what are your best products",
    "what is your best product",
    "what's your best product",
    "what are the best products",
    "best products",
    "best product",
    "what should i buy",
    "what do you recommend",
    "what would you recommend",
    "what do you suggest",
    "what would you suggest",
    "recommend something",
    "recommend me something",
    "recommend me",
    "recommend",
    "show me something nice",
    "show me something",
    "show me popular products",
    "popular products",
    "most popular products",
    "what are your most popular products",
    "what are the most popular products",
    "best sellers",
    "best selling",
    "trending products",
    "trending",
    "suggest something for me",
    "suggest something",
    "suggest me something",
    "what's good here",
    "what is good here",
    "whats good",
    "what's popular",
    "what is popular",
  ];

  for (const phrase of recommendationPhrases) {
    if (text.includes(phrase)) {
      return true;
    }
  }

  // -- Pattern-based recommendation requests ------------------------
  const recommendationPatterns = [
    /^(show|suggest|recommend)\s+(me\s+)?(some|a few|your|the)?\s*(best|top|popular|trending|nice|great)?\s*(products?|items?|things?|options)?$/i,
    /^(what|which)\s+(are|is)?\s*(your|the)?\s*(best|top|popular|trending|recommended|favorite)\s*(products?|items?)?\??$/i,
    /^what\s+should\s+i\s+(buy|get|purchase|order|check out)\??$/i,
    /^recommend\s+me\s+/i,
    /^suggest\s+me\s+/i,
    /^what\s+do\s+you\s+(recommend|suggest)\??$/i,
    /^best\s+sellers?\b/i,
    /^trending\b/i,
  ];

  return recommendationPatterns.some(
    (pattern) => pattern.test(text)
  );
}

function detectResponseProductIntent(message: string) {
  const text = String(message || "")
    .toLowerCase()
    .replace(/[!?.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return "general" as const;
  }

  // ---------------------------------------------------
  // CATALOG / STORE DISCOVERY
  // ---------------------------------------------------
  // Explicitly recognize natural phrases such as:
  // "hi what you have"
  // "hello what do you have"
  // "what do you sell"
  // "what products do you have"
  // "show me your products"
  // ---------------------------------------------------
  const withoutGreeting = text
    .replace(
      /^(hi|hello|hey|hii|hiii|helo|good morning|good afternoon|good evening)\b\s*/i,
      ""
    )
    .trim();

  // ---------------------------------------------------
  // RECOMMENDATION / DISCOVERY REQUEST
  // ---------------------------------------------------
  if (detectProductRecommendationRequest(withoutGreeting)) {
    return "recommendation" as const;
  }

  const catalogPatterns = [
    /^what\s+(do|does)\s+you\s+(have|sell|offer)\b/i,
    /^what\s+you\s+have\b/i,
    /^what\s+you\s+sell\b/i,
    /^what\s+(products?|items?|things?)\s+(do|can)\s+you\s+(have|sell|offer)\b/i,
    /^what\s+(products?|items?)\s+(are\s+)?available\b/i,
    /^which\s+(products?|items?)\s+(do|can)\s+you\s+(have|sell|offer)\b/i,
    /^which\s+.*\s+(do|can)\s+you\s+(have|sell|offer)\b/i,
    /^(show|list|browse)\s+(me\s+)?(your\s+)?(products?|items?|catalog|catalogue)\b/i,
    /^(browse|shop|catalog|catalogue|all products|everything you sell)$/i,
    /^tell\s+me\s+(what|which)\s+(you\s+)?(have|sell|offer)\b/i,
  ];

  if (catalogPatterns.some((pattern) => pattern.test(withoutGreeting))) {
    return "catalog" as const;
  }

  // ---------------------------------------------------
  // CATEGORY / PRODUCT SEARCH
  // ---------------------------------------------------
  const productCategoryWords = [
    // Apparel & Clothing
    "dress", "dresses",
    "shirt", "shirts",
    "t shirt", "t shirts", "tee", "tees",
    "top", "tops",
    "hoodie", "hoodies", "sweater", "sweaters",
    "jacket", "jackets", "coat", "coats",
    "pants", "jeans", "trousers", "shorts", "skirt", "skirts",
    "suit", "suits", "outfit", "outfits",
    "clothing", "clothes", "apparel",
    "lawn", "chiffon", "silk", "cotton", "linen", "unstitched", "pret",
    "2 pcs", "3 pcs",
    // Footwear
    "shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "heel", "heels", "sandal", "sandals", "footwear",
    // Bags & Accessories
    "bag", "bags", "handbag", "handbags", "backpack", "backpacks", "tote", "purse", "wallet", "wallets",
    "watch", "watches", "belt", "belts", "cap", "caps", "hat", "hats", "jewelry",
    // Electronics & Gadgets
    "phone", "phones", "laptop", "laptops", "headphone", "headphones", "earbuds", "speaker", "speakers", "charger",
    // Home & Living
    "furniture", "chair", "chairs", "table", "tables", "sofa", "sofas", "couch", "bed", "desk", "lamp",
    // Beauty & Skincare
    "skincare", "makeup", "lipstick", "perfume", "fragrance", "serum", "lotion", "cream",
    // General
    "product", "products",
    "item", "items",
  ];

  const hasCategory = productCategoryWords.some(
    (word) => text.includes(word)
  );

  const hasProductRequestVerb = [
    "have", "sell", "offer", "show", "find",
    "looking", "available", "recommend",
    "want", "need", "buy", "get", "browse",
    "which", "what",
  ].some(
    (word) => text.includes(word)
  );

  if (hasCategory && hasProductRequestVerb) {
    return "product" as const;
  }

  // ---------------------------------------------------
  // COLLECTION / CATEGORY DISCOVERY
  // ---------------------------------------------------
  const collectionWords = [
    "collection",
    "category",
    "lawn",
    "chiffon",
    "embroidered",
    "printed",
    "unstitched",
    "pret",
    "sale",
  ];

  const looksLikeCollection =
    collectionWords.some((word) => text.includes(word)) &&
    [
      "show",
      "find",
      "browse",
      "products",
      "items",
      "options",
      "have",
      "sell",
    ].some((word) => text.includes(word));

  if (looksLikeCollection) {
    return "collection" as const;
  }

  // ---------------------------------------------------
  // SPECIFIC PRODUCT / PRICE / STOCK REQUEST
  // ---------------------------------------------------
  if (
    /\bdo you have\b/i.test(text) ||
    /\bprice\b/i.test(text) ||
    /\bcost\b/i.test(text) ||
    /\bhow much\b/i.test(text) ||
    /\bis this available\b/i.test(text) ||
    /\bavailable\b/i.test(text) ||
    /\bshow me\b/i.test(text)
  ) {
    return "product" as const;
  }

  return "general" as const;
}



// =====================================================
// DISPLAY LABEL HELPERS
// =====================================================

function displayBaseName(product: any): string {
  const raw =
    product?.name ||
    product?.title ||
    product?.product_name ||
    product?.page_title ||
    "";
  return cleanResponseText(raw);
}

function displayCollectionHint(product: any): string {
  const names =
    Array.isArray(product?.collectionNames)
      ? product.collectionNames
      : Array.isArray(product?.collection_names)
        ? product.collection_names
        : [];
  const hint = String(
    names
      .map((item: unknown) => cleanResponseText(item))
      .filter(Boolean)
      .join(", ")
  );
  return hint.slice(0, 60);
}

function displayPrice(product: any): string {
  return cleanResponseText(
    getResponseProductPrice(product)
  );
}

function displayAvailabilityLabel(product: any): string {
  const available =
    getResponseProductAvailability(product);
  if (available === true) return "In stock";
  if (available === false) return "Out of stock";
  return "";
}
// =====================================================
// PRODUCT INFO FOLLOW-UP RESPONSE
// =====================================================
// Builds a short, deterministic customer-facing response for a
// product follow-up ("its price and link", "is it available", etc.)
// using ONLY verified structured product data. Price, availability,
// and the canonical product URL all come from the resolved product
// card, never reconstructed by the model from memory.

function buildProductInfoResponse(
  message: string,
  products: any[]
): string {
  const card = Array.isArray(products) ? products[0] : undefined;
  if (!card) {
    return "Here's the product you asked about.";
  }

  const name = String(
    card.displayName || card.name || card.title || ""
  ).trim();
  const price = String(card.displayPrice || card.price || "").trim();
  const available = getResponseProductAvailability(card);
  const url = getResponseProductUrl(card);

  const text = normalizeContextText(message);
  const wantsAvailability = /availab|in stock|stock|have it|do you have/i.test(text);
  const wantsPrice = /price|cost|how much|priced/i.test(text);
  const wantsLink = /link|url|where can i buy|open it|buy it|view it/i.test(text);

  const bits: string[] = [];

  if (wantsPrice && price) {
    bits.push(`It is available for ${price}.`);
  }

  if (wantsAvailability) {
    if (available === true) {
      bits.push("It is currently in stock.");
    } else if (available === false) {
      bits.push("It is currently out of stock.");
    }
  }

  let sentence = "";
  if (name) {
    sentence =
      bits.length > 0
        ? `${name} ${bits.join(" ")}`
        : `${name} is the product you were asking about.`;
  } else if (bits.length > 0) {
    sentence = bits.join(" ");
  } else {
    sentence = "Here's the product you asked about.";
  }

  if (url) {
    if (wantsLink) {
      sentence += ` You can view it here: ${url}`;
    } else {
      sentence += " You can open it with the View Product button on the product card below.";
    }
  }

  return sentence.trim();
}


// =====================================================
// PRODUCT CARD DATA
// =====================================================

function buildProductCards(
  products: any[],
  maxResults = MAX_PRODUCT_CARDS
) {
  const requestedLimit =
    Number.isFinite(maxResults)
      ? Math.floor(maxResults)
      : MAX_PRODUCT_CARDS;

  const limit =
    Math.min(
      Math.max(
        requestedLimit,
        1
      ),
      MAX_PRODUCT_CARDS
    );

  const normalized =
    deduplicateResponseProducts(
      normalizeResponseProducts(
        Array.isArray(products)
          ? products
          : []
      )
    )
      .filter(
        (product: any) =>
          Boolean(
            product?.name &&
            product.name !== "Product"
          )
      )
      .slice(
        0,
        limit
      );

  return normalized.map(
    (product: any, index: number) => ({
      ...product,

      itemNumber: index + 1,
      displayName: displayBaseName(product),
      displayPrice: displayPrice(product),
      displayCollection: displayCollectionHint(product),
      displayAvailability: displayAvailabilityLabel(product),
    })
  );
}


// =====================================================
// PRODUCT RESPONSE
// =====================================================

function buildProductResponse(products: any[], userMessage: string, metadata?: any) {
  const originalProducts = Array.isArray(products) ? products : [];
  const intent = detectResponseProductIntent(userMessage);
  const priceFilteredProducts = filterProductsByRequestedPrice(originalProducts, userMessage, metadata?.analysis);
  const normalized = deduplicateResponseProducts(normalizeResponseProducts(priceFilteredProducts));
  const cards = buildProductCards(normalized, MAX_PRODUCT_CARDS);
  const catalogUrl = findCatalogUrl(originalProducts, metadata);
  const collection = findCollection(originalProducts, userMessage);
  const requestedRange = extractRequestedPriceRange(userMessage);
  const hasBudget = requestedRange.explicit || Boolean(metadata?.analysis?.hasPriceRange);

  const productLabel = (product: any): string => {
    const name = displayBaseName(product);
    const price = displayPrice(product);
    const stock = displayAvailabilityLabel(product);
    return [
      name,
      price ? `(${price})` : "",
      stock ? `\u2014 ${stock}` : "",
    ].filter(Boolean).join(" ");
  };

  // STEP 1: exact verified match
  const exact = findExactProduct(priceFilteredProducts, userMessage);
  if (exact) {
    const card = buildProductCards([exact], 1)[0];
    if (card) {
      const details = [
        card.displayPrice ? `It is priced at ${card.displayPrice}.` : "",
        card.displayAvailability === "In stock"
          ? "It is currently in stock."
          : card.displayAvailability === "Out of stock"
            ? "It is currently out of stock."
            : "",
      ].filter(Boolean).join(" ");
      return {
        text: `Yes, we have the ${card.displayName}.` + (details ? ` ${details}` : ""),
        products: [card],
        catalogUrl: "",
        collectionUrl: "",
      };
    }
  }

  // empty catalog
  if (cards.length === 0 && normalized.length === 0) {
    return {
      text: "I couldn't find any products in the store catalog right now.",
      products: [],
      catalogUrl: intent === "catalog" ? catalogUrl : "",
      collectionUrl: "",
    };
  }

  // recommendation
  if (intent === "recommendation") {
    const available = normalized.filter((product: any) => product.available === true);
    const elsewhere = normalized.filter((product: any) => product.available !== true);
    const recommended = buildProductCards([...available, ...elsewhere], MAX_PRODUCT_CARDS);
    if (recommended.length === 0) {
      return {
        text: "I couldn't find any products in the store catalog right now. Please check back in a moment or ask about a specific product.",
        products: [],
        catalogUrl,
        collectionUrl: "",
      };
    }
    return {
      text:
        "Here are a few products I'd suggest:\n\n" +
        recommended.map((product: any) => `${product.itemNumber}. ${productLabel(product)}`).join("\n") +
        "\n\nWant me to tell you more about any of these, or compare a couple?",
      products: recommended,
      catalogUrl,
      collectionUrl: "",
    };
  }

  // catalog
  if (intent === "catalog") {
    return {
      text:
        cards.length === 1
          ? productLabel(cards[0])
          : "Here are a few options from the catalog. Take a look and let me know what you'd like to explore.",
      products: cards,
      catalogUrl,
      collectionUrl: "",
    };
  }

  // collection
  if (intent === "collection") {
    const selected = searchAndRankProducts(priceFilteredProducts, userMessage, MAX_PRODUCT_CARDS, { minScore: 22 });
    const selectedCards = buildProductCards(selected, MAX_PRODUCT_CARDS);
    if (selectedCards.length === 0) {
      return {
        text: "I couldn't find products matching that category or style just yet.",
        products: [],
        catalogUrl: "",
        collectionUrl: collection?.url || "",
      };
    }
    return {
      text: selectedCards.length === 1 ? productLabel(selectedCards[0]) : "A few options in that category are below.",
      products: selectedCards,
      catalogUrl: "",
      collectionUrl: collection?.url || "",
    };
  }

  // product search with broad intelligence
  if (intent === "product" || intent === "general") {
    const ranked = searchAndRankProducts(priceFilteredProducts, userMessage, MAX_PRODUCT_CARDS, { minScore: 20 });
    const strongCards = buildProductCards(ranked, MAX_PRODUCT_CARDS);
    let broadCards: any[] = [];
    let broadText = "";
    if (strongCards.length === 0) {
      const broadResults = searchAndRankProducts(
        priceFilteredProducts,
        broadenedSearchQuery(userMessage),
        MAX_PRODUCT_CARDS,
        { minScore: 12 }
      );
      broadCards = buildProductCards(broadResults, MAX_PRODUCT_CARDS);
      if (broadCards.length > 0) {
        broadText = "I couldn't find an exact match, but I found a few similar options in the catalog.";
      }
    }
    const resultCards = strongCards.length > 0 ? strongCards : broadCards;
    if (resultCards.length === 0) {
      const fallbackText = hasBudget
        ? "I couldn't find products matching those requirements within the requested price range."
        : "I couldn't find a product that matches those requirements in the catalog.";
      return {
        text: fallbackText + "\n\nWould you like me to check similar colors or styles instead?",
        products: [],
        catalogUrl: "",
        collectionUrl: collection?.url || "",
      };
    }
    const productCount = resultCards.length;
    const leading = broadText || (productCount === 1 ? "" : "Here are a few options that match what you're looking for.");
    let text = "";
    if (productCount === 1) {
      text = productLabel(resultCards[0]);
    } else {
      const lines = resultCards.map((product: any) => `${product.itemNumber}. ${productLabel(product)}`).join("\n");
      text = [leading, lines].filter(Boolean).join("\n\n");
    }
    return { text, products: resultCards, catalogUrl: "", collectionUrl: collection?.url || "" };
  }

  return {
    text: "Here are a few options I have for you.",
    products: cards,
    catalogUrl,
    collectionUrl: "",
  };
}

function broadenedSearchQuery(message: string): string {
  const text = String(message || "").toLowerCase().replace(/[!?.,;:]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "products";
  const dropWords = [
    "please","pls","kindly","can","could","would","do","does","did","you","your","have","has","had","got",
    "show","me","find","looking","look","for","want","need","get","buy","see","sell","available","items",
    "product","products","any","some","what","which","is","are","about","tell","recommend","recommendation",
  ];
  const kept = text.split(" ").filter((word) => word.length >= 2 && !dropWords.includes(word));
  const result = Array.from(new Set(kept)).join(" ");
  return result || "products";
}












