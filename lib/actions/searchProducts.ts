import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// =====================================================
// TYPES
// =====================================================

export interface ProductSearchResult {
  id: string;
  externalId?: string;
  name: string;
  title?: string;
  url: string;
  productUrl?: string;
  description: string;
  price?: string;
  currency?: string;
  available?: boolean;
  imageUrl?: string;
  sku?: string;
  collectionNames?: string[];
  collectionUrls?: string[];
  pageType?: string;
  metadata?: Record<string, unknown>;
}

interface PriceFilter {
  min?: number;
  max?: number;
  currency?: string;
  operator?: "lt" | "lte" | "gt" | "gte" | "between" | "exact";
}

interface SizeFilter {
  values: string[];
  numericValues: number[];
}

interface SearchAnalysis {
  originalQuery: string;
  cleanedQuery: string;
  words: string[];
  requiredTerms: string[];
  attributeTerms: string[];
  categoryTerms: string[];
  colorTerms: string[];
  otherTerms: string[];
  broadCatalog: boolean;
  priceOnly: boolean;
  availabilityOnly: boolean;
  priceFilter?: PriceFilter;
  sizeFilter?: SizeFilter;
}

interface ProductFields {
  title: string;
  content: string;
  metadata: string;
  collections: string;
  url: string;
  all: string;
}

interface ScoredProduct {
  product: any;
  score: number;
}

// =====================================================
// CONFIG
// =====================================================

const MAX_DATABASE_PRODUCTS = 1000;
const MAX_RESULTS = 3;
const MIN_RELEVANCE_SCORE = 30;
const RELATED_MIN_SCORE = 18;

// =====================================================
// NORMALIZATION
// =====================================================

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x20;/gi, " ")
    .replace(/&#32;/gi, " ")
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCharCode(Number(n));
      } catch {
        return " ";
      }
    });
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";

  return decodeEntities(String(value))
    .toLowerCase()
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\p{L}\p{N}\s._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHtml(value: unknown): string {
  if (value === null || value === undefined) return "";

  return decodeEntities(String(value))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// WORD NORMALIZATION
// =====================================================

function normalizeSearchWord(word: string): string {
  const normalized = normalizeText(word);
  if (!normalized) return "";

  const protectedWords = new Set([
    "xs", "s", "m", "l", "xl", "xxl", "xxxl", "2xl", "3xl", "4xl",
    "2pc", "2pcs", "3pc", "3pcs", "tshirt",
  ]);

  if (protectedWords.has(normalized)) return normalized;

  if (normalized.endsWith("ies") && normalized.length > 4) {
    return normalized.slice(0, -3) + "y";
  }

  // dresses -> dress, shirts -> shirt, etc.
  if (normalized.endsWith("es") && normalized.length > 4) {
    const stem = normalized.slice(0, -2);
    if (stem.endsWith("ss")) return normalized;
    return stem;
  }

  if (normalized.endsWith("s") && normalized.length > 3) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function tokenize(value: unknown): string[] {
  return normalizeText(value)
    .split(" ")
    .map(normalizeSearchWord)
    .filter(Boolean);
}

// =====================================================
// SEARCH TAXONOMY
// =====================================================

// IMPORTANT: aliases within a category describe the same intent.
// Do not make "dress" and "suit" aliases: a suit should not satisfy
// a customer explicitly asking for dresses.
const CATEGORY_ALIASES: Record<string, string[]> = {
  dress: ["dress", "dresses", "gown", "gowns", "frock", "frocks"],
  shirt: ["shirt", "shirts", "tshirt", "t-shirts", "tee", "tees"],
  top: ["top", "tops", "blouse", "blouses"],
  shoe: ["shoe", "shoes", "footwear", "sneaker", "sneakers"],
  bag: ["bag", "bags", "handbag", "handbags", "purse", "purses"],
  jacket: ["jacket", "jackets", "coat", "coats"],
  hoodie: ["hoodie", "hoodies"],
  trouser: ["trouser", "trousers", "pants", "pant"],
  suit: ["suit", "suits", "costume", "costumes"],
  dupatta: ["dupatta", "dupattas"],
  lawn: ["lawn"],
  chiffon: ["chiffon"],
  cambric: ["cambric"],
  cotton: ["cotton"],
  kurta: ["kurta", "kurtas"],
  kameez: ["kameez"],
  shalwar: ["shalwar", "shalwars"],
  saree: ["saree", "sarees"],
  lehenga: ["lehenga", "lehengas"],
  abaya: ["abaya", "abayas"],
  scarf: ["scarf", "scarves"],
  jeans: ["jean", "jeans"],
};

const ATTRIBUTE_ALIASES: Record<string, string[]> = {
  embroidered: ["embroidered", "embroidery", "embroider"],
  embellished: ["embellished", "embellishment", "embellish"],
  printed: ["printed", "print", "prints"],
  unstitched: ["unstitched"],
  stitched: ["stitched", "pret", "readywear", "ready-to-wear", "ready to wear"],
  formal: ["formal"],
  casual: ["casual"],
  sale: ["sale", "discount", "discounted", "offer"],
  new: ["new", "latest", "newarrival", "new-arrival", "new arrival"],
  linen: ["linen"],
  silk: ["silk"],
  velvet: ["velvet"],
  wedding: ["wedding", "bridal", "bride"],
};

const COLOR_ALIASES: Record<string, string[]> = {
  black: ["black", "blk", "jetblack", "jet black"],
  white: ["white", "offwhite", "off-white", "ivory"],
  red: ["red", "maroon", "burgundy"],
  blue: ["blue", "navy", "royal", "skyblue", "sky-blue"],
  green: ["green", "olive", "sage", "mint"],
  pink: ["pink", "rose", "peach", "blush"],
  purple: ["purple", "plum", "lavender"],
  brown: ["brown", "beige", "camel", "tan"],
  yellow: ["yellow", "mustard"],
  orange: ["orange", "rust"],
  grey: ["grey", "gray", "silver", "charcoal"],
  cream: ["cream"],
};

const SIZE_ALIASES: Record<string, string[]> = {
  xs: ["xs", "extra small", "x-small"],
  s: ["s", "small"],
  m: ["m", "medium"],
  l: ["l", "large"],
  xl: ["xl", "extra large", "x-large"],
  xxl: ["xxl", "2xl", "extra extra large", "2 x large"],
  xxxl: ["xxxl", "3xl", "3 x large"],
  "4xl": ["4xl", "4 x large"],
};

const STOP_WORDS = new Set([
  "show", "me", "find", "get", "give", "tell", "the", "a", "an",
  "some", "please", "i", "im", "i'm", "want", "need", "looking",
  "look", "for", "can", "could", "would", "will", "you", "your",
  "we", "our", "recommend", "recommendation", "something", "what",
  "which", "where", "when", "who", "do", "does", "did", "have",
  "has", "had", "is", "are", "was", "were", "there", "any",
  "sell", "selling", "offer", "offers", "products", "product",
  "items", "item", "to", "buy", "purchase", "price", "prices",
  "cost", "costs", "much", "many", "it", "its", "this", "that",
  "these", "those", "they", "them", "about", "on", "in", "of",
  "with", "u", "kindly", "please",
]);

const CONTROL_WORDS = new Set([
  "under", "below", "less", "than", "over", "above", "more",
  "starting", "from", "between", "and", "size", "sizes",
  "up", "at", "most", "least", "maximum", "minimum",
]);

// =====================================================
// ALIAS / MATCH HELPERS
// =====================================================

function expandAlias(
  value: string,
  groups: Record<string, string[]>
): string[] {
  const normalized = normalizeSearchWord(value);

  for (const [canonical, aliases] of Object.entries(groups)) {
    const all = [canonical, ...aliases].map(normalizeSearchWord);
    if (all.includes(normalized)) return Array.from(new Set(all));
  }

  return [normalized];
}

function phraseMatchesText(text: string, phrase: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedPhrase = normalizeText(phrase);
  return Boolean(normalizedText && normalizedPhrase && normalizedText.includes(normalizedPhrase));
}

function termMatchesText(text: string, term: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeSearchWord(term);

  if (!normalizedText || !normalizedTerm) return false;

  // Phrase terms need phrase matching.
  if (normalizedTerm.includes(" ")) {
    return normalizedText.includes(normalizedTerm);
  }

  return normalizedText.split(" ").some(
    (word) => word === normalizedTerm || word.startsWith(normalizedTerm)
  );
}

function matchesAnyAlias(text: string, canonical: string, groups: Record<string, string[]>): boolean {
  return expandAlias(canonical, groups).some((alias) => termMatchesText(text, alias));
}

function countMatchingTerms(text: string, terms: string[]): number {
  return terms.reduce((count, term) => count + (termMatchesText(text, term) ? 1 : 0), 0);
}

// =====================================================
// PRODUCT FIELD EXTRACTION
// =====================================================

function getTitle(product: any): string {
  return cleanHtml(
    product?.title ||
      product?.name ||
      product?.page_title ||
      product?.seo_title ||
      ""
  );
}

function getRawContent(product: any): string {
  return String(
    product?.content ||
      product?.description ||
      product?.body_html ||
      product?.html ||
      ""
  );
}

function getContent(product: any): string {
  return cleanHtml(getRawContent(product));
}

function getSku(product: any): string {
  const direct =
    product?.sku ||
    product?.variant_sku ||
    product?.external_id ||
    "";
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const raw = getRawContent(product);
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
      // Always return the base product code: strip a trailing long
      // numeric inventory suffix (e.g. FSP1266-YELLOW-2000000221311 ->
      // FSP1266-YELLOW) so it matches what is read on packaging/photos.
      const stripped = code.replace(/-\d{6,}$/, "");
      return stripped || code;
    }
  }

  return "";
}
function getProductUrl(product: any): string {
  const value =
    product?.productUrl ||
    product?.product_url ||
    product?.url ||
    product?.page_url ||
    product?.source_url ||
    "";

  if (typeof value !== "string" || !value.trim()) return "";
  return value.trim().replace(/[),.;]+$/, "");
}

