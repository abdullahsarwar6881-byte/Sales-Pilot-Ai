import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createEmbedding } from "@/lib/ai/embeddings";
import { chatWithAI } from "@/lib/ai/chat";

import { detectAction } from "@/lib/actions/detectAction";
import { executeAction } from "@/lib/actions/actionRouter";

// =====================================================
// SUPABASE ADMIN CLIENT
// =====================================================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// DETECT INTENT
// =====================================================

function detectIntent(question: string) {
  const text = question.toLowerCase();

  // ---------------------------------------------------
  // POLICY
  // ---------------------------------------------------

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
    ].some((word) =>
      text.includes(word)
    )
  ) {
    return "policy";
  }

  // ---------------------------------------------------
  // PRODUCT
  // ---------------------------------------------------

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
    ].some((word) =>
      text.includes(word)
    )
  ) {
    return "product";
  }

  // ---------------------------------------------------
  // GENERAL
  // ---------------------------------------------------

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
    .map(
      (item, index) => `
==============================
KNOWLEDGE RESULT ${index + 1}
==============================

Title:
${item.page_title || item.title || ""}

Source URL:
${item.source_url || item.page_url || item.url || ""}

IMPORTANT:
Use the exact Source URL when a customer asks where
to view a product.

Never invent a URL.
Never write "[Product URL]".

Content:
${item.content || ""}
`
    )
    .join("\n\n");
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
    .map((item) => {
      const sender =
        item.sender === "customer"
          ? "Customer"
          : "AI";

      return `${sender}: ${
        item.content || ""
      }`;
    })
    .join("\n");
}

// =====================================================
// CLEAN PRODUCT DESCRIPTION
// =====================================================

function cleanProductDescription(
  description: string,
  productName: string
) {
  if (
    !description
  ) {
    return "";
  }

  let clean =
    String(description);

  // ---------------------------------------------------
  // REMOVE URLS
  // ---------------------------------------------------

  clean =
    clean.replace(
      /https?:\/\/\S+/gi,
      ""
    );

  // ---------------------------------------------------
  // REMOVE MARKDOWN / BULLET SYMBOLS
  // ---------------------------------------------------

  clean =
    clean.replace(
      /[•▪●]/g,
      ""
    );

  // ---------------------------------------------------
  // REMOVE COMMON WEBSITE NOISE
  // ---------------------------------------------------

  clean =
    clean.replace(
      /\bSales Pilot\b/gi,
      ""
    );

  clean =
    clean.replace(
      /\bAI Sales & Customer Support Employee\b/gi,
      ""
    );

  clean =
    clean.replace(
      /\bAI Customer Support\b/gi,
      ""
    );

  clean =
    clean.replace(
      /\bAcme Store\b/gi,
      ""
    );

  clean =
    clean.replace(
      /\bTest website for Sales Pilot AI\b/gi,
      ""
    );

  clean =
    clean.replace(
      /\bSales Pilot Widget Test\b/gi,
      ""
    );

  clean =
    clean.replace(
      /\bShipping & Returns\b[\s\S]*$/i,
      ""
    );

  clean =
    clean.replace(
      /\bKnowledge Base\b[\s\S]*$/i,
      ""
    );

  // ---------------------------------------------------
  // REMOVE PRODUCT NAME FROM DESCRIPTION
  // ---------------------------------------------------

  if (
    productName
  ) {
    const escapedName =
      productName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    clean =
      clean.replace(
        new RegExp(
          escapedName,
          "gi"
        ),
        ""
      );
  }

  // ---------------------------------------------------
  // REMOVE COMMON LABELS
  // ---------------------------------------------------

  clean =
    clean.replace(
      /\b(price|sku|url|product url|view product)\s*:\s*[^\n]*/gi,
      ""
    );

  // ---------------------------------------------------
  // NORMALIZE WHITESPACE
  // ---------------------------------------------------

  clean =
    clean.replace(
      /\s+/g,
      " "
    ).trim();

  // ---------------------------------------------------
  // REMOVE LEADING PUNCTUATION
  // ---------------------------------------------------

  clean =
    clean.replace(
      /^[,.:;!?-]+\s*/,
      ""
    );

  // ---------------------------------------------------
  // LIMIT DESCRIPTION
  // ---------------------------------------------------

  const MAX_LENGTH = 140;

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
// CLEAN PRODUCT NAME
// =====================================================

function cleanProductName(
  name: string
) {
  if (
    !name
  ) {
    return "this product";
  }

  return String(name)
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

// =====================================================
// CLEAN PRODUCT PRICE
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

  const value =
    String(price)
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (
    !value
  ) {
    return "";
  }

  return value;
}

// =====================================================
// CLEAN PRODUCT URL
// =====================================================

function cleanProductUrl(
  product: any
) {
  const url =
    product?.url ||
    product?.page_url ||
    product?.product_url ||
    "";

  if (
    !url
  ) {
    return "";
  }

  return String(url)
    .trim();
}

// =====================================================
// FORMAT ONE PRODUCT
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

  // ---------------------------------------------------
  // NATURAL RESPONSE
  // ---------------------------------------------------

  let response =
    `We have the ${name}`;

  if (
    description
  ) {
    response +=
      ` — ${description}`;
  }

  response += ".";

  if (
    price
  ) {
    response +=
      ` It's ${price}.`;
  }

  if (
    url
  ) {
    response +=
      `\n🔗 View product: ${url}`;
  }

  return response;
}

