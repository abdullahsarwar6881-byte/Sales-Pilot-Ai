// =====================================================
// CLEAN PRODUCT TYPE
// =====================================================

export interface CleanProduct {
  id?: string;

  externalId?: string;

  name: string;

  description?: string;

  price?: string;

  currency?: string;

  available?: boolean;

  imageUrl?: string;

  productUrl: string;

  sku?: string;

  collectionNames?: string[];

  collectionUrls?: string[];
}

// =====================================================
// DECODE HTML ENTITIES
// =====================================================

function decodeHtmlEntities(text: string) {
  if (!text) {
    return "";
  }

  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x20;/gi, " ")
    .replace(/&#32;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&hellip;/gi, "…")
    .replace(
      /&#(\d+);/g,
      (_, code) => {
        const number = Number(code);

        if (Number.isNaN(number)) {
          return _;
        }

        try {
          return String.fromCodePoint(number);
        } catch {
          return _;
        }
      }
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, code) => {
        const number = parseInt(code, 16);

        if (Number.isNaN(number)) {
          return _;
        }

        try {
          return String.fromCodePoint(number);
        } catch {
          return _;
        }
      }
    );
}

// =====================================================
// REMOVE HTML
// =====================================================

function stripHtml(text: string) {
  if (!text) {
    return "";
  }

  return text
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      ""
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      ""
    )
    .replace(
      /<svg[\s\S]*?<\/svg>/gi,
      ""
    )
    .replace(
      /<!--[\s\S]*?-->/g,
      ""
    )
    .replace(
      /<[^>]*>/g,
      " "
    );
}

// =====================================================
// REMOVE ECOMMERCE GARBAGE
// =====================================================

function removeEcommerceGarbage(text: string) {
  if (!text) {
    return "";
  }

  let clean = text;

  // Shopify navigation
  clean = clean.replace(
    /\bskip\s+to\s+product\s+information\b/gi,
    ""
  );

  clean = clean.replace(
    /\bskip\s+to\s+content\b/gi,
    ""
  );

  clean = clean.replace(
    /\bskip\s+to\s+navigation\b/gi,
    ""
  );

  clean = clean.replace(
    /\bskip\s+to\s+search\b/gi,
    ""
  );

  // Price labels
  clean = clean.replace(
    /\bregular\s+price\s*:?\s*/gi,
    ""
  );

  clean = clean.replace(
    /\bsale\s+price\s*:?\s*/gi,
    ""
  );

  clean = clean.replace(
    /\bcompare\s+at\s*:?\s*/gi,
    ""
  );

  // Shopping UI
  clean = clean.replace(
    /\badd\s+to\s+cart\b/gi,
    ""
  );

  clean = clean.replace(
    /\bbuy\s+it\s+now\b/gi,
    ""
  );

  clean = clean.replace(
    /\badd\s+to\s+wishlist\b/gi,
    ""
  );

  clean = clean.replace(
    /\badd\s+to\s+bag\b/gi,
    ""
  );

  // Product metadata
  clean = clean.replace(
    /\btitle\s*:\s*/gi,
    ""
  );

  clean = clean.replace(
    /\bsku\s*:\s*/gi,
    ""
  );

  clean = clean.replace(
    /\bproduct\s+url\s*:\s*/gi,
    ""
  );

  clean = clean.replace(
    /\burl\s*:\s*/gi,
    ""
  );

  // Stock garbage
  clean = clean.replace(
    /\blow\s+stock\s*:\s*\d+\s*left\b/gi,
    ""
  );

  clean = clean.replace(
    /\bonly\s+\d+\s+left\b/gi,
    ""
  );

  clean = clean.replace(
    /\b\d+\s+left\s+in\s+stock\b/gi,
    ""
  );

  // Size repetition
  // IMPORTANT: no invalid \1 backreference.
  clean = clean.replace(
    /\bS\s+S\s+M\s+M\s+L\s+L\b/gi,
    ""
  );

  clean = clean.replace(
    /\bXS\s+XS\s+S\s+S\s+M\s+M\s+L\s+L\s+XL\s+XL\b/gi,
    ""
  );

  // Common scraped form text
  clean = clean.replace(
    /\bform\s*\.\.\.\s*/gi,
    ""
  );

  clean = clean.replace(
    /\bloading\s*\.\.\.\s*/gi,
    ""
  );

  clean = clean.replace(
    /\bselect\s+options\b/gi,
    ""
  );

  clean = clean.replace(
    /\bchoose\s+options\b/gi,
    ""
  );

  // Accessibility garbage
  clean = clean.replace(
    /\bimage\s+of\b/gi,
    ""
  );

  clean = clean.replace(
    /\bopens\s+in\s+a\s+new\s+window\b/gi,
    ""
  );

  // Sales Pilot test data
  clean = clean.replace(
    /\bSales\s+Pilot\b/gi,
    ""
  );

  clean = clean.replace(
    /\bAI\s+Sales\s*&\s*Customer\s+Support\s+Employee\b/gi,
    ""
  );

  clean = clean.replace(
    /\bAI\s+Customer\s+Support\b/gi,
    ""
  );

  clean = clean.replace(
    /\bAcme\s+Store\b/gi,
    ""
  );

  clean = clean.replace(
    /\bTest\s+website\s+for\s+Sales\s+Pilot\s+AI\b/gi,
    ""
  );

  clean = clean.replace(
    /\bSales\s+Pilot\s+Widget\s+Test\b/gi,
    ""
  );

  // Normalize whitespace
  clean = clean
    .replace(/\s+/g, " ")
    .trim();

  return clean;
}

