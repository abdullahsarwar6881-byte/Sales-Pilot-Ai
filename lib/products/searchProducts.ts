import {
  cleanProductName,
  cleanProductPrice,
  cleanProductUrl,
  cleanProductImageUrl,
  cleanProductAvailability,
  cleanProductDescription,
  uniqueStrings,
  uniqueUrls,
} from "./cleanProduct";

// =====================================================
// TYPES
// =====================================================

export interface RankedProduct {
  product: any;
  score: number;
}

export interface ProductSearchOptions {
  maxResults?: number;
  minScore?: number;
  exactOnly?: boolean;
}

// =====================================================
// NORMALIZE TEXT
// =====================================================

function normalize(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .toLowerCase()
    .replace(/&amp;/gi, "and")
    .replace(/&nbsp;/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// TOKEN HELPERS
// =====================================================

function tokens(value: unknown): string[] {
  return normalize(value)
    .split(" ")
    .filter((word) => word.length >= 2);
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "am",
  "do",
  "does",
  "did",
  "you",
  "have",
  "has",
  "had",
  "any",
  "some",
  "show",
  "me",
  "please",
  "want",
  "need",
  "looking",
  "look",
  "for",
  "find",
  "give",
  "get",
  "can",
  "could",
  "would",
  "your",
  "my",
  "we",
  "our",
  "i",
  "im",
  "its",
  "this",
  "that",
  "these",
  "those",
  "what",
  "which",
  "where",
  "how",
  "much",
  "many",
  "tell",
  "about",
  "product",
  "products",
  "item",
  "items",
  "available",
  "there",
  "please",
  "sell",
  "sale",
]);

function importantTerms(value: unknown): string[] {
  return tokens(value).filter(
    (word) => !STOP_WORDS.has(word)
  );
}

// =====================================================
// SYNONYMS
// =====================================================

const SYNONYMS: Record<string, string[]> = {
  dress: ["dress", "dresses", "outfit", "suit", "3pc", "3pcs"],
  dresses: ["dress", "dresses", "outfit", "suit", "3pc", "3pcs"],
  outfit: ["outfit", "dress", "dresses", "suit"],
  suit: ["suit", "outfit", "dress", "dresses"],
  shirt: ["shirt", "shirts", "top", "tops"],
  shirts: ["shirt", "shirts", "top", "tops"],
  shoe: ["shoe", "shoes", "footwear"],
  shoes: ["shoe", "shoes", "footwear"],
  bag: ["bag", "bags"],
  bags: ["bag", "bags"],
  lawn: ["lawn"],
  chiffon: ["chiffon"],
  embroidered: ["embroidered", "embroidery", "embroider"],
  embroidery: ["embroidered", "embroidery", "embroider"],
  printed: ["printed", "print"],
  print: ["printed", "print"],
  black: ["black", "blk"],
  white: ["white", "offwhite", "off", "ivory"],
  red: ["red", "maroon", "burgundy"],
  blue: ["blue", "navy", "royal"],
  green: ["green", "olive", "sage"],
  pink: ["pink", "rose", "peach"],
  purple: ["purple", "plum", "lavender"],
  brown: ["brown", "beige", "camel"],
};

function expandedTerms(value: unknown): Set<string> {
  const result = new Set<string>();

  for (const term of importantTerms(value)) {
    result.add(term);

    const synonyms = SYNONYMS[term];

    if (synonyms) {
      for (const synonym of synonyms) {
        result.add(synonym);
      }
    }
  }

  return result;
}

// =====================================================
// PRODUCT FIELD HELPERS
// =====================================================

function getProductName(product: any): string {
  return cleanProductName(
    product?.name ||
      product?.title ||
      product?.product_name ||
      product?.page_title ||
      ""
  );
}

function getProductDescription(product: any): string {
  return cleanProductDescription(
    product?.description ||
      product?.content ||
      product?.body_html ||
      ""
  );
}

function getProductUrl(product: any): string {
  return cleanProductUrl(
    product?.productUrl ||
      product?.product_url ||
      product?.url ||
      product?.page_url ||
      product?.source_url ||
      ""
  );
}

function getProductImage(product: any): string {
  return cleanProductImageUrl(
    product?.imageUrl ||
      product?.image_url ||
      product?.image ||
      product?.featured_image ||
      product?.featuredImage ||
      product?.thumbnail ||
      ""
  );
}

function getProductAvailability(product: any): boolean | undefined {
  if (typeof product?.available === "boolean") {
    return product.available;
  }

  if (typeof product?.available_for_sale === "boolean") {
    return product.available_for_sale;
  }

  if (typeof product?.availableForSale === "boolean") {
    return product.availableForSale;
  }

  if (typeof product?.in_stock === "boolean") {
    return product.in_stock;
  }

  if (typeof product?.inventory_quantity === "number") {
    return product.inventory_quantity > 0;
  }

  return cleanProductAvailability(product?.availability);
}

function getCollectionNames(product: any): string[] {
  const values: string[] = [];

  if (Array.isArray(product?.collectionNames)) {
    values.push(
      ...product.collectionNames.map((item: unknown) =>
        String(item || "")
      )
    );
  }

  if (Array.isArray(product?.collections)) {
    values.push(
      ...product.collections.map((collection: any) =>
        typeof collection === "string"
          ? collection
          : collection?.name || collection?.title || ""
      )
    );
  }

  if (typeof product?.collection_name === "string") {
    values.push(product.collection_name);
  }

  if (typeof product?.category === "string") {
    values.push(product.category);
  }

  return uniqueStrings(values);
}

function getCollectionUrls(product: any): string[] {
  const values: string[] = [];

  if (Array.isArray(product?.collectionUrls)) {
    values.push(
      ...product.collectionUrls.map((item: unknown) =>
        String(item || "")
      )
    );
  }

  if (Array.isArray(product?.collections)) {
    values.push(
      ...product.collections.map((collection: any) =>
        typeof collection === "object"
          ? collection?.url || collection?.page_url || ""
          : ""
      )
    );
  }

  return uniqueUrls(values);
}

function getSku(product: any): string {
  const direct =
    product?.sku ||
    product?.variant_sku ||
    product?.external_id ||
    "";
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim().replace(/-\d{6,}$/, "");
  }

  const raw = String(
    product?.content ||
      product?.description ||
      product?.body_html ||
      product?.html ||
      ""
  );
  if (!raw) return "";

  const patterns = [
    /\bSKU\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9._-]{2,})/i,
    /\b(?:MODEL|STYLE|PRODUCT)\s*(?:NO|CODE|NUMBER|#)?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9._-]{2,})/i,
    /\b([A-Z]{1,4}\d{2,}[A-Za-z0-9._-]*[A-Z0-9]?)\b/i,
  ];

  for (const pattern of patterns) {
    const m = raw.match(pattern);
    const code = m && m[1] ? m[1].trim() : "";
    if (
      code &&
      code.length >= 4 &&
      /[A-Za-z]/.test(code) &&
      /\d/.test(code)
    ) {
      const stripped = code.replace(/-\d{6,}$/, "");
      return stripped || code;
    }
  }

  return "";
}

