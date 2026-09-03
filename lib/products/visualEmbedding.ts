// =====================================================
// VISUAL EMBEDDING PROVIDER
// =====================================================
// Production seam for TRUE image-to-image product matching.
//
// The rest of the chat pipeline should never assume a specific
// embedding backend. This module exposes a VisualEmbeddingProvider
// abstraction so a real image-embedding backend (CLIP-style, OpenAI
// image embeddings, a hosted multimodal embedder, etc.) can be wired
// in cleanly behind environment variables — WITHOUT changing the
// chat/matching code.
//
// IMPORTANT HONESTY CONSTRAINT:
//
//   OpenAI's modern Responses API does NOT currently expose a public
//   pure image-embedding endpoint that this stack can rely on (the
//   `text-embedding-*` models are text-only). If NO visual embedding
//   provider is configured, we return a NullVisualEmbeddingProvider
//   that reports `available: false`. Nothing in the pipeline may claim
//   that true visual-embedding matching is live when it is not.
//
//   The DEFAULT matching pipeline therefore uses the vision-feature +
//   metadata matcher (multimodalMatch.ts). If a provider is configured
//   (e.g. OPENAI_VISUAL_EMBEDDING_MODEL / endpoint), the candidate
//   retrieval layer can additionally score catalog images by vector
//   similarity. When no provider is configured, catalog images are
//   still indexed (image URLs + metadata) but embeddings stay NULL, and
//   retrieval falls back to feature/metadata scoring — which is honest
//   and still materially better than raw text search for a real photo.
// =====================================================

export const VISUAL_EMBEDDING_DIMENSIONS = 1024;

export interface VisualEmbeddingResult {
  // Dimension count must match the `vector(1024)` column.
  embedding: number[];
  // Model / provider identifier used, for audit + diagnostics.
  model?: string;
}

export interface VisualSearchResult {
  // Hash/URL of the catalog image, plus the normalized similarity 0..1.
  imageHash: string;
  imageUrl?: string;
  productKey?: string;
  score: number; // cosine similarity 0..1
}

export interface SearchSimilarImagesOptions {
  limit?: number;
  // Optional narrowing so a merchant can never search another merchant's
  // catalog via the embedding lookup.
  userId?: string;
  storeId?: string;
}

/**
 * Abstraction for a real image-embedding provider. A provider is only
 * marked `available` when it can actually embed customer + catalog images
 * and return vector-similarity results.
 */
export interface VisualEmbeddingProvider {
  readonly name: string;
  readonly available: boolean;
  /** Embed a catalog image (base64 data URL) for indexing into the vector column. */
  indexCatalogImage(imageDataUrl: string): Promise<VisualEmbeddingResult>;
  /** Embed a customer-uploaded image for query-time search. */
  embedQueryImage(imageDataUrl: string): Promise<VisualEmbeddingResult>;
  /** Search a pre-built catalog of image embeddings for similar images. */
  searchSimilarImages(
    input: {
      imageDataUrl: string;
      catalogRows: Array<{
        imageHash: string;
        imageUrl?: string;
        productKey?: string;
        visualEmbedding?: number[] | null;
      }>;
    },
    options?: SearchSimilarImagesOptions
  ): Promise<VisualSearchResult[]>;
}

// =====================================================
// NULL / FALLBACK PROVIDER
// =====================================================
// The safe default when no visual-embedding backend is configured.
// It never claims to produce embeddings; `searchSimilarImages` returns an
// empty result, signalling to callers that only feature/metadata scoring is
// available. This keeps the pipeline graceful and honest.
// =====================================================

export class NullVisualEmbeddingProvider
  implements VisualEmbeddingProvider
{
  readonly name = "null";
  readonly available = false;

  async indexCatalogImage(_imageDataUrl: string): Promise<never> {
    throw new Error(
      "No visual embedding provider is configured. Catalog images are indexed without vector embeddings."
    );
  }

  async embedQueryImage(_imageDataUrl: string): Promise<never> {
    throw new Error(
      "No visual embedding provider is configured. Visual-embedding query matching is unavailable."
    );
  }

  async searchSimilarImages(_input: { imageDataUrl: string; catalogRows: Array<{ imageHash: string; imageUrl?: string; productKey?: string; visualEmbedding?: number[] | null; }>; }, _options?: SearchSimilarImagesOptions): Promise<VisualSearchResult[]> {
    // No embeddings -> no vector candidates. Callers must fall back to
    // feature/metadata matching instead of fabricating a score.
    return [];
  }
}

// =====================================================
// PROVIDER SELECTION
// =====================================================
// Environment-gated. Today only the null provider is wired because there is
// no configured visual-embedding endpoint. Future providers (a CLIP proxy, a
// hosted image-embedder, an OpenAI image-embedding model) are added here.
// =====================================================

export function getVisualEmbeddingProvider(): VisualEmbeddingProvider {
  const provider =
    String(process.env.VISUAL_EMBEDDING_PROVIDER || "").trim().toLowerCase();

  if (
    !provider ||
    provider === "null" ||
    provider === "none" ||
    provider === "off"
  ) {
    return new NullVisualEmbeddingProvider();
  }

  // Placeholder for a configured future provider. This always stays honest:
  // unknown provider names produce a clean fallback rather than a fake match.
  console.warn(
    "VISUAL EMBEDDING: unknown provider '" + provider +
      "'. Falling back to feature/metadata matching."
  );
  return new NullVisualEmbeddingProvider();
}

export function isVisualEmbeddingAvailable() {
  return getVisualEmbeddingProvider().available;
}