function getCollectionNames(product: any): string[] {
  const values: string[] = [];

  for (const key of ["collectionNames", "collection_names"]) {
    if (Array.isArray(product?.[key])) {
      values.push(
        ...product[key]
          .map((v: unknown) => String(v || "").trim())
          .filter(Boolean)
      );
    }
  }

  if (Array.isArray(product?.collections)) {
    for (const collection of product.collections) {
      if (typeof collection === "string") {
        values.push(collection.trim());
      } else if (collection && typeof collection === "object") {
        values.push(
          String(
            collection.name ||
              collection.title ||
              collection.collection_name ||
              ""
          ).trim()
        );
      }
    }
  }

  for (const key of ["collection_name", "category_name"]) {
    if (typeof product?.[key] === "string" && product[key].trim()) {
      values.push(product[key].trim());
    }
  }

  return Array.from(new Set(values.filter(Boolean)));
}

function getCollectionUrls(product: any): string[] {
  const values: string[] = [];

  for (const key of ["collectionUrls", "collection_urls"]) {
    if (Array.isArray(product?.[key])) {
      values.push(
        ...product[key]
          .map((v: unknown) => String(v || "").trim())
          .filter(Boolean)
      );
    }
  }

  if (Array.isArray(product?.collections)) {
    for (const collection of product.collections) {
      if (collection && typeof collection === "object") {
        const url =
          collection.url ||
          collection.page_url ||
          collection.collection_url ||
          "";
        if (url) values.push(String(url).trim());
      }
    }
  }

  return Array.from(new Set(values.filter(Boolean)));
}