function getSearchableProductText(product: any): string {
  return [
    getProductName(product),
    getProductDescription(product),
    getCollectionNames(product).join(" "),
    product?.tags,
    product?.tag,
    product?.type,
    product?.product_type,
    product?.vendor,
    product?.sku || getSku(product),
    product?.externalId,
    product?.product_id,
    product?.color,
    product?.colour,
    product?.material,
    product?.category,
  ]
    .filter(Boolean)
    .join(" ");
}

// =====================================================
// NORMALIZE PRODUCT
// =====================================================

export function normalizeProduct(product: any) {
  if (!product) {
    return null;
  }

  const name = getProductName(product);
  const url = getProductUrl(product);
  const imageUrl = getProductImage(product);

  const rawPrice =
    product?.price ??
    product?.min_price ??
    product?.amount ??
    product?.price_amount ??
    "";

  const price = cleanProductPrice(rawPrice);
  const available = getProductAvailability(product);

  return {
    ...product,

    name,
    title: name,

    description: getProductDescription(product),

    price: price || undefined,

    productUrl: url,
    url,

    imageUrl: imageUrl || undefined,

    available,

    sku: getSku(product),

    collectionNames: getCollectionNames(product),
    collectionUrls: getCollectionUrls(product),
  };
}

// =====================================================
// FIELD MATCH SCORE
// =====================================================

function fieldMatchScore(
  queryTerms: Set<string>,
  fieldValue: unknown,
  weight: number
): number {
  const fieldTerms = new Set(tokens(fieldValue));

  if (queryTerms.size === 0 || fieldTerms.size === 0) {
    return 0;
  }

  let matched = 0;

  for (const queryTerm of queryTerms) {
    if (fieldTerms.has(queryTerm)) {
      matched++;
      continue;
    }

    const synonyms = SYNONYMS[queryTerm] || [];

    if (synonyms.some((word) => fieldTerms.has(word))) {
      matched++;
    }
  }

  return (matched / queryTerms.size) * weight;
}

