// =====================================================
// OPENAI EMBEDDINGS (BATCHED & OPTIMIZED)
// =====================================================

const OPENAI_API_URL = "https://api.openai.com/v1/embeddings";

const MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const DIMENSIONS = 768;
const TIMEOUT = 30000;
const MAX_BATCH_SIZE = 100; // OpenAI supports up to 2048, 100 is optimal for network/payload balance

function cleanText(text: string): string {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Creates a single text embedding via OpenAI.
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const result = await createEmbeddingWithUsage(text);
  return result.embedding;
}

/**
 * Creates a single text embedding with token usage tracking.
 */
export async function createEmbeddingWithUsage(text: string): Promise<EmbeddingResult> {
  const prompt = cleanText(text);
  if (!prompt) {
    throw new Error("Cannot create embedding from empty text.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        dimensions: DIMENSIONS,
        encoding_format: "float",
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      let errorMessage = `OpenAI embeddings returned ${response.status}.`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData?.error?.message || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }

    const data = JSON.parse(responseText);
    const embedding = data?.data?.[0]?.embedding;

    if (!Array.isArray(embedding) || embedding.length !== DIMENSIONS) {
      throw new Error(`Invalid embedding returned from OpenAI (expected ${DIMENSIONS} dimensions).`);
    }

    const promptTokens = data?.usage?.prompt_tokens ?? Math.ceil(prompt.length / 4);
    const totalTokens = data?.usage?.total_tokens ?? promptTokens;

    return {
      embedding,
      model: MODEL,
      usage: {
        prompt_tokens: promptTokens,
        total_tokens: totalTokens,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Native batch embedding call sending up to 100 strings in a single OpenAI HTTP request.
 */
export async function createEmbeddingsBatch(
  rawTexts: string[],
  maxRetries = 2
): Promise<number[][]> {
  if (rawTexts.length === 0) return [];

  const cleaned = rawTexts.map((t) => cleanText(t) || "empty");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          input: cleaned,
          dimensions: DIMENSIONS,
          encoding_format: "float",
        }),
      });

      clearTimeout(timeout);
      const responseText = await response.text();

      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          continue;
        }
        let errorMessage = `OpenAI batch embeddings returned ${response.status}.`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData?.error?.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      const dataItems: Array<{ index: number; embedding: number[] }> = data?.data;

      if (!Array.isArray(dataItems)) {
        throw new Error("Invalid response format from OpenAI embeddings API.");
      }

      const sortedEmbeddings: number[][] = new Array(cleaned.length);
      for (const item of dataItems) {
        if (item && typeof item.index === "number" && Array.isArray(item.embedding)) {
          sortedEmbeddings[item.index] = item.embedding;
        }
      }

      return sortedEmbeddings;
    } catch (err: any) {
      clearTimeout(timeout);
      if (attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Batch embedding creation failed after retries.");
}

/**
 * Creates embeddings for a large array of texts using bounded concurrency
 * and optimal OpenAI array batching.
 */
export async function createEmbeddings(
  texts: string[],
  concurrency = 4
): Promise<number[][]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  // Split into batches of MAX_BATCH_SIZE (100)
  const batches: Array<{ startIndex: number; items: string[] }> = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    batches.push({
      startIndex: i,
      items: texts.slice(i, i + MAX_BATCH_SIZE),
    });
  }

  const results: number[][] = new Array(texts.length);
  let batchIndex = 0;

  async function worker() {
    while (true) {
      const current = batchIndex++;
      if (current >= batches.length) return;

      const batch = batches[current];
      const embeddings = await createEmbeddingsBatch(batch.items);

      for (let j = 0; j < embeddings.length; j++) {
        results[batch.startIndex + j] = embeddings[j];
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), batches.length);
  const workers = Array.from({ length: workerCount }, () => worker());

  await Promise.all(workers);

  return results;
}