function getSearchableMetadata(product: any): string {
  const scalarKeys = [
    "tags",
    "tag",
    "type",
    "product_type",
    "productType",
    "vendor",
    "sku",
    "color",
    "colour",
    "material",
    "category",
    "category_name",
    "gender",
    "handle",
    "sizes",
    "size",
    "available_sizes",
    "availableSizes",
    "variant_sizes",
    "variantSizes",
    "variants",
    "options",
  ];

  const values: string[] = [];

  for (const key of scalarKeys) {
    const value = product?.[key];
    if (Array.isArray(value)) {
      values.push(...value.map((v: unknown) => String(v || "")));
    } else if (value !== null && value !== undefined) {
      values.push(String(value));
    }
  }

  const extractedSku = getSku(product);
  if (extractedSku && !values.includes(extractedSku)) values.push(extractedSku);

  return values.filter(Boolean).join(" ");
}

function getProductFields(product: any): ProductFields {
  const title = normalizeText(getTitle(product));
  const content = normalizeText(getContent(product));
  const metadata = normalizeText(getSearchableMetadata(product));
  const collections = normalizeText(getCollectionNames(product).join(" "));
  const url = normalizeText(getProductUrl(product));

  return {
    title,
    content,
    metadata,
    collections,
    url,
    all: normalizeText([title, content, metadata, collections, url].join(" ")),
  };
}

// =====================================================
// URL / IMAGE HELPERS
// =====================================================

function resolveUrl(candidate: string, baseUrl?: string): string {
  const value = String(candidate || "")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/gi, "&")
    .trim();

  if (!value) return "";

  try {
    if (/^https?:\/\//i.test(value)) return value;
    if (/^\/\//.test(value)) return `https:${value}`;
    if (baseUrl) return new URL(value, baseUrl).toString();
  } catch {
    // Fall through and return the original value.
  }

  return value;
}

function isUsableHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value);
}

function extractImageUrl(product: any): string | undefined {
  const pageUrl = getProductUrl(product);

  const directCandidates = [
    product?.imageUrl,
    product?.image_url,
    product?.image,
    product?.featured_image,
    product?.featuredImage,
    product?.thumbnail,
    product?.thumbnail_url,
    product?.image_src,
    product?.og_image,
    product?.ogImage,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      const url = resolveUrl(candidate, pageUrl);
      if (isUsableHttpUrl(url)) return url;
    } else if (candidate && typeof candidate === "object") {
      const nested =
        candidate.src ||
        candidate.url ||
        candidate.srcset ||
        candidate.original ||
        candidate.originalSrc ||
        "";
      if (nested) {
        const first = String(nested).split(",")[0].trim().split(/\s+/)[0];
        const url = resolveUrl(first, pageUrl);
        if (isUsableHttpUrl(url)) return url;
      }
    }
  }

  const raw = getRawContent(product);
  if (!raw) return undefined;

  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /["']image["']\s*:\s*["']([^"']+)["']/i,
    /["']image_url["']\s*:\s*["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) {
      const url = resolveUrl(match[1], pageUrl);
      if (isUsableHttpUrl(url)) return url;
    }
  }

  // Shopify/CDN image URLs do not always have a file extension.
  const srcPatterns = [
    /(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/gi,
    /srcset=["']([^"']+)["']/gi,
  ];

  for (const pattern of srcPatterns) {
    const matches = Array.from(raw.matchAll(pattern));
    for (const match of matches) {
      const source = String(match[1] || "").split(",")[0].trim().split(/\s+/)[0];
      if (!source) continue;

      const url = resolveUrl(source, pageUrl);
      if (
        isUsableHttpUrl(url) &&
        /(?:cdn|shopify|image|img|media|upload|products|files)/i.test(url)
      ) {
        return url;
      }
    }
  }

  return undefined;
}

// =====================================================
// PRICE
// =====================================================

function parseMoneyValue(value: string): number | undefined {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  const match = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return undefined;

  const number = Number(match[1]);
  return Number.isFinite(number) ? number : undefined;
}

function detectCurrencyFromText(value: string): string | undefined {
  if (/\b(?:rs|pkr)\b|₨/i.test(value)) return "PKR";
  if (/\busd\b|\$/i.test(value)) return "USD";
  if (/\beur\b|€/i.test(value)) return "EUR";
  if (/\bgbp\b|£/i.test(value)) return "GBP";
  return undefined;
}

function parsePriceFilter(query: string): PriceFilter | undefined {
  const currency = detectCurrencyFromText(query);
  const text = String(query || "");

  // 5k-10k / 5k to 10k
  let match = text.match(
    /\b(\d+(?:\.\d+)?)\s*k\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*k\b/i
  );
  if (match) {
    const min = Number(match[1]) * 1000;
    const max = Number(match[2]) * 1000;
    return {
      min: Math.min(min, max),
      max: Math.max(min, max),
      currency,
      operator: "between",
    };
  }

  // under 5k / below 5k / up to 5k
  match = text.match(
    /\b(?:under|below|less than|up to|max(?:imum)?(?: of)?|at most)\s+(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?(\d+(?:\.\d+)?)\s*k\b/i
  );
  if (match) {
    const max = Number(match[1]) * 1000;
    const operator = /\bup to|max(?:imum)?|at most/i.test(match[0]) ? "lte" : "lt";
    return { max, currency, operator };
  }

  // above 5k / over 5k / from 5k
  match = text.match(
    /\b(?:over|above|more than|starting from|from|at least)\s+(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?(\d+(?:\.\d+)?)\s*k\b/i
  );
  if (match) {
    const min = Number(match[1]) * 1000;
    const operator = /\bstarting from|from|at least/i.test(match[0]) ? "gte" : "gt";
    return { min, currency, operator };
  }

  // between 5,000 and 10,000
  match = text.match(
    /\bbetween\s+((?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)?\s*[\d,]+(?:\.\d{1,2})?)\s+(?:and|to|-)\s+((?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)?\s*[\d,]+(?:\.\d{1,2})?)/i
  );
  if (match) {
    const min = parseMoneyValue(match[1]);
    const max = parseMoneyValue(match[2]);
    if (min !== undefined && max !== undefined) {
      return {
        min: Math.min(min, max),
        max: Math.max(min, max),
        currency,
        operator: "between",
      };
    }
  }

  // 5000-10000 / 5000 to 10000
  match = text.match(
    /\b((?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)?\s*[\d,]+(?:\.\d{1,2})?)\s*(?:-|to)\s*((?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)?\s*[\d,]+(?:\.\d{1,2})?)\b/i
  );
  if (match) {
    const min = parseMoneyValue(match[1]);
    const max = parseMoneyValue(match[2]);
    if (min !== undefined && max !== undefined) {
      return {
        min: Math.min(min, max),
        max: Math.max(min, max),
        currency,
        operator: "between",
      };
    }
  }

  // under/below/less than/up to
  match = text.match(
    /\b(?:under|below|less than|up to|max(?:imum)?(?: of)?|at most)\s+(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?([\d,]+(?:\.\d{1,2})?)/i
  );
  if (match) {
    const max = parseMoneyValue(match[1]);
    if (max !== undefined) {
      const operator = /\bup to|max(?:imum)?|at most/i.test(match[0]) ? "lte" : "lt";
      return { max, currency, operator };
    }
  }

  // over/above/more than/from
  match = text.match(
    /\b(?:over|above|more than|starting from|from|at least)\s+(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?([\d,]+(?:\.\d{1,2})?)/i
  );
  if (match) {
    const min = parseMoneyValue(match[1]);
    if (min !== undefined) {
      const operator = /\bstarting from|from|at least/i.test(match[0]) ? "gte" : "gt";
      return { min, currency, operator };
    }
  }

  // exact price
  match = text.match(
    /\b(?:price|cost|for|at)\s+(?:(?:rs\.?|pkr|₨|\$|usd|€|eur|£|gbp)\s*)?([\d,]+(?:\.\d{1,2})?)/i
  );
  if (match) {
    const exact = parseMoneyValue(match[1]);
    if (exact !== undefined) {
      return {
        min: exact,
        max: exact,
        currency,
        operator: "exact",
      };
    }
  }

  return undefined;
}

function extractPrice(product: any): string | undefined {
  const directCandidates = [
    product?.price,
    product?.min_price,
    product?.minPrice,
    product?.amount,
    product?.price_amount,
    product?.priceAmount,
    product?.display_price,
    product?.compare_at_price,
  ];

  for (const value of directCandidates) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim()
    ) {
      return cleanHtml(value).trim();
    }
  }

  const raw = getRawContent(product);
  const content = getContent(product);

  const patterns = [
    /Rs\.?\s?[\d,]+(?:\.\d{1,2})?/i,
    /PKR\s?[\d,]+(?:\.\d{1,2})?/i,
    /₨\s?[\d,]+(?:\.\d{1,2})?/i,
    /\$\s?[\d,]+(?:\.\d{1,2})?/,
    /USD\s?[\d,]+(?:\.\d{1,2})?/i,
    /€\s?[\d,]+(?:\.\d{1,2})?/,
    /EUR\s?[\d,]+(?:\.\d{1,2})?/i,
    /£\s?[\d,]+(?:\.\d{1,2})?/,
    /GBP\s?[\d,]+(?:\.\d{1,2})?/i,
  ];

  for (const source of [raw, content]) {
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match?.[0]) return cleanHtml(match[0]).trim();
    }
  }

  return undefined;
}

function extractNumericPrice(product: any): number | undefined {
  const candidates = [
    product?.price,
    product?.min_price,
    product?.minPrice,
    product?.amount,
    product?.price_amount,
    product?.priceAmount,
    product?.display_price,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = parseMoneyValue(value);
      if (parsed !== undefined) return parsed;
    }
  }

  const extracted = extractPrice(product);
  return extracted ? parseMoneyValue(extracted) : undefined;
}