// =====================================================
// PRODUCT SCORE
// =====================================================

export function similarityScore(
  query: string,
  title: string
): number {
  const q = normalize(query);
  const t = normalize(title);

  if (!q || !t) {
    return 0;
  }

  if (q === t) {
    return 100;
  }

  if (q.includes(t) && t.length >= 5) {
    return 98;
  }

  if (t.includes(q) && q.length >= 5) {
    return 96;
  }

  const queryTerms = expandedTerms(query);
  const titleTerms = new Set(tokens(title));

  if (queryTerms.size === 0 || titleTerms.size === 0) {
    return 0;
  }

  let matched = 0;

  for (const term of queryTerms) {
    if (titleTerms.has(term)) {
      matched++;
    }
  }

  return Math.min(
    95,
    Math.round((matched / queryTerms.size) * 90)
  );
}

// =====================================================
// FULL PRODUCT SCORE
// =====================================================

function scoreProduct(
  product: any,
  query: string
): number {
  const normalized = normalizeProduct(product);

  if (!normalized) {
    return 0;
  }

  const queryText = normalize(query);

  if (!queryText) {
    return 0;
  }

  const name = getProductName(normalized);
  const description = getProductDescription(normalized);
  const collections = getCollectionNames(normalized).join(" ");

  const exactName = normalize(name);

  // Exact product title is always strongest.
  if (exactName === queryText) {
    return 100;
  }

  if (
    exactName.length >= 5 &&
    queryText.includes(exactName)
  ) {
    return 99;
  }

  let score = 0;

  const queryTerms = expandedTerms(query);

  // Product title is the most important field.
  score += fieldMatchScore(
    queryTerms,
    name,
    65
  );

  // Description helps with color/type/material.
  score += fieldMatchScore(
    queryTerms,
    description,
    18
  );

  // Collections/categories help for collection queries.
  score += fieldMatchScore(
    queryTerms,
    collections,
    15
  );

  // Tags/type/vendor/SKU and other metadata.
  score += fieldMatchScore(
    queryTerms,
    getSearchableProductText(normalized),
    10
  );

  // Direct substring bonuses.
  if (
    name &&
    queryText.includes(normalize(name))
  ) {
    score += 15;
  }

  // Availability should break ties, not dominate relevance.
  if (normalized.available === true) {
    score += 2;
  }

  return Math.min(98, Math.round(score));
}

// =====================================================
// RANK PRODUCTS
// =====================================================

export function rankProducts(
  products: any[],
  query: string,
  minScore = 28
): any[] {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  return products
    .map((product): RankedProduct => ({
      product: normalizeProduct(product),
      score: scoreProduct(product, query),
    }))
    .filter(
      (item) =>
        item.product &&
        item.score >= minScore
    )
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const aAvailable = getProductAvailability(a.product);
      const bAvailable = getProductAvailability(b.product);

      if (aAvailable === true && bAvailable !== true) {
        return -1;
      }

      if (bAvailable === true && aAvailable !== true) {
        return 1;
      }

      return 0;
    })
    .map((item) => item.product);
}

// =====================================================
// EXACT PRODUCT MATCH
// =====================================================

export function findExactProduct(
  products: any[],
  query: string
) {
  if (!Array.isArray(products) || products.length === 0) {
    return null;
  }

  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return null;
  }

  // Exact normalized product title.
  const exact = products.find(
    (product) =>
      normalize(getProductName(product)) === normalizedQuery
  );

  if (exact) {
    return exact;
  }

  // Product title completely contained in the customer's
  // request. This is useful for questions like:
  // "what is the price of X?"
  const titleInsideQuery = products.find((product) => {
    const name = normalize(getProductName(product));

    return (
      name.length >= 5 &&
      normalizedQuery.includes(name)
    );
  });

  if (titleInsideQuery) {
    return titleInsideQuery;
  }

  // Concrete SKU / model code match: the query contains the product code.
  const skuMatch = products.find((product) => {
    const sku = normalize(getSku(product));
    return (
      sku &&
      sku.length >= 4 &&
      (normalizedQuery === sku || normalizedQuery.includes(sku))
    );
  });
  if (skuMatch) {
    return skuMatch;
  }

  // Strong name-only match.
  const ranked = rankProducts(products, query, 70);

  return ranked.length > 0 ? ranked[0] : null;
}

