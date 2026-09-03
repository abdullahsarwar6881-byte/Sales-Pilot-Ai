// =====================================================
// OPENAI VISION
// =====================================================

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const MODEL =
  process.env.OPENAI_VISION_MODEL ??
  "gpt-5-mini";

const TIMEOUT = 60000;

// =====================================================
// ANALYZE PRODUCT IMAGE
// =====================================================

export async function analyzeProductImage(
  imageDataUrl: string
) {
  if (!imageDataUrl) {
    throw new Error(
      "Product image is required."
    );
  }

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  const prompt = `
Analyze this ecommerce product image.

Your job is to describe the visible product so another system can search an online store catalog.

Identify only information that is visually observable.

Focus on:

- Product type
- Main color
- Secondary colors
- Material or apparent material
- Shape
- Style
- Pattern
- Brand if clearly visible
- Logos or text if clearly readable
- Important visual characteristics

Do NOT guess an exact product name.

Do NOT claim that the product belongs to a particular store.

Do NOT invent information.

Return a concise natural-language product description suitable for product search.

Example:

"Black leather handbag with a structured rectangular shape, short handles, gold-tone hardware, and a minimal design."

If some information cannot be determined from the image, simply leave it out.
`.trim();

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, TIMEOUT);

  try {
    console.log(
      "================================="
    );

    console.log(
      "OPENAI VISION START"
    );

    console.log(
      "MODEL:",
      MODEL
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

            input: [
              {
                role: "user",

                content: [
                  {
                    type:
                      "input_text",

                    text: prompt,
                  },

                  {
                    type:
                      "input_image",

                    image_url:
                      imageDataUrl,

                    detail:
                      "low",
                  },
                ],
              },
            ],

            store: false,

            reasoning: {
              effort: "low",
            },

            max_output_tokens: 200,
          }),
        }
      );

    clearTimeout(timeout);

    const responseText =
      await response.text();

    if (!response.ok) {
      console.error(
        "OPENAI VISION STATUS:",
        response.status
      );

      console.error(
        "OPENAI VISION ERROR:",
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
        // Ignore JSON parsing errors.
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
        "OpenAI returned invalid JSON."
      );
    }

    // =================================================
    // OUTPUT TEXT
    // =================================================

    let result = "";

    if (
      typeof data?.output_text ===
      "string"
    ) {
      result =
        data.output_text.trim();
    }

    // =================================================
    // FALLBACK
    // =================================================

    if (
      !result &&
      Array.isArray(
        data?.output
      )
    ) {
      const parts: string[] =
        [];

      for (
        const item of
          data.output
      ) {
        if (
          !Array.isArray(
            item?.content
          )
        ) {
          continue;
        }

        for (
          const content of
            item.content
        ) {
          if (
            content?.type ===
              "output_text" &&
            typeof content?.text ===
              "string"
          ) {
            parts.push(
              content.text
            );
          }
        }
      }

      result =
        parts
          .join("\n")
          .trim();
    }

    console.log(
      "VISION RESULT:",
      result
    );

    console.log(
      "================================="
    );

    if (!result) {
      throw new Error(
        "OpenAI vision returned an empty response."
      );
    }

    return result;
  } catch (error: any) {
    clearTimeout(timeout);

    console.error(
      "OPENAI VISION ERROR:",
      error
    );

    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "Product image analysis timed out."
      );
    }

    throw error;
  }
}