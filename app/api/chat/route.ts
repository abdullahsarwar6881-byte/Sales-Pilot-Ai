import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createEmbedding } from "@/lib/ai/embeddings";
import { chatWithAI } from "@/lib/ai/chat";

import { detectAction } from "@/lib/actions/detectAction";
import { executeAction } from "@/lib/actions/actionRouter";

import {
  BILLING_PLANS,
  type BillingPlanId,
} from "@/lib/billing/plans";

// =====================================================
// SUPABASE ADMIN CLIENT
// =====================================================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// BILLING ACCESS CHECK
// =====================================================
//
// This runs only when a NEW conversation needs to be
// created.
//
// Existing conversations are allowed to continue even
// when the merchant has reached the conversation limit.
//
// =====================================================

async function checkBillingAccess(profileId: string) {
  const now = new Date();

  // -----------------------------------------------------
  // GET SUBSCRIPTION
  // -----------------------------------------------------

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
    };
  }

  // -----------------------------------------------------
  // NO SUBSCRIPTION
  // -----------------------------------------------------
  //
  // We do NOT create subscriptions from the public
  // customer chat endpoint.
  //
  // A subscription should already exist from the
  // authenticated merchant account creation flow.
  //
  // This prevents an anonymous website visitor from
  // creating billing records.
  //
  // -----------------------------------------------------

  if (!subscription) {
    console.error(
      "NO BILLING SUBSCRIPTION FOR PROFILE:",
      profileId
    );

    return {
      allowed: false,
      error:
        "This Sales Pilot account does not have an active billing subscription.",
    };
  }

  // -----------------------------------------------------
  // PLAN
  // -----------------------------------------------------

  const planId: BillingPlanId =
    subscription.plan_id &&
    subscription.plan_id in BILLING_PLANS
      ? (subscription.plan_id as BillingPlanId)
      : "starter";

  const plan = BILLING_PLANS[planId];

  // -----------------------------------------------------
  // BILLING PERIOD
  // -----------------------------------------------------

  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start)
    : null;

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  // -----------------------------------------------------
  // INVALID BILLING PERIOD
  // -----------------------------------------------------

  if (!periodStart || !periodEnd) {
    console.error(
      "INVALID BILLING PERIOD:",
      subscription
    );

    return {
      allowed: false,
      error:
        "Your Sales Pilot billing period is not configured correctly.",
    };
  }

  // -----------------------------------------------------
  // BILLING PERIOD EXPIRED
  // -----------------------------------------------------

  if (now >= periodEnd) {
    return {
      allowed: false,

      error:
        "Your Sales Pilot billing period has ended. Please upgrade or renew your plan.",

      code: "BILLING_PERIOD_EXPIRED",

      planId,

      planName: plan.name,

      used: 0,

      limit: plan.conversations,
    };
  }

  // -----------------------------------------------------
  // SUBSCRIPTION STATUS
  // -----------------------------------------------------

  const status =
    String(subscription.status || "")
      .toLowerCase()
      .trim();

  /*
   * Active:
   *      Normal paid subscription.
   *
   * Trialing:
   *      Development/free trial.
   *
   * Past due:
   *      We allow access until current_period_end.
   *      Later we can introduce a grace period.
   *
   * Canceled:
   *      The merchant can continue using the service
   *      until current_period_end.
   *
   * Incomplete:
   *      Payment/subscription setup wasn't completed.
   */

  if (status === "incomplete") {
    return {
      allowed: false,

      error:
        "Your Sales Pilot subscription setup is incomplete. Please complete billing to continue.",

      code: "SUBSCRIPTION_INCOMPLETE",

      planId,

      planName: plan.name,

      used: 0,

      limit: plan.conversations,
    };
  }

  // -----------------------------------------------------
  // COUNT REAL CONVERSATIONS
  // -----------------------------------------------------
  //
  // conversations.user_id is the merchant/user ID.
  //
  // created_at allows us to count only conversations
  // from the current billing period.
  //
  // -----------------------------------------------------

  const {
    count: conversationCount,
    error: conversationCountError,
  } = await supabaseAdmin
    .from("conversations")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", profileId)
    .gte(
      "created_at",
      periodStart.toISOString()
    )
    .lt(
      "created_at",
      periodEnd.toISOString()
    );

  if (conversationCountError) {
    console.error(
      "BILLING CONVERSATION COUNT ERROR:",
      conversationCountError
    );

    return {
      allowed: false,

      error:
        "Unable to verify conversation usage.",
    };
  }

  const used =
    conversationCount ?? 0;

  const limit =
    plan.conversations;

  // -----------------------------------------------------
  // LIMIT REACHED
  // -----------------------------------------------------

  if (used >= limit) {
    return {
      allowed: false,

      error:
        `Your ${plan.name} plan has reached its limit of ${limit.toLocaleString()} AI conversations for this billing period. Please upgrade your plan to continue.`,

      code: "CONVERSATION_LIMIT_REACHED",

      planId,

      planName: plan.name,

      used,

      limit,
    };
  }

  // -----------------------------------------------------
  // ALLOWED
  // -----------------------------------------------------

  return {
    allowed: true,

    planId,

    planName: plan.name,

    used,

    limit,

    remaining:
      limit - used,
  };
}