// =====================================================
// DEDUPLICATE PRODUCTS
// =====================================================
//
// IMPORTANT:
// Products with the same name but DIFFERENT URLs are
// kept. This matters when a store has color/style-specific
// product pages.
//
// We only use the normalized name as a duplicate key when
// there is no URL, ID, or SKU.
//

export function deduplicateProducts(products: any[]) {
  if (!Array.isArray(products)) {
    return [];
  }

  const seenUrls = new Set<string>();
  const seenProductIds = new Set<string>();
  const seenSkus = new Set<string>();
  const seenNameFallbacks = new Set<string>();

  const result: any[] = [];

  for (const rawProduct of products) {
    if (!rawProduct) {
      continue;
    }

    const product = normalizeProduct(rawProduct);

    if (!product || !product.name || product.name === "Product") {
      continue;
    }

    const url = normalize(product.productUrl);
    const id = normalize(
      product.id ||
        product.externalId ||
        product.product_id ||
        ""
    );
    const sku = normalize(product.sku || "");

    if (url && seenUrls.has(url)) {
      continue;
    }

    if (id && seenProductIds.has(id)) {
      continue;
    }

    if (sku && seenSkus.has(sku)) {
      continue;
    }

    // Only collapse same-name products when they have no
    // unique URL/ID/SKU. This preserves color-specific pages.
    if (
      !url &&
      !id &&
      !sku &&
      seenNameFallbacks.has(normalize(product.name))
    ) {
      continue;
    }

    if (url) {
      seenUrls.add(url);
    }

    if (id) {
      seenProductIds.add(id);
    }

    if (sku) {
      seenSkus.add(sku);
    }

    if (!url && !id && !sku) {
      seenNameFallbacks.add(normalize(product.name));
    }

    result.push(product);
  }

  return result;
}

// =====================================================
// SEARCH AND RANK
// =====================================================

export function searchAndRankProducts(
  products: any[],
  query: string,
  maxResults = 3,
  options: ProductSearchOptions = {}
): any[] {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const safeMax = Math.min(
    Math.max(options.maxResults ?? maxResults, 1),
    3
  );

  const unique = deduplicateProducts(products);

  if (unique.length === 0) {
    return [];
  }

  // Exact product first.
  const exact = findExactProduct(unique, query);

  if (exact) {
    const exactName = normalize(getProductName(exact));
    const normalizedQuery = normalize(query);

    if (
      exactName === normalizedQuery ||
      (
        exactName.length >= 5 &&
        normalizedQuery.includes(exactName)
      )
    ) {
      return [normalizeProduct(exact)].filter(Boolean);
    }
  }

  const ranked = rankProducts(
    unique,
    query,
    options.minScore ?? 28
  );

  if (options.exactOnly) {
    return ranked.filter(
      (product) =>
        scoreProduct(product, query) >= 85
    ).slice(0, safeMax);
  }

  return ranked
    .slice(0, safeMax)
    .map((product) => normalizeProduct(product))
    .filter(Boolean);
}

// =====================================================
// PRODUCT RESULT LIMIT
// =====================================================

export function limitProducts(
  products: any[],
  max = 3
): any[] {
  if (!Array.isArray(products)) {
    return [];
  }

  return products
    .slice(0, Math.min(Math.max(max, 1), 3))
    .map((product) => normalizeProduct(product))
    .filter(Boolean);
}

// =====================================================
// RELATED PRODUCT SEARCH
// =====================================================
//
// Used when an exact product is not found. This gives the
// caller a controlled related-product fallback instead of
// immediately saying "I couldn't find that product."
//

export function searchRelatedProducts(
  products: any[],
  query: string,
  maxResults = 3
): any[] {
  return searchAndRankProducts(
    products,
    query,
    maxResults,
    {
      minScore: 20,
    }
  );
}

// =====================================================
// PRODUCT SEARCH INTELLIGENCE
// =====================================================
//
// Returns useful information for /api/chat so it can decide
// whether the customer asked for an exact item or related
// options.
//

export function analyzeProductSearch(
  products: any[],
  query: string
) {
  const unique = deduplicateProducts(products);

  const exact = findExactProduct(unique, query);

  const ranked = rankProducts(
    unique,
    query,
    20
  );

  return {
    exactProduct: exact
      ? normalizeProduct(exact)
      : null,

    results: ranked.slice(0, 3),

    hasResults: ranked.length > 0,

    resultCount: ranked.length,

    topScore:
      ranked.length > 0
        ? scoreProduct(ranked[0], query)
        : 0,
  };
}
