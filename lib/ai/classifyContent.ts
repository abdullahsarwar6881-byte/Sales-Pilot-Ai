// =====================================================
// OPENAI PAGE CLASSIFIER
// =====================================================

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const MODEL =
  process.env.OPENAI_CLASSIFIER_MODEL ??
  "gpt-5-mini";

const MAX_RETRIES = 2;
const TIMEOUT = 30000;

// =====================================================
// ALLOWED CATEGORIES
// =====================================================

const ALLOWED_CATEGORIES = [
  "product",
  "policy",
  "faq",
  "collection",
  "blog",
  "about",
  "other",
] as const;

type PageCategory =
  (typeof ALLOWED_CATEGORIES)[number];

// =====================================================
// CLEAN CONTENT
// =====================================================

function cleanContent(
  content: string
) {
  return String(content || "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

// =====================================================
// NORMALIZE CATEGORY
// =====================================================

function normalizeCategory(
  value: string
): PageCategory {
  const result = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/\.$/, "")
    .trim();

  if (
    ALLOWED_CATEGORIES.includes(
      result as PageCategory
    )
  ) {
    return result as PageCategory;
  }

  return "other";
}

// =====================================================
// SLEEP
// =====================================================

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// =====================================================
// CLASSIFY CONTENT
// =====================================================

export async function classifyContent(
  title: string,
  content: string
): Promise<PageCategory> {
  const cleanTitle =
    String(title || "")
      .replace(/\u0000/g, "")
      .trim()
      .slice(0, 500);

  const cleanPageContent =
    cleanContent(content);

  // ===================================================
  // API KEY
  // ===================================================

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error(
      "OPENAI_API_KEY is not configured."
    );

    return "other";
  }

  // ===================================================
  // PROMPT
  // ===================================================

  const prompt = `
You are a website content classifier.

Classify the webpage into ONLY ONE category.

Available categories:

product
policy
faq
collection
blog
about
other

Rules:

product:
- Product details
- Product name
- Price
- Features
- Buying page

policy:
- Shipping
- Returns
- Refunds
- Privacy
- Terms
- Store rules

faq:
- Frequently asked questions
- Customer questions and answers

collection:
- Category pages
- Product listings
- Multiple products

blog:
- Articles
- News
- Guides

about:
- Company information
- About the company
- Company history

other:
- Anything that does not clearly fit the categories above

Page title:
${cleanTitle}

Page content:
${cleanPageContent}

Return ONLY ONE category name.
Do not explain your answer.
`.trim();

  let lastError: unknown;

  // ===================================================
  // RETRIES
  // ===================================================

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, TIMEOUT);

    const start =
      performance.now();

    try {
      console.log(
        "================================="
      );

      console.log(
        "OPENAI CLASSIFIER START"
      );

      console.log(
        "MODEL:",
        MODEL
      );

      console.log(
        "PAGE TITLE:",
        cleanTitle
      );

      console.log(
        "ATTEMPT:",
        `${attempt}/${MAX_RETRIES}`
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

              max_output_tokens: 10,
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
          "OPENAI CLASSIFIER STATUS:",
          response.status
        );

        console.error(
          "OPENAI CLASSIFIER ERROR:",
          responseText
        );

        let errorMessage =
          `OpenAI classifier returned ${response.status}.`;

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
          "OpenAI classifier returned invalid JSON."
        );
      }

      // =================================================
      // EXTRACT TEXT
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
      // FALLBACK OUTPUT PARSER
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
            .join(" ")
            .trim();
      }

      // =================================================
      // NORMALIZE RESULT
      // =================================================

      const category =
        normalizeCategory(
          result
        );

      const duration =
        Math.round(
          performance.now() -
            start
        );

      console.log(
        "OPENAI CLASSIFIER COMPLETED"
      );

      console.log(
        `CLASSIFICATION TIME: ${duration}ms`
      );

      console.log(
        "RAW CLASSIFICATION:",
        result
      );

      console.log(
        "CATEGORY:",
        category
      );

      console.log(
        "================================="
      );

      return category;
    } catch (error: any) {
      clearTimeout(timeout);

      lastError = error;

      console.warn(
        `Classification attempt ${attempt}/${MAX_RETRIES} failed.`,
        error
      );

      // =================================================
      // TIMEOUT
      // =================================================

      if (
        error?.name ===
        "AbortError"
      ) {
        lastError =
          new Error(
            "OpenAI classifier request timed out after 30 seconds."
          );
      }

      if (
        attempt < MAX_RETRIES
      ) {
        await sleep(500);
      }
    }
  }

  // =====================================================
  // FALLBACK
  // =====================================================

  console.error(
    "Classification failed. Using 'other'.",
    lastError
  );

  return "other";
}

// =====================================================
// CLASSIFY MULTIPLE PAGES
// =====================================================

export async function classifyContents(
  pages: {
    title: string;
    content: string;
  }[],
  concurrency = 3
): Promise<PageCategory[]> {
  if (
    pages.length === 0
  ) {
    return [];
  }

  const results: PageCategory[] =
    new Array(
      pages.length
    );

  let currentIndex = 0;

  async function worker() {
    while (true) {
      const index =
        currentIndex++;

      if (
        index >=
        pages.length
      ) {
        return;
      }

      console.log(
        `Classifying page ${
          index + 1
        }/${pages.length}`
      );

      results[index] =
        await classifyContent(
          pages[index].title,
          pages[index].content
        );
    }
  }

  const workerCount =
    Math.min(
      concurrency,
      pages.length
    );

  const workers =
    Array.from(
      {
        length:
          workerCount,
      },
      () => worker()
    );

  await Promise.all(
    workers
  );

  console.log(
    `Finished classifying ${pages.length} pages.`
  );

  return results;
}