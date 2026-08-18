// =====================================================
// OPENAI CHAT CONFIG
// =====================================================

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const MODEL =
  process.env.OPENAI_CHAT_MODEL ??
  "gpt-5-mini";

// =====================================================
// TIMEOUT
// =====================================================

const TIMEOUT = 60000;

// =====================================================
// OUTPUT LIMIT
// =====================================================

const MAX_OUTPUT_TOKENS = 500;

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
  return cleanText(context).slice(0, 6000);
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

Answer the customer using ONLY the store information provided below.

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

7. Keep the answer short and useful.

8. Normally answer in 1-3 sentences.

9. If the customer asks what the store offers, summarize the actual products or services found in the store information.

10. If the information is unavailable, say:
"I couldn't find that information in this store's information."

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
      "MAX OUTPUT TOKENS:",
      MAX_OUTPUT_TOKENS
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

            // Keep reasoning small so the model
            // has enough tokens to produce the
            // actual customer-facing answer.
            reasoning: {
              effort: "low",
            },

            max_output_tokens:
              MAX_OUTPUT_TOKENS,
          }),
        }
      );

    clearTimeout(timeout);

    // =================================================
    // READ RESPONSE
    // =================================================

    const responseText =
      await response.text();

    // =================================================
    // API ERROR
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
          errorData?.error?.message ||
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
        "OpenAI returned invalid JSON."
      );
    }

    // =================================================
    // LOG RESPONSE STATUS
    // =================================================

    console.log(
      "OPENAI STATUS:",
      data?.status
    );

    if (
      data?.incomplete_details
    ) {
      console.warn(
        "OPENAI INCOMPLETE:",
        data.incomplete_details
      );
    }

    // =================================================
    // GET OUTPUT TEXT
    // =================================================

    let result = "";

    // Preferred Responses API field.

    if (
      typeof data?.output_text ===
      "string"
    ) {
      result =
        data.output_text.trim();
    }

    // =================================================
    // FALLBACK OUTPUT EXTRACTION
    // =================================================

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

    // =================================================
    // DURATION
    // =================================================

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
    // INCOMPLETE RESPONSE
    // =================================================

    if (
      data?.status ===
        "incomplete" &&
      data?.incomplete_details
        ?.reason ===
        "max_output_tokens"
    ) {
      throw new Error(
        "OpenAI response reached the output token limit before producing an answer."
      );
    }

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
        "OpenAI response timed out after 60 seconds."
      );
    }

    throw error;
  }
}