function detectCurrency(product: any, price?: string): string | undefined {
  const direct = product?.currency || product?.price_currency || product?.currency_code;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return detectCurrencyFromText(String(price || ""));
}

// =====================================================
// AVAILABILITY
// =====================================================

function getAvailability(product: any): boolean | undefined {
  for (const key of [
    "available",
    "available_for_sale",
    "availableForSale",
    "in_stock",
    "inStock",
  ]) {
    if (typeof product?.[key] === "boolean") return product[key];
  }

  for (const key of ["inventory_quantity", "inventoryQuantity"]) {
    if (typeof product?.[key] === "number") return product[key] > 0;
  }

  const raw = normalizeText(getRawContent(product));

  if (
    /\bout of stock\b|\bsold out\b|\bcurrently unavailable\b|\bunavailable\b/.test(raw)
  ) {
    return false;
  }

  if (
    /\bin stock\b|\bavailable\b|\badd to cart\b|\bbuy now\b/.test(raw)
  ) {
    return true;
  }

  return undefined;
}

// =====================================================
// SIZE
// =====================================================

function getProductSizeText(product: any): string {
  const values: string[] = [];

  for (const key of [
    "size",
    "sizes",
    "available_sizes",
    "availableSizes",
    "variant_sizes",
    "variantSizes",
  ]) {
    const value = product?.[key];

    if (Array.isArray(value)) {
      values.push(...value.map((v: unknown) => String(v || "")));
    } else if (value !== null && value !== undefined) {
      values.push(String(value));
    }
  }

  for (const key of ["variants", "options"]) {
    const value = product?.[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          values.push(item);
        } else if (item && typeof item === "object") {
          values.push(
            String(
              item.size ||
                item.title ||
                item.name ||
                item.option ||
                item.value ||
                ""
            )
          );

          if (Array.isArray(item.options)) {
            values.push(...item.options.map((v: unknown) => String(v || "")));
          }
        }
      }
    } else if (value !== null && value !== undefined) {
      values.push(String(value));
    }
  }

  return [values.join(" "), getTitle(product), getContent(product)].join(" ");
}

function normalizeSize(value: string): string {
  return normalizeText(value).replace(/\s+/g, "").replace(/size/g, "");
}

