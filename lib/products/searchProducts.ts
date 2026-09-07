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
// STRUCTURED PRICE PARSING & FILTERING
// =====================================================

export interface PriceConstraint {
  min?: number;
  max?: number;
  operator?: "lt" | "lte" | "gt" | "gte" | "between" | "exact";
  explicit: boolean;
}

export function parseMoneyValue(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/,/g, "").trim();
  const match = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return undefined;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : undefined;
}

export function getProductNumericPrice(product: any): number | undefined {
  const directCandidates = [
    product?.price,
    product?.min_price,
    product?.minPrice,
    product?.amount,
    product?.price_amount,
    product?.display_price,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
      const parsed = parseMoneyValue(candidate);
      if (parsed !== undefined) return parsed;
    }
  }

  const raw = String(product?.content || product?.description || product?.body_html || "");
  const patterns = [
    /(?:rs\.?|pkr|₨)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:\$|usd)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:€|eur)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:£|gbp)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) {
      const parsed = parseMoneyValue(match[1]);
      if (parsed !== undefined) return parsed;
    }
  }

  return undefined;
}

export function parsePriceConstraint(query: string): PriceConstraint {
  const text = String(query || "")
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return { min: undefined, max: undefined, explicit: false };
  }

  // between X and Y / X to Y / X - Y
  let match = text.match(
    /\b(?:between\s+)?(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?(\d+(?:\.\d+)?)\s*k?\s*(?:and|to|-)\s*(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?(\d+(?:\.\d+)?)\s*k?\b/i
  );
  if (match) {
    let min = Number(match[1]);
    let max = Number(match[2]);
    if (match[0].toLowerCase().includes(match[1] + "k") || (min < 100 && !text.includes("$") && !text.includes("dollar"))) min *= 1000;
    if (match[0].toLowerCase().includes(match[2] + "k") || (max < 100 && !text.includes("$") && !text.includes("dollar"))) max *= 1000;
    return {
      min: Math.min(min, max),
      max: Math.max(min, max),
      operator: "between",
      explicit: true,
    };
  }

  // under / below / less than / up to / max
  match = text.match(
    /\b(?:under|below|less than|up to|max(?:imum)?(?: of)?|at most)\s+(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?(\d+(?:\.\d+)?)\s*k?\b/i
  );
  if (match) {
    let max = Number(match[1]);
    if (match[0].toLowerCase().includes("k") || (max <= 100 && !text.includes("$") && !text.includes("dollar"))) {
      if (match[0].toLowerCase().includes("k") || max <= 100) max *= 1000;
    }
    const operator = /\bup to|max(?:imum)?|at most/i.test(match[0]) ? "lte" : "lt";
    return { max, operator, explicit: true };
  }

  // over / above / more than / starting from / from / at least
  match = text.match(
    /\b(?:over|above|more than|starting from|from|at least)\s+(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?(\d+(?:\.\d+)?)\s*k?\b/i
  );
  if (match) {
    let min = Number(match[1]);
    if (match[0].toLowerCase().includes("k") || (min <= 100 && !text.includes("$") && !text.includes("dollar"))) {
      if (match[0].toLowerCase().includes("k") || min <= 100) min *= 1000;
    }
    const operator = /\bstarting from|from|at least/i.test(match[0]) ? "gte" : "gt";
    return { min, operator, explicit: true };
  }

  return { min: undefined, max: undefined, explicit: false };
}

export function matchesPriceConstraint(
  product: any,
  constraint?: PriceConstraint
): boolean {
  if (!constraint || !constraint.explicit) return true;
  const price = getProductNumericPrice(product);
  if (price === undefined || !Number.isFinite(price)) return false;

  switch (constraint.operator) {
    case "lt":
      return constraint.max !== undefined && price < constraint.max;
    case "lte":
      return constraint.max !== undefined && price <= constraint.max;
    case "gt":
      return constraint.min !== undefined && price > constraint.min;
    case "gte":
      return constraint.min !== undefined && price >= constraint.min;
    case "between":
      return (
        constraint.min !== undefined &&
        constraint.max !== undefined &&
        price >= constraint.min &&
        price <= constraint.max
      );
    default:
      if (constraint.min !== undefined && price < constraint.min) return false;
      if (constraint.max !== undefined && price > constraint.max) return false;
      return true;
  }
}

function stripPricePhrases(query: string): string {
  return String(query || "")
    .replace(/\b(?:under|below|less than|up to|max(?:imum)?(?: of)?|at most|over|above|more than|starting from|from|at least|between)\s+(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?[\d,]+(?:\.\d{1,2})?\s*k?(?:\s*(?:and|to|-)\s*(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?[\d,]+(?:\.\d{1,2})?\s*k?)?/gi, " ")
    .replace(/\b(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\b/gi, " ")
    .replace(/\b\d+k?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericOrBroadQuery(text: string): boolean {
  const norm = normalize(text);
  if (!norm || norm.length <= 2) return true;
  const words = norm.split(" ").filter((w) => w.length >= 2);
  const genericWords = new Set([
    "anything", "something", "items", "item", "product", "products", "what", "which",
    "do", "you", "have", "sell", "show", "me", "any", "some", "all", "available",
    "can", "i", "get", "buy", "see", "options", "option", "collection", "catalogue", "catalog"
  ]);
  return words.every((w) => genericWords.has(w));
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

  // 1. Structured price filtering
  const priceConstraint = parsePriceConstraint(query);
  const priceFiltered = priceConstraint.explicit
    ? unique.filter((p) => matchesPriceConstraint(p, priceConstraint))
    : unique;

  if (priceConstraint.explicit && priceFiltered.length === 0) {
    return [];
  }

  // 2. Check if remaining query without price phrase is broad/generic
  const textQuery = stripPricePhrases(query);
  const isBroadBudget = isGenericOrBroadQuery(textQuery);

  if (priceConstraint.explicit && isBroadBudget) {
    return priceFiltered
      .sort((a, b) => {
        const aAvail = getProductAvailability(a) === true ? 1 : 0;
        const bAvail = getProductAvailability(b) === true ? 1 : 0;
        if (bAvail !== aAvail) return bAvail - aAvail;
        const aP = getProductNumericPrice(a) ?? 999999;
        const bP = getProductNumericPrice(b) ?? 999999;
        return aP - bP;
      })
      .slice(0, safeMax)
      .map((product) => normalizeProduct(product))
      .filter(Boolean);
  }

  // Exact product match first.
  const exact = findExactProduct(priceFiltered, textQuery || query);

  if (exact) {
    const exactName = normalize(getProductName(exact));
    const normalizedQuery = normalize(textQuery || query);

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

  const searchTargetQuery = textQuery && textQuery.length >= 2 ? textQuery : query;

  const ranked = rankProducts(
    priceFiltered,
    searchTargetQuery,
    options.minScore ?? 20
  );

  if (options.exactOnly) {
    return ranked.filter(
      (product) =>
        scoreProduct(product, searchTargetQuery) >= 85
    ).slice(0, safeMax);
  }

  if (ranked.length === 0 && priceConstraint.explicit) {
    return priceFiltered
      .slice(0, safeMax)
      .map((product) => normalizeProduct(product))
      .filter(Boolean);
  }

  return ranked
    .slice(0, safeMax)
    .map((product) => normalizeProduct(product))
    .filter(Boolean);
}

// =====================================================
// SIMILAR PRODUCT RECOMMENDATION
// =====================================================

export function findSimilarProducts(
  products: any[],
  targetProduct: any,
  maxResults = 3,
  priceConstraint?: PriceConstraint
): any[] {
  if (!Array.isArray(products) || !targetProduct) return [];
  const unique = deduplicateProducts(products);

  const targetId = normalize(
    targetProduct?.id ||
    targetProduct?.externalId ||
    targetProduct?.external_id ||
    targetProduct?.productId ||
    ""
  );
  const targetName = normalize(getProductName(targetProduct));
  const targetUrl = normalize(getProductUrl(targetProduct));

  // Exclude the exact referenced product
  const candidates = unique.filter((p) => {
    const pId = normalize(p?.id || p?.externalId || p?.external_id || p?.productId || "");
    const pName = normalize(getProductName(p));
    const pUrl = normalize(getProductUrl(p));

    if (targetId && pId && targetId === pId) return false;
    if (targetUrl && pUrl && targetUrl === pUrl) return false;
    if (targetName && pName && targetName === pName) return false;
    return true;
  });

  const priceFiltered = priceConstraint && priceConstraint.explicit
    ? candidates.filter((p) => matchesPriceConstraint(p, priceConstraint))
    : candidates;

  if (priceFiltered.length === 0) return [];

  const targetTokens = new Set(
    tokens(
      [
        getProductName(targetProduct),
        getCollectionNames(targetProduct).join(" "),
        targetProduct?.tags,
        targetProduct?.product_type,
        targetProduct?.type,
        targetProduct?.vendor,
      ]
        .filter(Boolean)
        .join(" ")
    ).filter((w) => !STOP_WORDS.has(w) && w.length >= 3)
  );

  const scored = priceFiltered.map((p) => {
    const pTokens = new Set(
      tokens(
        [
          getProductName(p),
          getCollectionNames(p).join(" "),
          p?.tags,
          p?.product_type,
          p?.type,
          p?.vendor,
        ]
          .filter(Boolean)
          .join(" ")
      ).filter((w) => !STOP_WORDS.has(w) && w.length >= 3)
    );

    let matchCount = 0;
    for (const t of targetTokens) {
      if (pTokens.has(t)) matchCount += 10;
      else {
        const syns = SYNONYMS[t] || [];
        if (syns.some((s) => pTokens.has(s))) matchCount += 5;
      }
    }

    if (getProductAvailability(p) === true) matchCount += 2;

    return { product: p, score: matchCount };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored
    .slice(0, Math.min(Math.max(maxResults, 1), 3))
    .map((item) => normalizeProduct(item.product))
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
