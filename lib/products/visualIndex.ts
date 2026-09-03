// =====================================================
// PRODUCT VISUAL INDEX
// =====================================================
// Reusable, source-agnostic helpers for building a product
// visual catalog: extract every image URL from a normalized
// product, dedup them, and upsert rows into the
// product_visual_embeddings table.
//
// This module is deliberately independent of Shopify or the
// crawler: any ingestion path (Shopify, WooCommerce, crawled
// websites, custom ecommerce) can call these functions.
// =====================================================

import { createHash } from "crypto";

// Stable dedup key for an image URL (lowercased, trimmed).
export function hashImageUrl(url: string): string {
  return createHash("sha256")
    .update(String(url || "").trim().toLowerCase())
    .digest("hex");
}

// Normalize an image URL to an absolute http(s) URL when possible.
export function normalizeImageUrl(
  url: unknown,
  baseUrl?: string
): string {
  if (typeof url !== "string") return "";
  let value = url.trim();
  if (!value) return "";
  // Strip srcset noise (keep the first candidate).
  if (value.includes(",")) {
    value = value.split(",")[0].trim().split(/\s+/)[0];
  }
  if (value.startsWith("//")) value = "https:" + value;
  if (value.startsWith("/") && baseUrl) {
    try {
      value = new URL(value, baseUrl).toString();
    } catch {
      return "";
    }
  }
  if (!/^https?:\/\//i.test(value)) return "";
  return value.replace(/[),.;]+$/, "").trim();
}

function isUsable(url: string): boolean {
  return /^https?:\/\//i.test(url) && !/\.(svg)$/i.test(url);
}

// Pull every candidate image field out of a normalized product.
// Handles both flat product objects and products nested inside
// shopify product `data` payloads.
function collectImageCandidates(product: any): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v !== "string" || !v.trim()) return;
    out.push(v.trim());
  };

  const data = product?.data && typeof product.data === "object" ? product.data : null;

  // Flat fields.
  push(product?.imageUrl);
  push(product?.image_url);
  push(product?.image);
  push(product?.featured_image);
  push(product?.featuredImage);
  push(product?.thumbnail);
  push(product?.thumbnail_url);
  push(product?.og_image);
  push(product?.ogImage);

  // Shopify-style images[].src / .originalSrc, or images[] strings.
  if (Array.isArray(product?.images)) {
    for (const img of product.images) {
      if (typeof img === "string") push(img);
      else if (img && typeof img === "object") {
        push(img.src);
        push(img.url);
        push(img.originalSrc);
      }
    }
  }

  // Shopify product.data.images.
  if (data && Array.isArray(data.images)) {
    for (const img of data.images) {
      if (typeof img === "string") push(img);
      else if (img && typeof img === "object") {
        push(img.src);
        push(img.url);
        push(img.originalSrc);
        push(img.source);
      }
    }
  }

  return out;
}

// Extra image URLs not in structured fields (crawled content jsonb, JSON-LD).
function collectContentImages(product: any): string[] {
  const out: string[] = [];
  const raw =
    product?.content ||
    product?.description ||
    product?.body_html ||
    product?.text ||
    "";
  if (typeof raw !== "string") return out;
  const re = /\bhttps?:\/\/[^\s"'<>\\]+\.(?:jpe?g|png|webp)(?:\?[^\s"'<>\\]*)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) out.push(m[0]);
  return out;
}

// Extract and de-duplicate all usable image URLs for a product.
export function extractProductImages(
  product: any,
  baseUrl?: string
): { url: string; hash: string; isPrimary: boolean }[] {
  const seen = new Map<string, { url: string; hash: string; isPrimary: boolean }>();
  const base = product?.productUrl || product?.page_url || baseUrl || "";

  const pushNormalized = (u: string, primary: boolean) => {
    const url = normalizeImageUrl(u, base);
    if (!url || !isUsable(url)) return;
    const hash = hashImageUrl(url);
    if (!seen.has(hash)) {
      seen.set(hash, { url, hash, isPrimary: primary });
    } else if (primary && !seen.get(hash)!.isPrimary) {
      seen.get(hash)!.isPrimary = true;
    }
  };

  const candidates = [
    ...collectImageCandidates(product),
    ...collectContentImages(product),
  ];
  // First candidate is treated as primary (like a featured image).
  candidates.forEach((c, i) => pushNormalized(c, i === 0));
  return Array.from(seen.values());
}

// Normalized identity of a catalog product for indexing.
export function getProductKey(product: any): string {
  return (
    product?.shopify_id ||
    product?.external_id ||
    product?.externalId ||
    product?.id ||
    product?.handle ||
    product?.productUrl ||
    product?.page_url ||
    ""
  );
}

export interface VisualIndexDeleteResult {
  deleted: number;
}

// Upsert a product's images into the visual index. Dedups by image_hash.
// Returns the number of rows upserted. `supabase` is injected so this module
// never depends on global client construction and stays testable.
export async function upsertProductVisualIndex(
  supabase: any,
  product: any,
  options: {
    userId?: string;
    storeId?: string;
    source?: string;
  } = {}
): Promise<{ upserted: number; images: { url: string; hash: string; isPrimary: boolean }[] }> {
  const images = extractProductImages(product);
  if (images.length === 0) {
    return { upserted: 0, images };
  }

  const productKey = getProductKey(product);
  if (!productKey) return { upserted: 0, images };

  // Owner for RLS isolation: the merchant profile that owns the catalog row.
  // The Shopify sync passes userId via options; the crawler passes it on the
  // product object.
  const userId = options.userId || product?.user_id || null;

  const rows = images.map((img, i) => ({
    user_id: userId || null,
    store_id: options.storeId || null,
    product_id:
      typeof product?.id === "string" || typeof product?.id === "number"
        ? product.id
        : null,
    product_key: productKey,
    image_url: img.url,
    image_hash: img.hash,
    // Light, indexable metadata so the fallback candidate pipeline can score
    // catalog images without running a full vision pass on every upload.
    image_metadata: {
      sku: product?.sku || product?.variant_sku || null,
      title: product?.title || product?.name || product?.displayName || null,
      isPrimary: i === 0,
    },
    source: options.source || "catalog",
    is_primary: i === 0,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("product_visual_embeddings")
    .upsert(rows, { onConflict: "image_hash" });

  if (error) {
    // Non-fatal: visual index build must never crash product ingestion.
    console.error("PRODUCT VISUAL INDEX UPSERT ERROR:", error.message);
    return { upserted: 0, images };
  }

  return { upserted: rows.length, images };
}