function parseSizeFilter(query: string): SizeFilter | undefined {
  const text = normalizeText(query);
  const values = new Set<string>();
  const numericValues = new Set<number>();

  for (const [canonical, aliases] of Object.entries(SIZE_ALIASES)) {
    const found = aliases.some((alias) => {
      const normalized = normalizeText(alias);
      if (normalized.length === 1) {
        return new RegExp(`\\b${normalized}\\b`, "i").test(text);
      }
      return text.includes(normalized);
    });

    if (found) values.add(canonical);
  }

  const numericMatches = query.match(
    /\b(?:size|sizes)\s*(?:is|are|of)?\s*(\d{1,3}(?:\s*(?:,|\/|and|-|to)\s*\d{1,3})*)\b/gi
  );

  for (const phrase of numericMatches || []) {
    for (const num of phrase.match(/\d{1,3}/g) || []) {
      numericValues.add(Number(num));
    }
  }

  if (values.size === 0 && numericValues.size === 0) return undefined;

  return {
    values: Array.from(values),
    numericValues: Array.from(numericValues),
  };
}

function productHasSize(product: any, filter: SizeFilter): boolean {
  const text = normalizeText(getProductSizeText(product));

  for (const size of filter.values) {
    if (
      expandAlias(size, SIZE_ALIASES).some((alias) =>
        alias.includes(" ") ? phraseMatchesText(text, alias) : termMatchesText(text, alias)
      )
    ) {
      return true;
    }
  }

  for (const numeric of filter.numericValues) {
    if (new RegExp(`\\b${numeric}\\b`).test(text)) return true;
  }

  return false;
}

// =====================================================
// QUERY ANALYSIS
// =====================================================

function isBroadProductSearch(query: string): boolean {
  const text = normalizeText(query);

  const broadPhrases = [
    "what do you sell",
    "what products do you sell",
    "what products do you have",
    "which products do you have",
    "what do you have",
    "what can i buy",
    "what can i purchase",
    "show me your products",
    "show me products",
    "show your products",
    "show products",
    "all products",
    "all your products",
    "everything you have",
    "available products",
    "browse products",
    "browse your products",
    "browse",
    "shop",
    "catalog",
    "catalogue",
    "product catalog",
    "product catalogue",
  ];

  return broadPhrases.some(
    (phrase) => text === phrase || text.includes(phrase)
  );
}

function getSearchWords(query: string): string[] {
  return tokenize(query).filter((word) => !STOP_WORDS.has(word));
}

