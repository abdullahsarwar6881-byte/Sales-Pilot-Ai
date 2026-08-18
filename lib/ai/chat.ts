// =====================================================
// OPENAI CHAT CONFIG
// =====================================================

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const MODEL =
  process.env.OPENAI_CHAT_MODEL ??
  "gpt-5.6-luna";

// =====================================================
// TIMEOUT
// =====================================================

// 60 seconds
const TIMEOUT = 60000;

// =====================================================
// CLEAN TEXT
// =====================================================

function cleanText(text: string) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// LIMIT CONTEXT
// =====================================================

function limitContext(context: string) {
  const cleaned =
    cleanText(context);

  // Keep the store context reasonably small.
  // This reduces latency and API cost.
  return cleaned.slice(0, 6000);
}

// =====================================================
// CHAT WITH OPENAI
// =====================================================

export async function chatWithAI(
  question: string,
  context: string
) {
  const cleanQuestion =
    cleanText(question);

  const cleanContext =
    limitContext(context);

  // ===================================================
  // API KEY
  // ===================================================

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  // ===================================================
  // PROMPT
  // ===================================================

  const prompt = `
You are Sales Pilot, a professional ecommerce customer support employee.

Your job is to help customers using ONLY the store information provided below.

RULES:

1. Never invent information.

2. Never invent:
- Products
- Prices
- Discounts
- Stock
- Features
- Shipping rules
- Return rules
- Refund rules
- URLs

3. If a product URL exists in the store information, use the exact URL.

4. Never create or guess a URL.

5. Never mention:
- AI
- Knowledge base
- Documents
- Context
- Sources
- Internal systems

6. Speak naturally like a real store employee.

7. Keep answers short and useful.
Normally 1-3 sentences.

8. If the information is unavailable, say:
"I couldn't find that information in this store's information."

9. If the customer asks what the store offers, summarize the products or services that are actually present in the store information.

10. If the customer asks about a specific product, only use information about that product that appears in the store information.

11. Do not claim that an order was placed, cancelled, refunded, shipped, or modified unless the system explicitly provides that result.

12. Do not expose internal implementation details.

STORE INFORMATION:

${cleanContext}

CUSTOMER QUESTION:

${cleanQuestion}

ANSWER:
`.trim();

  // ===================================================
  // ABORT CONTROLLER
  // ===================================================

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, TIMEOUT);

  const startedAt =
    Date.now();

  try {
    console.log(
      "================================="
    );

    console.log(
      "OPENAI CHAT START"
    );

    console.log(
      "MODEL:",
      MODEL
    );

    console.log(
      "QUESTION:",
      cleanQuestion
    );

    console.log(
      "CONTEXT LENGTH:",
      cleanContext.length
    );

    console.log(
      "PROMPT LENGTH:",
      prompt.length
    );

    console.log(
      "TIMEOUT:",
      `${TIMEOUT / 1000} seconds`
    );

    // =================================================
    // OPENAI REQUEST
    // =================================================

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
            model: MODEL,

            input: prompt,

            store: false,

            max_output_tokens: 200,
          }),
        }
      );

    clearTimeout(timeout);

    // =================================================
    // READ RESPONSE BODY
    // =================================================

    const responseText =
      await response.text();

    // =================================================
    // OPENAI ERROR
    // =================================================

    if (!response.ok) {
      console.error(
        "OPENAI API STATUS:",
        response.status
      );

      console.error(
        "OPENAI API ERROR:",
        responseText
      );

      let errorMessage =
        `OpenAI returned ${response.status}.`;

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
        // Response was not JSON.
      }

      throw new Error(
        errorMessage
      );
    }

    // =================================================
    // PARSE RESPONSE
    // =================================================

    let data: any;

    try {
      data =
        JSON.parse(
          responseText
        );
    } catch {
      throw new Error(
        "OpenAI returned an invalid JSON response."
      );
    }

    // =================================================
    // GET OUTPUT TEXT
    // =================================================

    let result = "";

    // Responses API normally exposes
    // output_text in the SDK.
    //
    // With the raw HTTP API we safely extract
    // the generated text from output[].content[].

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

    const duration =
      Date.now() -
      startedAt;

    console.log(
      "================================="
    );

    console.log(
      "OPENAI CHAT COMPLETED"
    );

    console.log(
      `OPENAI CHAT TIME: ${duration}ms`
    );

    console.log(
      "OPENAI RESPONSE:",
      result
    );

    console.log(
      "================================="
    );

    // =================================================
    // EMPTY RESPONSE
    // =================================================

    if (!result) {
      console.error(
        "OPENAI RAW RESPONSE:",
        data
      );

      throw new Error(
        "OpenAI returned an empty response."
      );
    }

    return result;
  } catch (error: any) {
    clearTimeout(timeout);

    console.error(
      "================================="
    );

    console.error(
      "OPENAI CHAT ERROR"
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );

    // =================================================
    // TIMEOUT
    // =================================================

    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "AI response timed out after 60 seconds."
      );
    }

    throw error;
  }
}