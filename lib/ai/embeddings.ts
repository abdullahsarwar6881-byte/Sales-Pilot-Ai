const OLLAMA_URL =
  process.env.OLLAMA_EMBEDDING_URL ??
  "http://localhost:11434/api/embeddings";

const MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL ??
  "nomic-embed-text";

const MAX_RETRIES = 3;
const TIMEOUT = 30000;

function cleanText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function createEmbedding(
  text: string
): Promise<number[]> {
  const prompt = cleanText(text);

  if (!prompt) {
    throw new Error(
      "Cannot create embedding from empty text."
    );
  }

  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, TIMEOUT);

    const start = performance.now();

    try {
      const response = await fetch(
        OLLAMA_URL,
        {
          method: "POST",

          signal: controller.signal,

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            model: MODEL,
            prompt,
          }),
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(
          `Ollama returned ${response.status} ${response.statusText}`
        );
      }

      const data =
        await response.json();

      if (
        !data.embedding ||
        !Array.isArray(data.embedding)
      ) {
        throw new Error(
          "Invalid embedding returned from Ollama."
        );
      }

      const duration =
        Math.round(
          performance.now() - start
        );

      console.log(
        `Embedding created in ${duration} ms`
      );

      return data.embedding;
    } catch (error) {
      clearTimeout(timeout);

      lastError = error;

      console.warn(
        `Embedding attempt ${attempt}/${MAX_RETRIES} failed.`,
        error
      );

      if (
        attempt < MAX_RETRIES
      ) {
        await sleep(1000);
      }
    }
  }

  console.error(
    "Embedding generation failed after all retries."
  );

  throw lastError;
}

/**
 * Create multiple embeddings concurrently.
 *
 * Default concurrency is 3 because Ollama
 * is currently running locally.
 */
export async function createEmbeddings(
  texts: string[],
  concurrency = 3
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const results: number[][] =
    new Array(texts.length);

  let currentIndex = 0;

  async function worker() {
    while (true) {
      const index = currentIndex++;

      if (
        index >= texts.length
      ) {
        return;
      }

      console.log(
        `Creating embedding ${index + 1}/${texts.length}`
      );

      results[index] =
        await createEmbedding(
          texts[index]
        );
    }
  }

  const workerCount =
    Math.min(
      concurrency,
      texts.length
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
    `Finished creating ${texts.length} embeddings.`
  );

  return results;
}