function analyzeQuery(query: string): SearchAnalysis {
  const originalQuery = String(query || "").trim();
  const cleanedQuery = normalizeText(originalQuery);
  const words = getSearchWords(originalQuery);

  const categoryTerms = new Set<string>();
  const attributeTerms = new Set<string>();
  const colorTerms = new Set<string>();

  for (const word of words) {
    for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
      const normalizedAliases = aliases.map(normalizeSearchWord);
      if (
        normalizeSearchWord(canonical) === word ||
        normalizedAliases.includes(word)
      ) {
        categoryTerms.add(normalizeSearchWord(canonical));
      }
    }

    for (const [canonical, aliases] of Object.entries(ATTRIBUTE_ALIASES)) {
      const normalizedAliases = aliases.map(normalizeSearchWord);
      if (
        normalizeSearchWord(canonical) === word ||
        normalizedAliases.includes(word)
      ) {
        attributeTerms.add(normalizeSearchWord(canonical));
      }
    }

    for (const [canonical, aliases] of Object.entries(COLOR_ALIASES)) {
      const normalizedAliases = aliases.map(normalizeSearchWord);
      if (
        normalizeSearchWord(canonical) === word ||
        normalizedAliases.includes(word)
      ) {
        colorTerms.add(normalizeSearchWord(canonical));
      }
    }
  }

  const priceFilter = parsePriceFilter(originalQuery);
  const sizeFilter = parseSizeFilter(originalQuery);

  const controlWords = new Set([
    ...CONTROL_WORDS,
    ...(priceFilter ? ["price"] : []),
  ]);

  const otherTerms = words.filter(
    (word) =>
      !categoryTerms.has(word) &&
      !attributeTerms.has(word) &&
      !colorTerms.has(word) &&
      !controlWords.has(word)
  );

  const priceOnly =
    /\b(how much|what(?:'s| is)? the price|price|prices|cost|costs)\b/i.test(originalQuery) &&
    categoryTerms.size === 0 &&
    attributeTerms.size === 0 &&
    colorTerms.size === 0 &&
    otherTerms.length === 0;

  const availabilityOnly =
    /\b(available|availability|in stock|stock)\b/i.test(originalQuery) &&
    categoryTerms.size === 0 &&
    colorTerms.size === 0 &&
    attributeTerms.size === 0 &&
    otherTerms.length === 0;

  return {
    originalQuery,
    cleanedQuery,
    words,
    requiredTerms: Array.from(
      new Set([
        ...categoryTerms,
        ...attributeTerms,
        ...colorTerms,
        ...otherTerms,
      ])
    ),
    attributeTerms: Array.from(attributeTerms),
    categoryTerms: Array.from(categoryTerms),
    colorTerms: Array.from(colorTerms),
    otherTerms,
    broadCatalog: isBroadProductSearch(originalQuery),
    priceOnly,
    availabilityOnly,
    priceFilter,
    sizeFilter,
  };
}

// =====================================================
// HARD CONSTRAINTS
// =====================================================

function getConstraintText(product: any): string {
  return getProductFields(product).all;
}

function matchesCategory(product: any, terms: string[]): boolean {
  if (!terms.length) return true;

  const fields = getProductFields(product);

  return terms.every((term) => {
    const aliases = expandAlias(term, CATEGORY_ALIASES);

    // Title / metadata / collections are stronger than body text.
    if (
      aliases.some(
        (alias) =>
          termMatchesText(fields.title, alias) ||
          termMatchesText(fields.metadata, alias) ||
          termMatchesText(fields.collections, alias)
      )
    ) {
      return true;
    }

    // URL slugs are highly useful for Shopify / WooCommerce crawls.
    if (aliases.some((alias) => termMatchesText(fields.url, alias))) {
      return true;
    }

    // Finally allow product body content.
    return aliases.some((alias) => termMatchesText(fields.content, alias));
  });
}

function matchesColor(product: any, terms: string[]): boolean {
  if (!terms.length) return true;

  const fields = getProductFields(product);

  return terms.every((term) => {
    const aliases = expandAlias(term, COLOR_ALIASES);

    if (
      aliases.some(
        (alias) =>
          termMatchesText(fields.title, alias) ||
          termMatchesText(fields.metadata, alias)
      )
    ) {
      return true;
    }

    if (aliases.some((alias) => termMatchesText(fields.url, alias))) {
      return true;
    }

    return aliases.some((alias) => termMatchesText(fields.content, alias));
  });
}

function matchesAttribute(product: any, terms: string[]): boolean {
  if (!terms.length) return true;

  const fields = getProductFields(product);

  return terms.every((term) => {
    const aliases = expandAlias(term, ATTRIBUTE_ALIASES);

    return aliases.some(
      (alias) =>
        termMatchesText(fields.title, alias) ||
        termMatchesText(fields.metadata, alias) ||
        termMatchesText(fields.collections, alias) ||
        termMatchesText(fields.url, alias) ||
        termMatchesText(fields.content, alias)
    );
  });
}

function matchesAvailability(product: any, availabilityOnly: boolean): boolean {
  if (!availabilityOnly) return true;
  return getAvailability(product) === true;
}

function productMatchesPrice(
  product: any,
  filter?: PriceFilter
): boolean {
  if (!filter) return true;

  const price = extractNumericPrice(product);
  if (price === undefined) return false;

  switch (filter.operator) {
    case "lt":
      return filter.max !== undefined && price < filter.max;
    case "lte":
      return filter.max !== undefined && price <= filter.max;
    case "gt":
      return filter.min !== undefined && price > filter.min;
    case "gte":
      return filter.min !== undefined && price >= filter.min;
    case "exact":
      return filter.min !== undefined && Math.abs(price - filter.min) < 0.01;
    case "between":
      return (
        filter.min !== undefined &&
        filter.max !== undefined &&
        price >= filter.min &&
        price <= filter.max
      );
    default:
      if (filter.min !== undefined && price < filter.min) return false;
      if (filter.max !== undefined && price > filter.max) return false;
      return true;
  }
}

// =====================================================
// SCORING
// =====================================================

function scoreProduct(product: any, analysis: SearchAnalysis): number {
  const fields = getProductFields(product);
  if (!fields.title) return 0;

  // Every explicit customer constraint is hard.
  if (!matchesCategory(product, analysis.categoryTerms)) return 0;
  if (!matchesColor(product, analysis.colorTerms)) return 0;
  if (!matchesAttribute(product, analysis.attributeTerms)) return 0;
  if (!matchesAvailability(product, analysis.availabilityOnly)) return 0;
  if (analysis.priceFilter && !productMatchesPrice(product, analysis.priceFilter)) return 0;
  if (analysis.sizeFilter && !productHasSize(product, analysis.sizeFilter)) return 0;

  let score = 0;

  const queryWords = analysis.words.filter(
    (word) => !CONTROL_WORDS.has(word) && word !== "price"
  );

  const queryPhrase = normalizeText(
    queryWords.filter(
      (word) =>
        !analysis.categoryTerms.includes(word) &&
        !analysis.attributeTerms.includes(word) &&
        !analysis.colorTerms.includes(word)
    ).join(" ")
  );

  const title = fields.title;

  // Exact product title / phrase matches.
  if (analysis.cleanedQuery === title) score += 1200;

  if (title.length >= 5 && analysis.cleanedQuery.includes(title)) {
    score += 850;
  }

  if (queryPhrase.length >= 4 && title.includes(queryPhrase)) {
    score += 550;
  }

  // Token overlap.
  const titleWords = title.split(" ");
  const titleHits = queryWords.filter((word) =>
    titleWords.some(
      (titleWord) =>
        titleWord === word ||
        titleWord.startsWith(word) ||
        word.startsWith(titleWord)
    )
  ).length;

  score += Math.min(titleHits * 70, 350);

  // Explicit category.
  for (const category of analysis.categoryTerms) {
    const aliases = expandAlias(category, CATEGORY_ALIASES);

    if (aliases.some((a) => termMatchesText(fields.title, a))) {
      score += 320;
    } else if (aliases.some((a) => termMatchesText(fields.metadata, a))) {
      score += 250;
    } else if (aliases.some((a) => termMatchesText(fields.collections, a))) {
      score += 190;
    } else if (aliases.some((a) => termMatchesText(fields.url, a))) {
      score += 170;
    } else if (aliases.some((a) => termMatchesText(fields.content, a))) {
      score += 100;
    }
  }

  // Explicit color.
  for (const color of analysis.colorTerms) {
    const aliases = expandAlias(color, COLOR_ALIASES);

    if (aliases.some((a) => termMatchesText(fields.title, a))) {
      score += 400;
    } else if (aliases.some((a) => termMatchesText(fields.metadata, a))) {
      score += 330;
    } else if (aliases.some((a) => termMatchesText(fields.url, a))) {
      score += 260;
    } else if (aliases.some((a) => termMatchesText(fields.content, a))) {
      score += 210;
    }
  }

  // Explicit attributes.
  for (const attribute of analysis.attributeTerms) {
    const aliases = expandAlias(attribute, ATTRIBUTE_ALIASES);

    if (aliases.some((a) => termMatchesText(fields.title, a))) {
      score += 260;
    } else if (aliases.some((a) => termMatchesText(fields.metadata, a))) {
      score += 220;
    } else if (aliases.some((a) => termMatchesText(fields.collections, a))) {
      score += 150;
    } else if (aliases.some((a) => termMatchesText(fields.url, a))) {
      score += 130;
    } else if (aliases.some((a) => termMatchesText(fields.content, a))) {
      score += 100;
    }
  }

  // Other meaningful terms.
  for (const word of analysis.otherTerms) {
    if (termMatchesText(fields.title, word)) score += 100;
    else if (termMatchesText(fields.metadata, word)) score += 60;
    else if (termMatchesText(fields.collections, word)) score += 45;
    else if (termMatchesText(fields.url, word)) score += 40;
    else if (termMatchesText(fields.content, word)) score += 15;
  }

  if (analysis.sizeFilter) score += 200;

  if (analysis.priceFilter) {
    score += 140;

    const price = extractNumericPrice(product);
    const min = analysis.priceFilter.min;
    const max = analysis.priceFilter.max;

    if (price !== undefined && min !== undefined && max !== undefined) {
      const midpoint = (min + max) / 2;
      const range = Math.max(max - min, 1);
      score += Math.max(0, 60 - (Math.abs(price - midpoint) / range) * 60);
    }
  }

  // Prefer available products, but never let availability override relevance.
  const available = getAvailability(product);
  if (available === true) score += 20;
  if (available === false) score -= 25;

  return score;
}

// =====================================================
// FORMATTING
// =====================================================

function cleanDescription(content: string, title: string): string {
  let description = cleanHtml(content);
  if (!description) return "";

  if (title) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    description = description.replace(new RegExp(escaped, "gi"), " ");
  }

  const garbagePatterns = [
    /skip to product information/gi,
    /skip to content/gi,
    /regular price/gi,
    /sale price/gi,
    /add to cart/gi,
    /buy it now/gi,
    /quantity/gi,
    /shipping calculated at checkout/gi,
    /form\.\.\./gi,
    /share this product/gi,
  ];

  for (const pattern of garbagePatterns) {
    description = description.replace(pattern, " ");
  }

  description = description
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (description.length > 240) {
    description = `${description.slice(0, 240).trim()}...`;
  }

  return description;
}

