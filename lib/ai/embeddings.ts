// =====================================================
// OPENAI EMBEDDINGS CONFIG
// =====================================================

const OPENAI_API_URL =
  "https://api.openai.com/v1/embeddings";

const MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ??
  "text-embedding-3-small";

// IMPORTANT:
// Your Supabase vector column currently uses 768 dimensions.
// OpenAI text-embedding-3-small supports reducing the
// embedding size to 768.
const DIMENSIONS = 768;

const MAX_RETRIES = 3;
const TIMEOUT = 30000;

// =====================================================
// CLEAN TEXT
// =====================================================

function cleanText(text: string) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
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
// CREATE SINGLE EMBEDDING
// =====================================================

export async function createEmbedding(
  text: string
): Promise<number[]> {
  const prompt = cleanText(text);

  if (!prompt) {
    throw new Error(
      "Cannot create embedding from empty text."
    );
  }

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
        "OPENAI EMBEDDING START"
      );

      console.log(
        "MODEL:",
        MODEL
      );

      console.log(
        "TARGET DIMENSIONS:",
        DIMENSIONS
      );

      console.log(
        "TEXT LENGTH:",
        prompt.length
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

              // IMPORTANT:
              // Keep this at 768 because the
              // Supabase vector column uses 768.
              dimensions:
                DIMENSIONS,

              encoding_format:
                "float",
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
          "OPENAI EMBEDDING STATUS:",
          response.status
        );

        console.error(
          "OPENAI EMBEDDING ERROR:",
          responseText
        );

        let errorMessage =
          `OpenAI embeddings returned ${response.status}.`;

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
          "OpenAI returned invalid JSON for embeddings."
        );
      }

      // =================================================
      // GET EMBEDDING
      // =================================================

      const embedding =
        data?.data?.[0]?.embedding;

      if (
        !Array.isArray(
          embedding
        )
      ) {
        console.error(
          "OPENAI EMBEDDING RAW RESPONSE:",
          data
        );

        throw new Error(
          "Invalid embedding returned from OpenAI."
        );
      }

      // =================================================
      // CHECK EMPTY EMBEDDING
      // =================================================

      if (
        embedding.length === 0
      ) {
        throw new Error(
          "OpenAI returned an empty embedding."
        );
      }

      // =================================================
      // CHECK DIMENSIONS
      // =================================================

      if (
        embedding.length !==
        DIMENSIONS
      ) {
        throw new Error(
          `Expected ${DIMENSIONS}-dimensional embedding but received ${embedding.length}.`
        );
      }

      // =================================================
      // COMPLETED
      // =================================================

      const duration =
        Math.round(
          performance.now() -
            start
        );

      console.log(
        "OPENAI EMBEDDING COMPLETED"
      );

      console.log(
        `EMBEDDING DIMENSIONS: ${embedding.length}`
      );

      console.log(
        `EMBEDDING TIME: ${duration}ms`
      );

      console.log(
        "================================="
      );

      return embedding;
    } catch (error: any) {
      clearTimeout(timeout);

      lastError = error;

      console.warn(
        `Embedding attempt ${attempt}/${MAX_RETRIES} failed.`,
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
            "OpenAI embedding request timed out after 30 seconds."
          );
      }

      // =================================================
      // RETRY
      // =================================================

      if (
        attempt <
        MAX_RETRIES
      ) {
        await sleep(1000);
      }
    }
  }

  // =====================================================
  // ALL RETRIES FAILED
  // =====================================================

  console.error(
    "================================="
  );

  console.error(
    "OPENAI EMBEDDING FAILED"
  );

  console.error(
    lastError
  );

  console.error(
    "================================="
  );

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "Embedding generation failed after all retries."
      );
}

// =====================================================
// CREATE MULTIPLE EMBEDDINGS
// =====================================================

export async function createEmbeddings(
  texts: string[],
  concurrency = 6
): Promise<number[][]> {
  if (
    texts.length === 0
  ) {
    return [];
  }

  const results: number[][] =
    new Array(
      texts.length
    );

  let currentIndex = 0;

  // ===================================================
  // WORKER
  // ===================================================

  async function worker() {
    while (true) {
      const index =
        currentIndex++;

      if (
        index >=
        texts.length
      ) {
        return;
      }

      console.log(
        `Creating embedding ${
          index + 1
        }/${texts.length}`
      );

      results[index] =
        await createEmbedding(
          texts[index]
        );
    }
  }

  // ===================================================
  // CONCURRENCY
  // ===================================================

  const workerCount =
    Math.min(
      concurrency,
      texts.length
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
    `Finished creating ${texts.length} embeddings.`
  );

  return results;
}