// =====================================================
// FORMAT PRODUCT RESULTS NATURALLY
// =====================================================

function formatProductResults(
  products: any[]
) {
  if (
    !products ||
    products.length === 0
  ) {
    return (
      "I couldn't find a matching product. What type of product are you looking for?"
    );
  }

  // ---------------------------------------------------
  // ONLY SHOW TOP 3
  // ---------------------------------------------------

  const selectedProducts =
    products
      .filter(
        (product) =>
          product &&
          (
            product.name ||
            product.title
          )
      )
      .slice(0, 3);

  if (
    selectedProducts.length ===
    0
  ) {
    return (
      "I couldn't find a matching product."
    );
  }

  // ---------------------------------------------------
  // ONE PRODUCT
  // ---------------------------------------------------

  if (
    selectedProducts.length ===
    1
  ) {
    return formatSingleProduct(
      selectedProducts[0]
    );
  }

  // ---------------------------------------------------
  // MULTIPLE PRODUCTS
  // ---------------------------------------------------

  const formatted =
    selectedProducts.map(
      (
        product: any
      ) => {
        return formatSingleProduct(
          product
        );
      }
    );

  return (
    "Here are a few options:\n\n" +
    formatted.join(
      "\n\n"
    )
  );
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
  } =
    await supabaseAdmin
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
      .limit(12);

  if (
    error
  ) {
    console.error(
      "CONVERSATION HISTORY ERROR:",
      error
    );

    return [];
  }

  if (
    !data
  ) {
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

  // ---------------------------------------------------
  // ONLY DO THIS IF THE AI USED THE PLACEHOLDER
  // ---------------------------------------------------

  if (
    !response.match(
      /\[Product URL\]/i
    )
  ) {
    return response;
  }

  const question =
    userMessage.toLowerCase();

  // ---------------------------------------------------
  // TRY TO FIND THE MOST RELEVANT PRODUCT
  // ---------------------------------------------------

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

  // ---------------------------------------------------
  // FALLBACK TO FIRST SOURCE
  // ---------------------------------------------------

  if (
    !selected
  ) {
    selected =
      matches.find(
        (item: any) =>
          item.source_url ||
          item.page_url ||
          item.url
      );
  }

  if (
    !selected
  ) {
    return response;
  }

  const productUrl =
    selected.source_url ||
    selected.page_url ||
    selected.url ||
    "";

  if (
    !productUrl
  ) {
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
      typeof message !==
        "string"
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
      typeof profileId !==
        "string"
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
          .select("*")
          .eq(
            "visitor_session_id",
            visitorSessionId
          )
          .eq(
            "profile_id",
            profileId
          )
          .maybeSingle();

      if (
        error
      ) {
        console.error(
          "CONVERSATION LOOKUP ERROR:",
          error
        );
      }

      conversation =
        data;
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
          .select()
          .single();

      if (
        error
      ) {
        throw error;
      }

      conversation =
        data;
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

    if (
      customerMessageError
    ) {
      console.error(
        "CUSTOMER MESSAGE ERROR:",
        customerMessageError
      );
    }

    // =================================================
    // GET CONVERSATION HISTORY
    // =================================================

    const conversationHistory =
      await getConversationHistory(
        conversation.id
      );

    console.log(
      "CONVERSATION HISTORY:",
      conversationHistory.length
    );

    const historyContext =
      buildConversationHistory(
        conversationHistory
      );

    // =================================================
    // ACTION SYSTEM
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
      detectAction(
        message
      );

    // =================================================
    // ADD PROFILE ID TO ACTION
    // =================================================

    if (
      actionRequest
    ) {
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
    // ACTION DETECTED
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
        "PARAMETERS:",
        actionRequest.parameters
      );

      console.log(
        "================================="
      );

      const actionResult =
        await executeAction(
          actionRequest.action,
          actionRequest.parameters
        );

      console.log(
        "ACTION RESULT:",
        actionResult
      );

      let actionResponse =
        "";

      // =================================================
      // ACTION FAILED
      // =================================================

      if (
        !actionResult.success
      ) {
        actionResponse =
          actionResult.error ||
          "I'm unable to complete that request right now.";
      }

      // =================================================
      // ACTION SUCCESS
      // =================================================

      else {
        switch (
          actionRequest.action
        ) {
          // ---------------------------------------------
          // SEARCH PRODUCTS
          // ---------------------------------------------

          case "search_products": {
            const products =
              (
                actionResult as any
              )?.data?.products ||
              [];

            console.log(
              "PRODUCTS RETURNED:",
              products.length
            );

            actionResponse =
              formatProductResults(
                products
              );

            break;
          }

          // ---------------------------------------------
          // HUMAN HANDOFF
          // ---------------------------------------------

          case "handoff_to_human": {
            actionResponse =
              "Absolutely. I'll connect you with a member of our support team.";

            break;
          }

          // ---------------------------------------------
          // ORDER STATUS
          // ---------------------------------------------

          case "get_order_status": {
            actionResponse =
              "I found your order information.";

            break;
          }

          // ---------------------------------------------
          // ORDER DETAILS
          // ---------------------------------------------

          case "get_order_details": {
            actionResponse =
              "I found your order details.";

            break;
          }

          // ---------------------------------------------
          // PRODUCT STOCK
          // ---------------------------------------------

          case "check_product_stock": {
            actionResponse =
              "I checked the product availability.";

            break;
          }

          // ---------------------------------------------
          // PRODUCT DETAILS
          // ---------------------------------------------

          case "get_product_details": {
            actionResponse =
              "I found the product details.";

            break;
          }

          // ---------------------------------------------
          // SHIPPING
          // ---------------------------------------------

          case "get_shipping_policy": {
            actionResponse =
              "I found the store's shipping information.";

            break;
          }

          // ---------------------------------------------
          // RETURN
          // ---------------------------------------------

          case "get_return_policy": {
            actionResponse =
              "I found the store's return information.";

            break;
          }

          // ---------------------------------------------
          // FALLBACK
          // ---------------------------------------------

          default: {
            actionResponse =
              "I found the requested information.";

            break;
          }
        }
      }

      // =================================================
      // SAVE ACTION RESPONSE
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
          "ACTION MESSAGE ERROR:",
          actionMessageError
        );
      }

      // =================================================
      // RETURN ACTION RESPONSE
      // =================================================

      return NextResponse.json({
        success:
          true,

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
    // NORMAL KNOWLEDGE CHAT
    // =================================================

    console.log(
      "================================="
    );

    console.log(
      "NO ACTION DETECTED"
    );

    console.log(
      "CONTINUING WITH KNOWLEDGE SEARCH"
    );

    console.log(
      "================================="
    );

    // =================================================
    // CREATE EMBEDDING
    // =================================================

    const embedding =
      await createEmbedding(
        message
      );

    console.log(
      "EMBEDDING CREATED"
    );

    // =================================================
    // DETECT INTENT
    // =================================================

    const intent =
      detectIntent(
        message
      );

    console.log(
      "INTENT:",
      intent
    );

    // =================================================
    // SEARCH KNOWLEDGE
    // =================================================

    const {
      data: matches,
      error:
        searchError,
    } =
      await supabaseAdmin.rpc(
        "match_knowledge_chunks",
        {
          query_embedding:
            embedding,

          match_count:
            10,
        }
      );

    if (
      searchError
    ) {
      console.error(
        "KNOWLEDGE SEARCH ERROR:",
        searchError
      );

      throw searchError;
    }

    const knowledgeMatches =
      matches || [];

    console.log(
      "KNOWLEDGE MATCHES:",
      knowledgeMatches.length
    );

    // =================================================
    // BUILD KNOWLEDGE CONTEXT
    // =================================================

    const knowledgeContext =
      buildContext(
        knowledgeMatches
      );

    // =================================================
    // COMBINE HISTORY + KNOWLEDGE
    // =================================================

    let finalContext =
      "";

    if (
      historyContext.trim()
    ) {
      finalContext += `
========================================
RECENT CONVERSATION
========================================

${historyContext}

`;
    }

    if (
      knowledgeContext.trim()
    ) {
      finalContext += `
========================================
STORE KNOWLEDGE
========================================

${knowledgeContext}

`;
    }

    // =================================================
    // GENERATE AI RESPONSE
    // =================================================

    let aiResponse =
      "";

    // =================================================
    // NO KNOWLEDGE BUT HISTORY
    // =================================================

    if (
      !knowledgeContext.trim() &&
      historyContext.trim()
    ) {
      try {
        aiResponse =
          await chatWithAI(
            message,
            finalContext
          );
      } catch (
        error
      ) {
        console.error(
          "AI HISTORY RESPONSE FAILED:",
          error
        );

        aiResponse =
          "I'm sorry, I couldn't find that information. Could you please clarify what you're asking about?";
      }
    }

    // =================================================
    // NO KNOWLEDGE + NO HISTORY
    // =================================================

    else if (
      !knowledgeContext.trim() &&
      !historyContext.trim()
    ) {
      aiResponse =
        "I couldn't find that information yet. Please contact the store for more details.";
    }

    // =================================================
    // KNOWLEDGE FOUND
    // =================================================

    else {
      try {
        aiResponse =
          await chatWithAI(
            message,
            finalContext
          );
      } catch (
        error
      ) {
        console.error(
          "AI FAILED:",
          error
        );

        aiResponse =
          "I'm sorry, I'm unable to answer right now. Please try again.";
      }
    }

    // =================================================
    // CLEAN AI RESPONSE
    // =================================================

    aiResponse =
      String(
        aiResponse || ""
      )
        .trim();

    if (
      !aiResponse
    ) {
      aiResponse =
        "I'm sorry, I couldn't generate a response.";
    }

    // =================================================
    // REPLACE PRODUCT URL PLACEHOLDER
    // =================================================

    aiResponse =
      addProductUrl(
        aiResponse,
        knowledgeMatches,
        message
      );

    // =================================================
    // REMOVE PLACEHOLDER IF URL WAS NOT FOUND
    // =================================================

    aiResponse =
      aiResponse.replace(
        /\[Product URL\]/gi,
        ""
      );

    // =================================================
    // CLEAN EXTRA SPACES
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
      "================================="
    );

    return NextResponse.json({
      success:
        true,

      response:
        aiResponse,

      visitorSessionId:
        conversation.visitor_session_id,

      intent,

      matches:
        knowledgeMatches.length,

      action:
        null,

      actionExecuted:
        false,
    });
  } catch (
    error: any
  ) {
    // =================================================
    // ERROR
    // =================================================

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
        success:
          false,

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