function formatProduct(product: any): ProductSearchResult {
  const title = getTitle(product) || "Unnamed Product";
  const url = getProductUrl(product);
  const price = extractPrice(product);

  return {
    id: String(
      product?.id ||
        product?.externalId ||
        product?.external_id ||
        product?.product_id ||
        product?.handle ||
        url ||
        title
    ),
    externalId:
      product?.externalId ||
      product?.external_id ||
      product?.product_id,
    name: title,
    title,
    url,
    productUrl: url,
    description: cleanDescription(getRawContent(product), title),
    price,
    currency: detectCurrency(product, price),
    available: getAvailability(product),
    imageUrl: extractImageUrl(product),
    sku: getSku(product),
    collectionNames: getCollectionNames(product),
    collectionUrls: getCollectionUrls(product),
    pageType: product?.page_type || "product",
    metadata: {
      source: "knowledge_pages",
      pageId: product?.id,
      pageUrl: product?.page_url,
      tags: product?.tags,
      vendor: product?.vendor,
      type: product?.type || product?.product_type,
      category: product?.category || product?.category_name,
      color: product?.color || product?.colour,
      material: product?.material,
      size: product?.size || product?.sizes,
    },
  };
}

// =====================================================
// DEDUPLICATION
// =====================================================

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return normalizeText(url).replace(/\/$/, "");
  }
}

function deduplicateProducts(products: any[]): any[] {
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const result: any[] = [];

  for (const product of products) {
    if (!product) continue;

    const formatted = formatProduct(product);
    if (!formatted.name || formatted.name === "Unnamed Product") continue;

    const url = formatted.url ? canonicalizeUrl(formatted.url) : "";
    const id = normalizeText(formatted.id);
    const name = normalizeText(formatted.name);

    if (url && seenUrls.has(url)) continue;
    if (id && seenIds.has(id)) continue;

    // Only use title as the fallback identifier when there is no
    // actual ID/URL. This avoids deleting legitimate variants/pages.
    if (!url && !id && name && seenNames.has(name)) continue;

    if (url) seenUrls.add(url);
    if (id) seenIds.add(id);
    if (!url && !id && name) seenNames.add(name);

    result.push(product);
  }

  return result;
}

// =====================================================
// SORTING
// =====================================================

function sortScoredProducts(items: ScoredProduct[]): ScoredProduct[] {
  return items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    const aAvailable = getAvailability(a.product);
    const bAvailable = getAvailability(b.product);

    if (aAvailable === true && bAvailable !== true) return -1;
    if (bAvailable === true && aAvailable !== true) return 1;

    const aPrice = extractNumericPrice(a.product);
    const bPrice = extractNumericPrice(b.product);

    if (aPrice !== undefined && bPrice !== undefined && aPrice !== bPrice) {
      return aPrice - bPrice;
    }

    return getTitle(a.product).localeCompare(getTitle(b.product));
  });
}

// =====================================================
// RANKING
// =====================================================

function rankProducts(
  products: any[],
  query: string,
  minScore = MIN_RELEVANCE_SCORE
): ScoredProduct[] {
  const analysis = analyzeQuery(query);
  const uniqueProducts = deduplicateProducts(
    Array.isArray(products) ? products : []
  );

  return sortScoredProducts(
    uniqueProducts
      .map((product) => ({
        product,
        score: scoreProduct(product, analysis),
      }))
      .filter((item) => item.score >= minScore)
  );
}

// =====================================================
// EXACT PRODUCT
// =====================================================

export function findExactProduct(
  products: any[],
  query: string
): ProductSearchResult | null {
  if (!Array.isArray(products) || !products.length) return null;

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;

  // Exact title.
  for (const product of products) {
    if (normalizeText(getTitle(product)) === normalizedQuery) {
      return formatProduct(product);
    }
  }

  // Exact SKU.
  for (const product of products) {
    const sku = normalizeText(product?.sku);
    if (sku && sku === normalizedQuery) return formatProduct(product);
  }

  // Exact URL / handle.
  for (const product of products) {
    const url = normalizeText(getProductUrl(product));
    const handle = normalizeText(product?.handle);

    if (
      (url && url === normalizedQuery) ||
      (handle && handle === normalizedQuery)
    ) {
      return formatProduct(product);
    }
  }

  // User may say "what is the price of [full product title]?"
  for (const product of products) {
    const title = normalizeText(getTitle(product));
    if (title.length >= 5 && normalizedQuery.includes(title)) {
      return formatProduct(product);
    }
  }

  return null;
}

