// =====================================================
// OPENAI EMBEDDINGS
// =====================================================

const OPENAI_API_URL =
  "https://api.openai.com/v1/embeddings";

// =====================================================
// MODEL
// =====================================================
//
// IMPORTANT:
// This must match the model configured in Netlify.
//
// Recommended:
// text-embedding-3-small
//

const MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ??
  "text-embedding-3-small";

// =====================================================
// EMBEDDING DIMENSIONS
// =====================================================
//
// Your Supabase knowledge_chunks.embedding column
// currently uses:
//
// vector(768)
//
// text-embedding-3-small supports the dimensions
// parameter, so we request exactly 768 dimensions.
//

const DIMENSIONS = 768;

// =====================================================
// TIMEOUT
// =====================================================

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
// CREATE SINGLE EMBEDDING
// =====================================================

export async function createEmbedding(
  text: string
): Promise<number[]> {
  const prompt = cleanText(text);

  // ---------------------------------------------------
  // EMPTY TEXT
  // ---------------------------------------------------

  if (!prompt) {
    throw new Error(
      "Cannot create embedding from empty text."
    );
  }

  // ---------------------------------------------------
  // API KEY
  // ---------------------------------------------------

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  // ---------------------------------------------------
  // ABORT CONTROLLER
  // ---------------------------------------------------

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

            dimensions:
              DIMENSIONS,

            encoding_format:
              "float",
          }),
        }
      );

    // ---------------------------------------------------
    // READ RESPONSE
    // ---------------------------------------------------

    const responseText =
      await response.text();

    // ---------------------------------------------------
    // OPENAI ERROR
    // ---------------------------------------------------

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
    // EMPTY EMBEDDING
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
    // FINISHED
    // =================================================

    const duration =
      Date.now() -
      startedAt;

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
    // ---------------------------------------------------
    // TIMEOUT
    // ---------------------------------------------------

    if (
      error?.name ===
      "AbortError"
    ) {
      console.error(
        "OPENAI EMBEDDING TIMEOUT"
      );

      throw new Error(
        "OpenAI embedding request timed out after 30 seconds."
      );
    }

    // ---------------------------------------------------
    // ERROR
    // ---------------------------------------------------

    console.error(
      "================================="
    );

    console.error(
      "OPENAI EMBEDDING ERROR"
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );

    throw error;
  } finally {
    clearTimeout(
      timeout
    );
  }
}

// =====================================================
// CREATE MULTIPLE EMBEDDINGS
// =====================================================
//
// This is used by the crawler when a page is split
// into multiple chunks.
//
// Example:
//
// 10 chunks
//    ↓
// createEmbeddings()
//    ↓
// 10 OpenAI embeddings
//
// There is NO retry system here.
//

export async function createEmbeddings(
  texts: string[],
  concurrency = 6
): Promise<number[][]> {
  // ---------------------------------------------------
  // EMPTY INPUT
  // ---------------------------------------------------

  if (
    texts.length === 0
  ) {
    return [];
  }

  // ---------------------------------------------------
  // RESULTS
  // ---------------------------------------------------

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
      Math.max(
        1,
        concurrency
      ),
      texts.length
    );

  const workers =
    Array.from(
      {
        length:
          workerCount,
      },
      () =>
        worker()
    );

  // ===================================================
  // RUN WORKERS
  // ===================================================

  await Promise.all(
    workers
  );

  // ===================================================
  // COMPLETE
  // ===================================================

  console.log(
    `Finished creating ${texts.length} embeddings.`
  );

  return results;
}