// =====================================================
// CLEAN GENERAL TEXT
// =====================================================

export function cleanProductText(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  let text = String(value);

  if (!text.trim()) {
    return "";
  }

  text = text.replace(/\u0000/g, "");
  text = decodeHtmlEntities(text);
  text = stripHtml(text);
  text = removeEcommerceGarbage(text);

  return text.trim();
}

// =====================================================
// PRODUCT NAME
// =====================================================

export function cleanProductName(value: unknown) {
  let name = cleanProductText(value);

  if (!name) {
    return "Product";
  }

  name = name.replace(
    /https?:\/\/\S+/gi,
    ""
  );

  name = name.replace(
    /\bSKU\s*:\s*\S+/gi,
    ""
  );

  name = name.replace(
    /\bPrice\s*:\s*[^\s]+/gi,
    ""
  );

  name = name.replace(
    /^[\s|,:;.\-–—]+/,
    ""
  );

  name = name.replace(
    /[\s|,:;.\-–—]+$/,
    ""
  );

  name = name.replace(
    /\s+/g,
    " "
  );

  return name.trim();
}

// =====================================================
// PRODUCT DESCRIPTION
// =====================================================

export function cleanProductDescription(value: unknown) {
  let description = cleanProductText(value);

  if (!description) {
    return "";
  }

  description = description.replace(
    /https?:\/\/\S+/gi,
    ""
  );

  description = description.replace(
    /\bSKU\s*:\s*\S+/gi,
    ""
  );

  description = description.replace(
    /\bPrice\s*:\s*[^\s|]+/gi,
    ""
  );

  description = description.replace(
    /\bProduct\s+URL\s*:\s*\S+/gi,
    ""
  );

  description = description.replace(
    /\bURL\s*:\s*\S+/gi,
    ""
  );

  description = description.replace(
    /\bshipping\s*&\s*returns\b[\s\S]*$/i,
    ""
  );

  description = description.replace(
    /\bknowledge\s+base\b[\s\S]*$/i,
    ""
  );

  description = description
    .replace(/\s+/g, " ")
    .trim();

  return description;
}

// =====================================================
// PRODUCT PRICE
// =====================================================

export function cleanProductPrice(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  let price = String(value)
    .replace(/\u0000/g, "")
    .trim();

  if (!price) {
    return "";
  }

  price = stripHtml(price);
  price = decodeHtmlEntities(price);

  price = price.replace(
    /^(regular\s+price|sale\s+price|price|from)\s*:?\s*/i,
    ""
  );

  price = price.replace(
    /\s+/g,
    " "
  );

  price = price.replace(
    /[.,;:]+$/,
    ""
  );

  return price.trim();
}

// =====================================================
// PRODUCT URL
// =====================================================

export function cleanProductUrl(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  let url = String(value).trim();

  if (!url) {
    return "";
  }

  url = decodeHtmlEntities(url);

  url = url.replace(
    /\s+/g,
    ""
  );

  const markdownMatch = url.match(
    /^\[.*?\]\((https?:\/\/[^)]+)\)$/
  );

  if (markdownMatch) {
    url = markdownMatch[1];
  }

  url = url.replace(
    /^[<[(]+/,
    ""
  );

  url = url.replace(
    /[>\])]+$/,
    ""
  );

  url = url.replace(
    /[),.;!?]+$/,
    ""
  );

  if (!/^https?:\/\//i.test(url)) {
    return "";
  }

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

// =====================================================
// PRODUCT IMAGE URL
// =====================================================

export function cleanProductImageUrl(value: unknown) {
  return cleanProductUrl(value);
}

// =====================================================
// PRODUCT SKU
// =====================================================

export function cleanProductSku(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  let sku = String(value).trim();

  if (!sku) {
    return "";
  }

  sku = sku.replace(
    /^sku\s*:\s*/i,
    ""
  );

  sku = cleanProductText(sku);

  return sku;
}

// =====================================================
// PRODUCT AVAILABILITY
// =====================================================

export function cleanProductAvailability(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const text = value
    .toLowerCase()
    .trim();

  if (
    [
      "true",
      "available",
      "in stock",
      "instock",
      "yes",
      "1",
    ].includes(text)
  ) {
    return true;
  }

  if (
    [
      "false",
      "unavailable",
      "out of stock",
      "outofstock",
      "sold out",
      "soldout",
      "no",
      "0",
    ].includes(text)
  ) {
    return false;
  }

  return undefined;
}

// =====================================================
// COLLECTION NAME
// =====================================================

export function cleanCollectionName(value: unknown) {
  const name = cleanProductText(value);

  if (!name) {
    return "";
  }

  return name
    .replace(
      /^[|,:;.\-–—\s]+/,
      ""
    )
    .replace(
      /[|,:;.\-–—\s]+$/,
      ""
    )
    .trim();
}

// =====================================================
// COLLECTION URL
// =====================================================

export function cleanCollectionUrl(value: unknown) {
  return cleanProductUrl(value);
}

// =====================================================
// UNIQUE STRINGS
// =====================================================

export function uniqueStrings(values: unknown[]) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const cleaned = cleanProductText(value);

    if (!cleaned) {
      continue;
    }

    const key = cleaned.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

// =====================================================
// UNIQUE URLS
// =====================================================

export function uniqueUrls(values: unknown[]) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const cleaned = cleanProductUrl(value);

    if (!cleaned) {
      continue;
    }

    const key = cleaned.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}
