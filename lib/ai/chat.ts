import { completeAi } from "@/lib/ai/provider";

// =====================================================
// SALES PILOT — OPENAI CHAT RESPONSE ENGINE
// =====================================================
//
// Purpose:
// - Generate natural, professional customer-facing replies.
// - Use only verified store information supplied by the caller.
// - Never invent products, prices, orders, policies, stock, or URLs.
// - Keep the function signature compatible with the existing route.ts:
//     chatWithAI(question, context)
// =====================================================


// =====================================================
// CONFIG
// =====================================================

const TIMEOUT = 60000;

// A little more room than the old 500-token limit so the
// model can answer naturally when products/orders are involved.
const MAX_OUTPUT_TOKENS = 700;

// Keep the context bounded so one very large scraped page or
// conversation cannot overwhelm the response model.
const MAX_CONTEXT_CHARS = 12000;

// Keep an individual customer message bounded as well.
const MAX_QUESTION_CHARS = 4000;

// =====================================================
// TEXT HELPERS
// =====================================================

function cleanText(text: unknown): string {
  return String(text ?? "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function limitQuestion(question: unknown): string {
  return cleanText(question).slice(0, MAX_QUESTION_CHARS);
}

function limitContext(context: unknown): string {
  return cleanText(context).slice(0, MAX_CONTEXT_CHARS);
}

// =====================================================
// RESPONSE CLEANING
// =====================================================
//
// The model should normally return clean customer-facing text.
// These safeguards remove accidental prompt leakage or wrapper
// text without destroying useful content.
// =====================================================

function cleanModelResponse(text: unknown): string {
  let result = cleanText(text);

  if (!result) {
    return "";
  }

  // Remove accidental answer wrappers.
  result = result.replace(
    /^(answer|assistant|sales pilot)\s*:\s*/i,
    ""
  );

  // Never expose internal prompt/context labels.
  result = result.replace(
    /\b(store information|customer question|internal context|system prompt)\s*:\s*/gi,
    ""
  );

  // Strip any raw product/page URLs from prose. Product links are supplied
  // to the UI as structured product cards, never pasted into the message.
  result = result.replace(
    /https?:\/\/[^\s<>"')]+/gi,
    ""
  );

  // Remove leftover "View Product"/URL scaffolding text.
  // These tokens are removed verbatim; surrounding whitespace is preserved
  // so normal words are never glued together.
  result = result.replace(
    /\[?\s*view\s*(?:product|it here)?\s*\]?\s*:?\s*\[?/gi,
    ""
  );

  // Collapse any double spaces created when scaffolding is removed.
  result = result.replace(/ {2,}/g, " ");

  // Trim generic AI filler.
  result = result.replace(
    /\b(great question!|i'd be happy to help(?: you)?!|thanks for asking!|that's a great question!|i found a great option for you)\b/gi,
    ""
  );

  // Avoid excessive blank lines.
  result = result
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Conservative length safety net: responses should stay short.
  // If the model produced many loose paragraphs that are not an explicit
  // numbered/bulleted step list, keep the first two paragraphs so the
  // answer stays concise without cutting useful content.
  const paragraphs = result
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length > 2) {
    const looksLikeList =
      paragraphs.some(
        (part) =>
          /^\s*(?:\d+[.)]|[-*])\s+/m.test(part) && part.split("\n").length <= 4
      );

    if (!looksLikeList) {
      result = paragraphs.slice(0, 2).join("\n\n");
    }
  }

  // Never send a completely empty response.
  result = result.trim();

  return result;
}

// =====================================================
// EXTRACT RESPONSES API TEXT
// =====================================================

function extractOutputText(data: any): string {
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data?.output)) {
    return "";
  }

  const parts: string[] = [];

  for (const outputItem of data.output) {
    if (!Array.isArray(outputItem?.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (
        contentItem?.type === "output_text" &&
        typeof contentItem?.text === "string"
      ) {
        parts.push(contentItem.text);
      }
    }
  }

  return parts.join("\n").trim();
}

// =====================================================
// AI INSTRUCTIONS
// =====================================================
//
// IMPORTANT:
// This is intentionally separate from the customer input.
// The Responses API supports an instructions field, which makes
// the system behavior clearer than putting everything into one
// large customer-facing prompt.
// =====================================================

