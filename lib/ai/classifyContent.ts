const OLLAMA_URL =
  process.env.OLLAMA_CHAT_URL ??
  "http://localhost:11434/api/generate";

const MODEL =
  process.env.OLLAMA_CLASSIFIER_MODEL ??
  "qwen2.5:3b";

const MAX_RETRIES = 2;
const TIMEOUT = 30000;

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

function cleanContent(content: string) {
  return content
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

function normalizeCategory(
  value: string
): PageCategory {
  const result = value
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

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function classifyContent(
  title: string,
  content: string
): Promise<PageCategory> {
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
${title}

Page content:
${cleanContent(content)}

Return ONLY ONE category name.
Do not explain your answer.
`;

  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    const controller =
      new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, TIMEOUT);

    const start = performance.now();

    try {
      const response = await fetch(
        OLLAMA_URL,
        {
          method: "POST",

          signal:
            controller.signal,

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            model: MODEL,

            prompt,

            stream: false,

            keep_alive: "10m",

            options: {
              temperature: 0,

              num_predict: 5,

              num_ctx: 4096,
            },
          }),
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(
          `Ollama classifier returned ${response.status}`
        );
      }

      const data =
        await response.json();

      const duration =
        Math.round(
          performance.now() - start
        );

      const result =
        typeof data.response ===
        "string"
          ? data.response
          : "";

      const category =
        normalizeCategory(
          result
        );

      console.log(
        `Classification completed in ${duration} ms: ${category}`
      );

      return category;
    } catch (error) {
      clearTimeout(timeout);

      lastError = error;

      console.warn(
        `Classification attempt ${attempt}/${MAX_RETRIES} failed.`,
        error
      );

      if (
        attempt < MAX_RETRIES
      ) {
        await sleep(500);
      }
    }
  }

  console.error(
    "Classification failed. Using 'other'.",
    lastError
  );

  return "other";
}

/**
 * Classify multiple pages concurrently.
 *
 * Default concurrency is 3 because
 * the classifier is currently running
 * through local Ollama.
 */
export async function classifyContents(
  pages: {
    title: string;
    content: string;
  }[],
  concurrency = 3
): Promise<PageCategory[]> {
  if (pages.length === 0) {
    return [];
  }

  const results: PageCategory[] =
    new Array(pages.length);

  let currentIndex = 0;

  async function worker() {
    while (true) {
      const index =
        currentIndex++;

      if (
        index >= pages.length
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
        length: workerCount,
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