// =====================================================
// LIMIT
// =====================================================

function safeMaxResults(maxResults: number): number {
  if (!Number.isFinite(maxResults)) return MAX_RESULTS;
  return Math.min(Math.max(Math.floor(maxResults), 1), MAX_RESULTS);
}

export function limitProducts(
  products: any[],
  max = MAX_RESULTS
): ProductSearchResult[] {
  if (!Array.isArray(products)) return [];

  return deduplicateProducts(products)
    .slice(0, safeMaxResults(max))
    .map(formatProduct);
}

// =====================================================
// SEARCH PRODUCTS - DATABASE
// =====================================================

export async function searchProducts(
  profileId: string,
  query: string
): Promise<ProductSearchResult[]> {
  console.log("=================================");
  console.log("SEARCH PRODUCTS ACTION");
  console.log("PROFILE ID:", profileId);
  console.log("QUERY:", query);
  console.log("=================================");

  if (!profileId?.trim() || !query?.trim()) return [];

  const analysis = analyzeQuery(query);

  console.log(
    "SEARCH ANALYSIS:",
    JSON.stringify(analysis, null, 2)
  );

  const { data: products, error } = await supabaseAdmin
    .from("knowledge_pages")
    .select("id, user_id, title, page_url, content, page_type")
    .eq("user_id", profileId)
    .eq("page_type", "product")
    .limit(MAX_DATABASE_PRODUCTS);

  if (error) {
    console.error("PRODUCT DATABASE ERROR:", error);
    throw new Error(
      error.message || "Unable to load products from the store catalog."
    );
  }

  if (!Array.isArray(products) || !products.length) {
    console.log("NO PRODUCT PAGES FOUND");
    return [];
  }

  const uniqueProducts = deduplicateProducts(products);

  console.log("PRODUCT PAGES FOUND:", products.length);
  console.log("UNIQUE PRODUCTS:", uniqueProducts.length);

  if (!uniqueProducts.length) return [];

  // Broad catalog.
  if (
    analysis.broadCatalog &&
    !analysis.categoryTerms.length &&
    !analysis.attributeTerms.length &&
    !analysis.colorTerms.length &&
    !analysis.otherTerms.length &&
    !analysis.priceFilter &&
    !analysis.sizeFilter
  ) {
    return uniqueProducts.slice(0, MAX_RESULTS).map(formatProduct);
  }

  // Generic price question.
  if (
    analysis.priceOnly &&
    !analysis.priceFilter &&
    !analysis.categoryTerms.length &&
    !analysis.colorTerms.length &&
    !analysis.attributeTerms.length &&
    !analysis.otherTerms.length
  ) {
    return uniqueProducts
      .filter((product) => extractNumericPrice(product) !== undefined)
      .slice(0, MAX_RESULTS)
      .map(formatProduct);
  }

  const scored = rankProducts(
    uniqueProducts,
    query,
    MIN_RELEVANCE_SCORE
  );

  console.log(
    "TOP PRODUCT SCORES:",
    scored.slice(0, 20).map((item) => ({
      title: getTitle(item.product),
      score: item.score,
      price: extractPrice(item.product),
      url: getProductUrl(item.product),
      available: getAvailability(item.product),
    }))
  );

  return scored
    .slice(0, MAX_RESULTS)
    .map((item) => formatProduct(item.product));
}

// =====================================================
// SEARCH + RANK - IN MEMORY
// =====================================================

export function searchAndRankProducts(
  products: any[],
  query: string,
  maxResults = MAX_RESULTS
): ProductSearchResult[] {
  if (!Array.isArray(products) || !products.length) return [];

  const uniqueProducts = deduplicateProducts(products);
  const analysis = analyzeQuery(query);
  const limit = safeMaxResults(maxResults);

  if (
    analysis.broadCatalog &&
    !analysis.categoryTerms.length &&
    !analysis.attributeTerms.length &&
    !analysis.colorTerms.length &&
    !analysis.otherTerms.length &&
    !analysis.priceFilter &&
    !analysis.sizeFilter
  ) {
    return uniqueProducts.slice(0, limit).map(formatProduct);
  }

  return rankProducts(uniqueProducts, query, MIN_RELEVANCE_SCORE)
    .slice(0, limit)
    .map((item) => formatProduct(item.product));
}

// =====================================================
// RELATED PRODUCT SEARCH
// =====================================================

export function searchRelatedProducts(
  products: any[],
  query: string,
  maxResults = MAX_RESULTS
): ProductSearchResult[] {
  if (!Array.isArray(products) || !products.length) return [];

  return rankProducts(
    deduplicateProducts(products),
    query,
    RELATED_MIN_SCORE
  )
    .slice(0, safeMaxResults(maxResults))
    .map((item) => formatProduct(item.product));
}

// =====================================================
// SEARCH INTELLIGENCE / DEBUG
// =====================================================

export function analyzeProductSearch(
  products: any[],
  query: string
) {
  const analysis = analyzeQuery(query);
  const uniqueProducts = deduplicateProducts(
    Array.isArray(products) ? products : []
  );

  const exact = findExactProduct(uniqueProducts, query);
  const scored = rankProducts(
    uniqueProducts,
    query,
    MIN_RELEVANCE_SCORE
  );

  return {
    exactProduct: exact,
    results: scored
      .slice(0, MAX_RESULTS)
      .map((item) => formatProduct(item.product)),
    hasResults: scored.length > 0,
    resultCount: scored.length,
    topScore: scored.length ? scored[0].score : 0,
    query: analysis.cleanedQuery,
    categoryTerms: analysis.categoryTerms,
    colorTerms: analysis.colorTerms,
    attributeTerms: analysis.attributeTerms,
    otherTerms: analysis.otherTerms,
    priceFilter: analysis.priceFilter,
    sizeFilter: analysis.sizeFilter,
    broadCatalog: analysis.broadCatalog,
    priceOnly: analysis.priceOnly,
    availabilityOnly: analysis.availabilityOnly,
  };
}