// =====================================================
// FAST RESPONSE
// =====================================================

function getFastResponse(message: string) {
  const text = message
    .toLowerCase()
    .trim()
    .replace(/[!?.,]/g, "")
    .replace(/\s+/g, " ");

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

  if (greetings.includes(text)) {
    return "Hi! 👋 How can I help you today?";
  }

  const thanks = [
    "thanks",
    "thank you",
    "thanks a lot",
    "thankyou",
    "thx",
  ];

  if (thanks.includes(text)) {
    return "You're welcome! 😊";
  }

  const goodbye = [
    "bye",
    "goodbye",
    "see you",
    "see you later",
  ];

  if (goodbye.includes(text)) {
    return "Goodbye! 👋 Have a great day!";
  }

  if (
    [
      "how are you",
      "how are you doing",
      "how r u",
    ].includes(text)
  ) {
    return "I'm doing great! 😊 How can I help you today?";
  }

  return null;
}

// =====================================================
// DETECT INTENT
// =====================================================

function detectIntent(question: string) {
  const text = question.toLowerCase();

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
    ].some((word) => text.includes(word))
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
    ].some((word) => text.includes(word))
  ) {
    return "product";
  }

  return "general";
}

// =====================================================
// BUILD KNOWLEDGE CONTEXT
// =====================================================

function buildContext(matches: any[]) {
  if (
    !matches ||
    matches.length === 0
  ) {
    return "";
  }

  return matches
    .slice(0, 3)
    .map((item, index) => {
      const title = String(
        item.page_title ||
          item.title ||
          ""
      ).slice(0, 150);

      const sourceUrl = String(
        item.source_url ||
          item.page_url ||
          item.url ||
          ""
      ).slice(0, 500);

      const content = String(
        item.content || ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 800);

      return `
RESULT ${index + 1}

TITLE:
${title}

URL:
${sourceUrl}

CONTENT:
${content}
`;
    })
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
    .slice(-4)
    .map((item) => {
      const sender =
        item.sender === "customer"
          ? "Customer"
          : "AI";

      const content = String(
        item.content || ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);

      return `${sender}: ${content}`;
    })
    .join("\n");
}

// =====================================================
// GET RECENT CONVERSATION
// =====================================================