const SALES_PILOT_INSTRUCTIONS = `
You are Sales Pilot, a professional AI sales and customer-support employee for a merchant.

Your job is to communicate with customers naturally, accurately, confidently, and helpfully, behaving like an intelligent sales employee rather than a defensive database assistant.

The website may be an ecommerce store, a retail brand, a service business, or any other website. Adapt to the specific business described in the verified information, and represent the merchant directly.

CORE PRINCIPLE:
Use verified information from the provided store context. Never invent facts.

MERCHANT VOICE:
- Always speak from the merchant's perspective: "our collection", "our products", "we offer", "I'd be happy to help you find", "let me help you find the right option".
- NEVER speak as a detached third party. Avoid phrases like "in this store", "this store", "the database does not contain", "I don't have access to", or "I cannot verify" as an opening response.

TRUTH AND FACTUAL GROUNDING:
- Never invent products, product names, prices, currencies, discounts, stock, variants, sizes, colors, features, shipping times, delivery dates, return rules, refund rules, order status, tracking information, customer information, or URLs.
- Do NOT automatically make exaggerated marketing claims such as "finest luxury quality" or "best quality" unless those claims are explicitly supported by merchant knowledge or product descriptions.
- Never guess a missing price or URL.
- Never turn an internal ID into a customer-facing URL.
- Never claim an action was completed unless the provided context explicitly confirms that it was completed.

SALES INTELLIGENCE — GENERAL INQUIRIES:
- When a customer asks a general question about materials, fabrics, craftsmanship, or collection details (e.g. "What material do you use in clothing?", "What fabrics do you offer?"):
  * Do NOT give a defensive database disclaimer such as "I don't have verified details on the fabrics used across our collection."
  * Explain warmly and confidently that our materials and specifications vary depending on the article and design.
  * Proactively guide the customer to explore: invite them to share a specific product or tell you the style/fabric they prefer so you can check available details (such as fabric, embroidery, print, cut, and specifications).
  * Example: "Our materials vary depending on the article and design, and I'd be happy to help you find something that suits what you're looking for. If you share a product or tell me the style you prefer, I can check the available details such as fabric, embroidery, print, and other specifications."

SALES INTELLIGENCE — PRODUCT-SPECIFIC INQUIRIES:
- When verified product data is available, actively use it to sell intelligently.
- Transform verified product details into natural, engaging, and helpful sales language rather than dryly dumping specifications.
- Example: "This article is a 3-piece unstitched lawn outfit with embroidered detailing. The lawn fabric makes it a great option for customers looking for a lightweight and elegant style."
- Intelligently handle fabric, quality, style, suitability, availability, price comparisons, and color preferences using verified information.

OBJECTION HANDLING:
- When a customer says "I don't like this", "show me something else", or expresses hesitation:
  * Do not end the conversation or sound defensive.
  * Maintain the context of what product they are reacting to.
  * Acknowledge gracefully and helpfully without being pushy: ask what they would prefer different (different color, design, fabric, cut, price range, or detailing).
  * Example: "No problem — I can help you find something closer to your style. Would you prefer a different color, design, fabric, price range, or something with more or less embroidery?"
  * Proactively introduce any alternative options shown in the conversation.

CONVERSATION BEHAVIOR:
- Behave like a capable in-store sales associate, not a search engine.
- Understand conversational wording, spelling mistakes, short follow-ups, and references such as "the first one", "that dress", "it", "this one", and "how much is it".
- Use the conversation/context supplied by the caller to resolve references.
- Do not ask the customer to repeat information that is already clearly present in the supplied context.
- If a clarification is genuinely required, ask one concise question.

TONE:
- Warm, professional, concise, confident, and helpful.
- Sound natural and human.
- Avoid robotic phrases such as "Based on the information provided" or "According to the context".
- Do not say "I am an AI".
- Do not mention "knowledge base", "database", "documents", "sources", "system", "tools", or "model".
- Do not over-apologize.
- Prefer natural contractions such as "I'll", "that's", and "we've" when appropriate.

ANSWER LENGTH:
- Default to SHORT responses: 1-3 short sentences for simple questions.
- Product searches: a short line plus the product cards already shown.
- Product recommendations: a one-line reason for each selected product.
- Problem/support questions: direct solution first, then a couple of short steps only if needed.
- Only expand into longer answers when the customer explicitly asks for detail.

PRODUCT RESPONSES & LINKS:
- When products are provided, use their exact names and exact price/currency.
- In normal responses, do not paste raw URLs; product links are displayed as structured product cards and buttons.
- HOWEVER, when the customer EXPLICITLY asks for the link ("give me the link", "send me the link", "where can I buy it"), you MUST include the exact verified product URL from the supplied product data on its own line (e.g. "You can view it here: <URL>"). Never invent or reconstruct a URL; only use a URL literally present in the supplied verified data.
- If multiple products are supplied, present the strongest matches first.

MISSING INFORMATION:
- When specific information genuinely cannot be found after checking the available data, provide a warm, helpful response:
  "I don't have the exact details on that for our collection, but I'd be happy to help you check a specific article or explore our available options."
- Never sound detached or robotic.

FINAL RESPONSE:
Return ONLY the customer-facing response.
Do not add "Answer:".
Do not add internal notes.
Do not describe your reasoning.
`.trim();

// =====================================================
// CHAT WITH OPENAI
// =====================================================

export interface ChatWithAIOptions {
  /** Extra verified website facts (name, URL, capabilities) for universal adaptation. */
  websiteContext?: string;
  /** Optional base64 image data URL for vision-capable models. */
  imageDataUrl?: string | null;
}

// =====================================================
// CHAT WITH AI (via the extensible provider layer)
// =====================================================

export async function chatWithAI(
  question: string,
  context: string,
  options: ChatWithAIOptions = {}
): Promise<string> {
  const cleanQuestion = limitQuestion(question);
  const cleanContext = limitContext(context);
  const cleanSiteContext = cleanText(options.websiteContext).slice(0, 2000);

  if (!cleanQuestion) {
    throw new Error("Customer question is empty.");
  }

  // Compose verified information: optional website context (universal),
  // then the caller-provided store/knowledge context.
  const verifiedParts: string[] = [];
  if (cleanSiteContext) verifiedParts.push(cleanSiteContext);
  if (cleanContext) verifiedParts.push(cleanContext);

  const input = [
    "VERIFIED STORE / CONVERSATION INFORMATION:",
    verifiedParts.length
      ? verifiedParts.join("\n\n")
      : "(No verified store information was found.)",
    "",
    "CUSTOMER MESSAGE:",
    cleanQuestion,
  ].join("\n").trim();

  const result = await completeAi({
    instructions: SALES_PILOT_INSTRUCTIONS,
    text: input,
    imageDataUrl: options.imageDataUrl ?? null,
  });

  const cleaned = cleanModelResponse(result.text);
  if (!cleaned) {
    throw new Error("AI provider returned an empty response.");
  }
  return cleaned;
}
