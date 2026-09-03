// =====================================================
// VISUAL CANDIDATE RETRIEVAL
// =====================================================
// Layered candidate retrieval for product-image matching.
//
// The pipeline does NOT (and must not) run a vision model over the entire
// catalog on every customer upload. Instead we retrieve a compact TOP-K set
// of likely candidates using multiple cheap signals, then (in the chat route)
// run the strongest reasoning only over those top candidates.
//
// Retrieval layers:
//   A. Pre-built visual-index rows (image URLs + metadata). When a visual
//      embedding provider is available, these carry a vector embedding and we
//      rank by cosine similarity. Otherwise we score the light metadata
//      (SKU/title) + catalog feature text (content/description).
//   B. Catalog feature/metadata scoring (extractVisionFeatures + score).
//   C. Candidate union, deduped, ranked, capped at TOP_K.
//
// Merchant isolation: every query is scoped by userId/storeId so one merchant
// can never retrieve another merchant's visual index rows.
// =====================================================

import {
  scoreProductAgainstFeatures,
  type VisionFeatures,
} from "@/lib/products/multimodalMatch";
import {
  getVisualEmbeddingProvider,
  type VisualEmbeddingProvider,
} from "@/lib/products/visualEmbedding";
import { normalizeImageUrl } from "@/lib/products/visualIndex";

export interface VisualCandidate {
  product: any;
  imageUrl?: string;
  imageHash?: string;
  retrievalScore: number; // 0..1
  signals: {
    vector: number; // 0..1, 0 when no embedding available
    feature: number; // 0..1
    metadata: number; // 0..1
  };
  source: "vector" | "feature" | "metadata" | "both";
}

export interface VisualCandidateRequest {
  customerFeatures: VisionFeatures;
  customerImageDataUrl?: string;
  catalogProducts: any[];
  visualIndexRows?: any[];
  limit?: number;
}

const TOP_K = 12;

// -------------------------------------------------------
// Cosine similarity (0..1) between two equal-length vectors.
// -------------------------------------------------------
function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return Math.min(1, dot / (Math.sqrt(na) * Math.sqrt(nb)));
}

function toEmbeddingArray(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  return v.length > 0 ? (v as number[]) : null;
}

// -------------------------------------------------------
// Resolve a product's primary display image.
// -------------------------------------------------------
export function getPrimaryImageUrl(product: any): string {
  const raw =
    product?.imageUrl ||
    product?.image_url ||
    product?.image ||
    product?.featured_image ||
    product?.featuredImage ||
    product?.thumbnail ||
    product?.small_image ||
    "";
  const url = normalizeImageUrl(raw, product?.productUrl || product?.page_url);
  return url || "";
}

// -------------------------------------------------------
// Layer A+B: score each catalog product.
// Combines a vector score (only when a real provider + index row exists) with
// the feature/metadata score from multimodalMatch. Returns an ordered list.
// -------------------------------------------------------
export async function scoreCatalogCandidates(
  request: VisualCandidateRequest
): Promise<VisualCandidate[]> {
  const catalog = Array.isArray(request.catalogProducts) ? request.catalogProducts : [];
  const limit = Math.max(1, request.limit ?? TOP_K);
  if (catalog.length === 0) return [];

  // Build a lookup of visual-index rows by product id/key so vector scores
  // can be attached when available.
  const visRows = Array.isArray(request.visualIndexRows) ? request.visualIndexRows : [];
  const provider: VisualEmbeddingProvider = getVisualEmbeddingProvider();
  const providerAvailable = provider.available;

  const indexByProductId = new Map<string, any[]>();
  for (const row of visRows) {
    const id = String(row?.product_id || row?.product_key || "");
    if (!id) continue;
    if (!indexByProductId.has(id)) indexByProductId.set(id, []);
    indexByProductId.get(id)!.push(row);
  }

  // Pre-embed the customer image once (only if a genuine provider is configured).
  let queryEmbedding: number[] | null = null;
  if (
    providerAvailable &&
    request.customerImageDataUrl &&
    typeof provider.embedQueryImage === "function"
  ) {
    try {
      const result = await provider.embedQueryImage(request.customerImageDataUrl);
      queryEmbedding = Array.isArray(result?.embedding) ? result.embedding : null;
    } catch {
      // Provider became unavailable at call time -> no vector candidates.
      queryEmbedding = null;
    }
  }

  const seen = new Set<string>();
  const candidates: VisualCandidate[] = [];

  for (const product of catalog) {
    const productId = String(
      product?.id || product?.product_id || product?.externalId || product?.external_id || product?.sku || ""
    );
    const productKey = String(
      product?.shopify_id || product?.external_id || product?.id || product?.productUrl || product?.page_url || ""
    );
    const rowSet = indexByProductId.get(productId) || indexByProductId.get(productKey) || [];

    // Layer A: vector similarity from a pre-built embedding (only if genuine).
    let vectorScore = 0;
    let vectorRowsScored = 0;
    if (providerAvailable && queryEmbedding && rowSet.length > 0) {
      for (const row of rowSet) {
        const emb = toEmbeddingArray(row?.visual_embedding);
        if (!emb) continue;
        const sim = cosineSimilarity(queryEmbedding, emb);
        if (sim > vectorScore) vectorScore = sim;
        vectorRowsScored++;
      }
    }

    // Layer B: feature + metadata scoring against the product's content/metadata.
    const productText =
      product?.image_metadata?.description ||
      product?.image_visual_features ||
      product?.imageDescription ||
      product?.content ||
      product?.description ||
      product?.body_html ||
      "";
    const signals = scoreProductAgainstFeatures(request.customerFeatures, {
      ...product,
      content: productText,
      description: productText,
    });

    const featureScore = signals.visualSimilarity;

    // Blend: when a genuine vector score exists it dominates; otherwise feature.
    let blend: number;
    let source: VisualCandidate["source"];
    if (vectorScore > 0) {
      blend = vectorScore * 0.7 + featureScore * 0.3;
      source = vectorRowsScored > 0 ? "both" : "vector";
    } else {
      blend = featureScore;
      source = signals.skuMatch ? "metadata" : "feature";
    }

    const dedupKey =
      String(product?.productUrl || product?.page_url || product?.id || product?.title || "").toLowerCase();
    if (dedupKey) {
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
    }

    candidates.push({
      product,
      imageUrl: getPrimaryImageUrl(product),
      imageHash: rowSet[0]?.image_hash || undefined,
      retrievalScore: Math.max(0, Math.min(1, blend)),
      signals: {
        vector: vectorScore,
        feature: featureScore,
        metadata: signals.metadataSimilarity,
      },
      source,
    });
  }

  return candidates
    .filter((c) => c.retrievalScore > 0)
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .slice(0, limit);
}

// -------------------------------------------------------
// Top-level entry: build the candidate union used by the chat route.
// Returns the highest-scoring candidates for verification/final decision.
// -------------------------------------------------------
export async function retrieveVisualCandidates(
  request: VisualCandidateRequest
): Promise<VisualCandidate[]> {
  return scoreCatalogCandidates(request);
}