async function getConversationHistory(
  conversationId: string
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("conversation_messages")
    .select(
      "sender, content, created_at"
    )
    .eq(
      "conversation_id",
      conversationId
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(6);

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
// REPLACE AI PRODUCT URL PLACEHOLDER
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
    matches.find((item: any) => {
      const title = String(
        item.page_title ||
          item.title ||
          ""
      ).toLowerCase();

      return (
        title &&
        question.includes(title)
      );
    });

  if (!selected) {
    selected = matches.find(
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
// CHAT API
// =====================================================

export async function POST(
  req: Request
) {
  const requestStartedAt =
    Date.now();

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
    } = body;

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

    // =================================================
    // VALIDATION
    // =================================================

    if (
      !message ||
      typeof message !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Message required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !profileId ||
      typeof profileId !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Profile missing",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // FIND EXISTING CONVERSATION
    // =================================================
    //
    // We check this BEFORE billing.
    //
    // Existing conversations are allowed to continue
    // even after the merchant reaches their monthly
    // conversation limit.
    //
    // Only NEW conversations consume a conversation slot.
    //
    // =================================================

    let conversation:
      | any
      | null = null;

    if (visitorSessionId) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("conversations")
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

      conversation = data;
    }

   // =================================================
// BILLING CHECK
// =================================================
//
// TEMPORARILY DISABLED FOR DEVELOPMENT / DEMO.
//
// Sales Pilot currently allows conversations without
// requiring an active billing subscription.
//
// Billing code remains in this file and can be enabled
// later when Stripe/payment functionality is ready.
//

if (!conversation) {
  console.log(
    "NEW CONVERSATION - BILLING CHECK SKIPPED (DEMO MODE)"
  );
}

    // =================================================
    // CREATE CONVERSATION
    // =================================================

    if (!conversation) {
      console.log(
        "CREATING CONVERSATION"
      );

      const session =
        visitorSessionId ||
        crypto.randomUUID();

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("conversations")
        .insert({
          profile_id:
            profileId,

          /*
           * IMPORTANT:
           *
           * Your billing system counts conversations
           * using user_id.
           *
           * Previously this field was missing, which
           * caused Billing to show 0 conversations.
           */
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
        throw error;
      }

      conversation = data;
    }

    // =================================================
    // SAVE CUSTOMER MESSAGE
    // =================================================

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
            message,
        });

    if (customerMessageError) {
      console.error(
        "CUSTOMER MESSAGE ERROR:",
        customerMessageError
      );
    }

    // =================================================
    // FAST RESPONSE
    // =================================================
    //
    // IMPORTANT:
    // Fast responses happen AFTER the conversation has
    // been created and counted.
    //
    // Therefore:
    //
    // "Hi"
    //
    // can correctly start a billable conversation.
    //
    // =================================================

    const fastResponse =
      getFastResponse(message);

    if (fastResponse) {
      console.log(
        "FAST RESPONSE:",
        fastResponse
      );

      // Save the fast AI response too.

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

      if (fastMessageError) {
        console.error(
          "FAST AI MESSAGE ERROR:",
          fastMessageError
        );
      }

      console.log(
        `FAST RESPONSE TIME: ${
          Date.now() -
          requestStartedAt
        }ms`
      );

      return NextResponse.json({
        success: true,

        response:
          fastResponse,

        visitorSessionId:
          conversation.visitor_session_id,

        intent: "general",

        matches: 0,

        action: null,

        actionExecuted: false,
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

    let actionRequest =
      detectAction(message);

    if (actionRequest) {
      actionRequest = {
        ...actionRequest,

        parameters: {
          ...actionRequest.parameters,

          userId:
            profileId,

          profileId:
            profileId,
        },
      };
    }

    // =================================================
    // ACTION
    // =================================================

    if (actionRequest) {
      console.log(
        "================================="
      );

      console.log(
        "ACTION DETECTED:",
        actionRequest.action
      );

      console.log(
        "================================="
      );

      const actionStartedAt =
        Date.now();

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

      let actionResponse =
        "";

      if (
        !actionResult.success
      ) {
        actionResponse =
          actionResult.error ||
          "I'm unable to complete that request right now.";
      } else {
        switch (
          actionRequest.action
        ) {
          case "search_products": {
            const products =
              (
                actionResult as any
              )?.data
                ?.products ||
              [];

            actionResponse =
              formatProductResults(
                products
              );

            break;
          }

          case "handoff_to_human": {
            actionResponse =
              "Absolutely. I'll connect you with a member of our support team.";

            break;
          }

          case "get_order_status": {
            actionResponse =
              "I found your order information.";

            break;
          }

          case "get_order_details": {
            actionResponse =
              "I found your order details.";

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

      console.log(
        `TOTAL ACTION REQUEST TIME: ${
          Date.now() -
          requestStartedAt
        }ms`
      );

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
      });
    }

    // =================================================
    // CONVERSATION HISTORY
    // =================================================

    const historyStartedAt =
      Date.now();

    const conversationHistory =
      await getConversationHistory(
        conversation.id
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

    // =================================================
    // CREATE QUERY EMBEDDING
    // =================================================

    const embeddingStartedAt =
      Date.now();

    const embedding =
      await createEmbedding(
        message
      );

    console.log(
      "EMBEDDING CREATED"
    );

    console.log(
      `EMBEDDING TIME: ${
        Date.now() -
        embeddingStartedAt
      }ms`
    );

    // =================================================
    // DETECT INTENT
    // =================================================

    const intent =
      detectIntent(message);

    console.log(
      "INTENT:",
      intent
    );

    // =================================================
    // USER-SCOPED KNOWLEDGE SEARCH
    // =================================================

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
            3,

          filter_user_id:
            profileId,
        }
      );

    if (searchError) {
      console.error(
        "KNOWLEDGE SEARCH ERROR:",
        searchError
      );

      throw searchError;
    }

    const knowledgeMatches =
      matches || [];

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

    // =================================================
    // BUILD CONTEXT
    // =================================================

    const knowledgeContext =
      buildContext(
        knowledgeMatches
      );

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

    let aiResponse =
      "";

    const aiStartedAt =
      Date.now();

    if (
      !knowledgeContext.trim() &&
      historyContext.trim()
    ) {
      aiResponse =
        await chatWithAI(
          message,
          finalContext
        );
    } else if (
      !knowledgeContext.trim() &&
      !historyContext.trim()
    ) {
      aiResponse =
        "I couldn't find that information in this store's knowledge base.";
    } else {
      aiResponse =
        await chatWithAI(
          message,
          finalContext
        );
    }

    console.log(
      `AI TIME: ${
        Date.now() -
        aiStartedAt
      }ms`
    );

    // =================================================
    // CLEAN RESPONSE
    // =================================================

    aiResponse =
      String(
        aiResponse || ""
      )
        .trim();

    if (!aiResponse) {
      aiResponse =
        "I'm sorry, I couldn't generate a response.";
    }

    // =================================================
    // PRODUCT URL
    // =================================================

    aiResponse =
      addProductUrl(
        aiResponse,
        knowledgeMatches,
        message
      );

    aiResponse =
      aiResponse.replace(
        /\[Product URL\]/gi,
        ""
      );

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

    if (aiMessageError) {
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
      `TOTAL CHAT TIME: ${totalTime}ms`
    );

    console.log(
      "================================="
    );

    return NextResponse.json({
      success: true,

      response:
        aiResponse,

      visitorSessionId:
        conversation
          .visitor_session_id,

      intent,

      matches:
        knowledgeMatches.length,

      action:
        null,

      actionExecuted:
        false,
    });
  } catch (error: any) {
    console.error(
      "================================="
    );

    console.error(
      "CHAT API ERROR:",
      error
    );

    console.error(
      "================================="
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Server error",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// PRODUCT HELPERS
// =====================================================

function cleanProductDescription(
  description: string,
  productName: string
) {
  if (!description) {
    return "";
  }

  let clean =
    String(description);

  clean = clean.replace(
    /https?:\/\/\S+/gi,
    ""
  );

  clean = clean.replace(
    /[•▪●]/g,
    ""
  );

  clean = clean.replace(
    /\bSales Pilot\b/gi,
    ""
  );

  clean = clean.replace(
    /\bAI Sales & Customer Support Employee\b/gi,
    ""
  );

  clean = clean.replace(
    /\bAI Customer Support\b/gi,
    ""
  );

  clean = clean.replace(
    /\bAcme Store\b/gi,
    ""
  );

  clean = clean.replace(
    /\bTest website for Sales Pilot AI\b/gi,
    ""
  );

  clean = clean.replace(
    /\bSales Pilot Widget Test\b/gi,
    ""
  );

  clean = clean.replace(
    /\bShipping & Returns\b[\s\S]*$/i,
    ""
  );

  clean = clean.replace(
    /\bKnowledge Base\b[\s\S]*$/i,
    ""
  );

  if (productName) {
    const escapedName =
      productName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    clean = clean.replace(
      new RegExp(
        escapedName,
        "gi"
      ),
      ""
    );
  }

  clean = clean.replace(
    /\b(price|sku|url|product url|view product)\s*:\s*[^\n]*/gi,
    ""
  );

  clean =
    clean
      .replace(/\s+/g, " ")
      .trim();

  clean = clean.replace(
    /^[,.:;!?-]+\s*/,
    ""
  );

  const MAX_LENGTH =
    140;

  if (
    clean.length >
    MAX_LENGTH
  ) {
    clean =
      clean
        .slice(
          0,
          MAX_LENGTH
        )
        .trim();

    const lastSpace =
      clean.lastIndexOf(
        " "
      );

    if (
      lastSpace > 80
    ) {
      clean =
        clean.slice(
          0,
          lastSpace
        );
    }

    clean += "...";
  }

  return clean;
}

// =====================================================
// PRODUCT NAME
// =====================================================

function cleanProductName(
  name: string
) {
  if (!name) {
    return "this product";
  }

  return String(name)
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// PRODUCT PRICE
// =====================================================

function cleanProductPrice(
  price: unknown
) {
  if (
    price === null ||
    price === undefined
  ) {
    return "";
  }

  return String(price)
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// PRODUCT URL
// =====================================================

function cleanProductUrl(
  product: any
) {
  const url =
    product?.url ||
    product?.page_url ||
    product?.product_url ||
    "";

  if (!url) {
    return "";
  }

  return String(url).trim();
}

// =====================================================
// FORMAT SINGLE PRODUCT
// =====================================================

function formatSingleProduct(
  product: any
) {
  const name =
    cleanProductName(
      product?.name ||
        product?.title ||
        ""
    );

  const description =
    cleanProductDescription(
      product?.description ||
        "",
      name
    );

  const price =
    cleanProductPrice(
      product?.price
    );

  const url =
    cleanProductUrl(
      product
    );

  let response =
    `We have the ${name}`;

  if (description) {
    response +=
      ` — ${description}`;
  }

  response += ".";

  if (price) {
    response +=
      ` It's ${price}.`;
  }

  if (url) {
    response +=
      `\n🔗 View product: ${url}`;
  }

  return response;
}

// =====================================================
// FORMAT PRODUCT RESULTS
// =====================================================

function formatProductResults(
  products: any[]
) {
  if (
    !products ||
    products.length === 0
  ) {
    return "I couldn't find a matching product. What type of product are you looking for?";
  }

  const selectedProducts =
    products
      .filter(
        (product) =>
          product &&
          (product.name ||
            product.title)
      )
      .slice(0, 3);

  if (
    selectedProducts.length ===
    0
  ) {
    return "I couldn't find a matching product.";
  }

  if (
    selectedProducts.length ===
    1
  ) {
    return formatSingleProduct(
      selectedProducts[0]
    );
  }

  const formatted =
    selectedProducts.map(
      (product: any) =>
        formatSingleProduct(
          product
        )
    );

  return (
    "Here are a few options:\n\n" +
    formatted.join(
      "\n\n"
    )
  );
}