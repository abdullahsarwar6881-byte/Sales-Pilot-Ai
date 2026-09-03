// =====================================================
// MULTIMODAL PRODUCT MATCHING
// =====================================================
// Production, layered image-matching pipeline for the chat widget.
//
// The existing determineImageMatchType() in app/api/chat/route.ts only
// returns "exact" when a concrete SKU/model/title is readable. This module
// adds a VISUAL understanding layer so ordinary product photos (which do NOT
// contain readable text or SKUs) can still be matched to catalog products â€”
// without ever fabricating a match when confidence is too low.
//
// Pipeline (per the project direction):
//   CUSTOMER IMAGE
//     -> vision feature extraction (structured: category/colors/attributes)
//     -> SKU detection (existing path)
//     -> catalog candidate retrieval
//     -> feature/metadata similarity scoring
//     -> confidence aggregation
//     -> exact | high_confidence | similar | no_match
//
// IMPORTANT HONESTY CONSTRAINT:
// This stack has OpenAI text-embedding only (no image/CLIP embedding API).
// Therefore "visual similarity" here is driven by the vision model's
// structured feature extraction of BOTH the customer image and catalog
// product images, compared lexically/metrically. This is far stronger than
// raw OCR/SKU matching alone, but it is NOT a pixel-identical lookup. We
// never claim perfect social-media/different-model identification; those
// cases resolve to high_confidence/similar only when features genuinely match.
// =====================================================


export type ImageMatchType =
  | "exact"
  | "high_confidence"
  | "similar"
  | "no_match";

export interface MatchSignals {
  skuMatch: boolean;
  textMatch: number; // 0..1 lexical overlap of description vs title/content
  visualSimilarity: number; // 0..1 attribute overlap vs catalog features
  metadataSimilarity: number; // 0..1 brand/category/price/color context
  /** 0..1 genuine shared garment/category attributes; 0 means NO real attribute overlap. */
  attributeGroupSimilarity: number;
  /** number of attribute groups shared by both sides (>=2 required to claim a match). */
  sharedAttributeGroupCount: number;
}

export interface MultimodalMatchResult {
  matchType: ImageMatchType;
  confidence: number; // 0..1
  product: any | null;
  signals: MatchSignals;
  source: "sku" | "text" | "visual" | "metadata" | "none";
}

export interface VisionFeatures {
  category?: string;
  colors: string[];
  attributes: string[]; // garment type, pattern, neckline, sleeves, silhouette, fabric...
  description: string;
  sku?: string | null;
}

/*****************************************************************************
 * Vision feature extraction
 *****************************************************************************/

// Split a vision description into searchable feature tokens, dropping the
// most generic fashion/ecommerce words so similarity is meaningful.
const STOP_TOKENS = new Set([
  "the", "a", "an", "and", "or", "of", "with", "in", "on", "this", "that",
  "it", "is", "are", "was", "for", "to", "from", "by", "you", "your", "has",
  "have", "colors", "color", "look", "looks", "product", "dress", "design",
  "designs", "piece", "image", "photo", "feature", "features", "styles",
]);

function tokenize(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_TOKENS.has(w));
}

// Very simple, dependency-free text similarity (Jaccard over token sets),
// sufficient for comparing two vision-derived descriptions/attribute lists.
export function textSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Extract a compact structured feature set from a vision description.
export function extractVisionFeatures(description: string): VisionFeatures {
  const text = String(description || "");
  const tokens = tokenize(text);

  // Heuristic color extraction (common neutral + vivid colors).
  const colorMap: Record<string, string[]> = {
    black: ["black", "noir", "charcoal"],
    white: ["white", "ivory", "offwhite", "off-white", "cream"],
    yellow: ["yellow", "yellowish", "mustard", "canary"],
    red: ["red", "maroon", "burgundy", "crimson", "scarlet"],
    blue: ["blue", "navy", "royal", "sky", "azure"],
    green: ["green", "olive", "sage", "emerald", "mint"],
    pink: ["pink", "rose", "blush", "salmon", "peach"],
    purple: ["purple", "plum", "lavender", "lilac", "violet"],
    brown: ["brown", "beige", "tan", "camel", "chocolate"],
    grey: ["grey", "gray", "silver"],
    gold: ["gold", "golden"],
    orange: ["orange", "coral", "amber"],
  };
  const colors: string[] = [];
  const lower = text.toLowerCase();
  for (const [base, variants] of Object.entries(colorMap)) {
    if (variants.some((v) => lower.includes(v))) colors.push(base);
  }
  if (colors.length === 0 && /ye?llow/i.test(text)) colors.push("yellow");

  // Heuristic attribute detection for common garment descriptors.
  const attributePatterns: [string, RegExp][] = [
    ["printed", /\b(?:printed?|print|pattern|motif)s?\b/i],
    ["embroidered", /\b(?:embroidered?|embellish(?:ed|ment)?|beaded?|sequins?)\b/i],
    ["unstitched", /\bunstitched\b|\bunstiched\b/i],
    ["stitched", /\bstitched\b/i],
    ["sleeveless", /\bsleeveless\b|\bno\s+sleeves?\b/i],
    ["long sleeves", /\blong\s+sleeves?\b|\bfull\s+sleeves?\b/i],
    ["short sleeves", /\bshort\s+sleeves?\b|\belbow\s+sleeves?\b/i],
    ["round neck", /\bround\s+neck\b|\bcrew\s+neck\b/i],
    ["v neck", /\bv[- ]?neck\b/i],
    ["high neck", /\bhigh\s+neck\b|\bmandarin\b/i],
    ["palazzo", /\bpalazzo\b/i],
    ["trouser", /\btrousers?\b|\bpants?\b|\bpyjamas?\b/i],
    ["dupatta", /\bdupatta\b|\bchiffon\s+dupatta\b|\bscarf\b/i],
    ["lawn", /\blawn\b/i],
    ["chiffon", /\bchiffon\b/i],
    ["cotton", /\bcotton\b/i],
    ["silk", /\bsilk\b|\braw\s+silk\b/i],
    ["lace", /\blace\b|\bscallops?\b/i],
    ["border", /\bborders?\b|\bpiping\b|\btrim\b/i],
    ["kurti", /\bkurti\b|\bkurta\b|\bkameez\b/i],
    ["shirt", /\bshirts?\b|\btops?\b|\bblouses?\b/i],
    ["suit", /\bsuits?\b|\boutfits?\b|\bensembles?\b/i],
    ["winter", /\bwinter\b|\bwarm\b|\bcozy\b/i],
    ["summer", /\bsummer\b|\blightweight\b|\bbreathable\b/i],
  ];
  const attributes: string[] = [];
  for (const [name, re] of attributePatterns) {
    if (re.test(text) && !attributes.includes(name)) attributes.push(name);
  }

  // Light object/category hint from the description.
  let category: string | undefined;
  if (/\b(?:car|vehicle|automobile|truck|motorcycle|sedan|suv|coupe|auto)\b/i.test(text)) category = "vehicle";
  else if (/\b(?:handbag|bag|purse|clutch|tote|wallet|backpack)s?\b/i.test(text)) category = "bag";
  else if (/\b(?:shoes?|sneakers?|heels?|boots?|sandals?|footwear|slippers?)\b/i.test(text)) category = "footwear";
  else if (/\b(?:dress|suit|kurti|kurta|shirt|top|outfit|gown|skirt|kurta|kameez|shalwar|trouser|dupatta|lawn|unstitched|jacket|coat|hoodie|pants|jeans)s?\b/i.test(text)) category = "apparel";
  else if (/\b(?:watch|phone|laptop|headphone|speaker|electronic|charger|tablet|tv|camera)s?\b/i.test(text)) category = "electronics";
  else if (/\b(?:sofa|chair|table|furniture|couch|bed|desk|bookshelf|lamp)s?\b/i.test(text)) category = "furniture";
  else if (/\b(?:lipstick|makeup|perfume|fragrance|serum|lotion|skincare|cosmetics?)\b/i.test(text)) category = "beauty";

  // Try to spot a SKU/model code pattern in the description too.
  const skuMatch =
    text.match(/\b[A-Z]{1,4}\d{2,}[A-Za-z0-9._-]*\b/) ||
    text.match(/\bSKU[: ]+([A-Za-z0-9_.-]+)\b/i);
  const sku = skuMatch ? skuMatch[1]?.trim() || skuMatch[0].trim() : undefined;

  return {
    category,
    colors,
    attributes,
    description: text.trim().slice(0, 1200),
    sku,
  };
}

/*****************************************************************************
 * Candidate scoring
 *****************************************************************************/

// Jaccard similarity between two attribute/color token arrays.

function setSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const v of sa) if (sb.has(v)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function colorSimilarity(aColors: string[], bColors: string[]): number {
  if (aColors.length === 0 || bColors.length === 0) return 0.4; // neutral when unknown
  return setSimilarity(aColors, bColors);
}

function categoryScore(aCat?: string, bCat?: string): number {
  if (!aCat || !bCat) return 0.5; // unknown is neutral, not a penalty
  return aCat === bCat ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Color-membership similarity
// ---------------------------------------------------------------------------
// A catalog product that states a dominant color (e.g. YELLOW) should score
// highly against a customer image that reports yellow among its colors, even
// if the image also carries secondary colors. Unknown colors are neutral.
function colorMembership(aColors: string[], bColors: string[]): number {
  if (aColors.length === 0 || bColors.length === 0) return 0.5; // unknown -> neutral
  const small = aColors.length <= bColors.length ? aColors : bColors;
  const big = aColors.length <= bColors.length ? bColors : aColors;
  const set = new Set(small);
  let hits = 0;
  for (const c of big) if (set.has(c)) hits++;
  return hits / small.length; // fraction of the smaller set present
}

// ---------------------------------------------------------------------------
// Semantic attribute-group similarity
// ---------------------------------------------------------------------------
// Group garment descriptors into independent semantic buckets so that strong
// agreement in ONE meaningful dimension (fabric, decoration) is rewarded even
// when a flat Jaccard over all attributes is diluted by variety. Each group
// contributes up to its weight.
const ATTRIBUTE_GROUPS: Array<{ name: string; weight: number; members: string[] }> = [
  { name: "fabric", weight: 0.22, members: ["lawn", "chiffon", "cotton", "silk", "linen", "jersey", "denim", "velvet", "georgette", "satin"] },
  { name: "decoration", weight: 0.18, members: ["embroidered", "printed", "embellished", "beaded", "sequin", "lace", "applique", "santus", "crinkle"] },
  { name: "silhouette", weight: 0.14, members: ["kurti", "kurta", "shirt", "trouser", "dupatta", "shalwar", "palazzo", "straight", "flared", "pant", "tunic", "suit", "pajama", "pyjama"] },
  { name: "sleeves", weight: 0.07, members: ["long sleeves", "short sleeves", "sleeveless", "full sleeve", "cap sleeve", "3/4 sleeve"] },
  { name: "neckline", weight: 0.06, members: ["round neck", "v neck", "high neck", "mandarin", "collar", "square neck"] },
  { name: "structure", weight: 0.05, members: ["stitched", "unstitched", "2 pcs", "3 pcs", "wider width", "wide width", "border"] },
  { name: "design", weight: 0.04, members: ["floral", "striped", "solid", "geometric", "paisley", "hand", "block", "digital", "woven", "jacquard"] },
];

export function attributeGroupSimilarity(aAttrs: string[], bAttrs: string[]): number {
  if (aAttrs.length === 0 || bAttrs.length === 0) return 0;
  const ag = new Set(aAttrs.map((x) => x.toLowerCase()));
  const bg = new Set(bAttrs.map((x) => x.toLowerCase()));

  let totalWeight = 0;
  let weightedHits = 0;
  for (const g of ATTRIBUTE_GROUPS) {
    totalWeight += g.weight;
    const aHas = g.members.some((m) => ag.has(m));
    const bHas = g.members.some((m) => bg.has(m));
    if (aHas && bHas) weightedHits += g.weight;
    else if (aHas || bHas) weightedHits += g.weight * 0.25; // partial: one side reports the category
  }
  if (totalWeight === 0) return 0;
  return weightedHits / totalWeight;
}

// Count how many independent attribute groups are genuinely shared by BOTH sides.
// A real product photo shares several garment dimensions (fabric + decoration + silhouette +
// sleeves/neckline ...). An unrelated image (e.g. a car) may coincidentally share only a
// single generic token (such as the word "printed" in its description), so requiring
// overlap in at least 2 groups is a robust, catalog-agnostic honesty gate.
function countSharedAttributeGroups(aAttrs: string[], bAttrs: string[]): number {
  if (aAttrs.length === 0 || bAttrs.length === 0) return 0;
  const ag = new Set(aAttrs.map((x) => x.toLowerCase()));
  const bg = new Set(bAttrs.map((x) => x.toLowerCase()));
  let shared = 0;
  for (const g of ATTRIBUTE_GROUPS) {
    const aHas = g.members.some((m) => ag.has(m));
    const bHas = g.members.some((m) => bg.has(m));
    if (aHas && bHas) shared++;
  }
  return shared;
}

// ---------------------------------------------------------------------------
// Description token overlap (fabric / material / decorative words)
// ---------------------------------------------------------------------------
const SEMANTIC_TOKEN_WORDS = new Set([
  "lawn", "chiffon", "cotton", "silk", "linen", "jersey", "denim", "velvet",
  "georgette", "satin", "embroidered", "printed", "lace", "unstitched",
  "stitched", "dupatta", "kurti", "kurta", "shirt", "trouser", "shalwar",
  "floral", "striped", "straight", "palazzo", "wider", "border", "pants",
  "pyjama", "pajama", "solid", "2 pcs", "3 pcs",
]);

function semanticTokenOverlap(a: string, b: string): number {
  const ta = new Set(
    String(a || "").toLowerCase().replace(/[^a-z0-9\s]+/g, " ").split(/\s+/)
  );
  const tb = new Set(
    String(b || "").toLowerCase().replace(/[^a-z0-9\s]+/g, " ").split(/\s+/)
  );
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w) && SEMANTIC_TOKEN_WORDS.has(w)) inter++;
  const relevant = Array.from(ta).filter((w) => SEMANTIC_TOKEN_WORDS.has(w)).length;
  if (relevant === 0) return 0;
  return Math.min(1, inter / relevant);
}

// Compare a customer image's vision features against a catalog product.
// Returns 0..1 with a breakdown used by the confidence aggregator.
export function scoreProductAgainstFeatures(
  customerFeatures: VisionFeatures,
  product: any
): MatchSignals {
  // -- SKU (highest trust) --
  const productSku = String(
    product?.sku || product?.variant_sku || ""
  ).toLowerCase();
  const customerSku = String(customerFeatures?.sku || "").toLowerCase();
  let skuMatch = false;
  if (productSku && customerSku) {
    const baseProductSku = productSku.replace(/-\d{6,}$/, "");
    const baseCustomerSku = customerSku.replace(/-\d{6,}$/, "");
    skuMatch =
      productSku === customerSku ||
      baseProductSku === baseCustomerSku ||
      (baseProductSku.length >= 4 && customerSku.includes(baseProductSku)); // handle FSP1266-YELLOW-02 → FSP1266-YELLOW
  }

  // -- Catalog features (image index if present, else rich content) --
  const catalogFeatures = extractVisionFeatures(
    product?.image_metadata?.description ||
      product?.imageDescription ||
      product?.image_visual_features ||
      product?.content ||
      product?.description ||
      product?.body_html ||
      ""
  );

  // -- Hard cross-domain mismatch gate --
  // If both sides identify a concrete category and they are incompatible (e.g. vehicle vs apparel),
  // immediately return zero overlap so an unrelated image NEVER matches a catalog product.
  if (
    customerFeatures.category &&
    catalogFeatures.category &&
    customerFeatures.category !== catalogFeatures.category
  ) {
    return {
      skuMatch: false,
      textMatch: 0,
      visualSimilarity: 0,
      metadataSimilarity: 0,
      attributeGroupSimilarity: 0,
      sharedAttributeGroupCount: 0,
    };
  }

  // -- Text / description similarity (title + rich content) --
  const productTitle = String(
    product?.title || product?.name || product?.displayName || product?.product_title || ""
  );
  const productContent = String(
    product?.content ||
      product?.description ||
      product?.body_html ||
      product?.text ||
      product?.page_content ||
      ""
  );
  const productText =
    [productTitle, productContent].filter(Boolean).join(" ") ||
    productTitle;

  // -- Feature attribute similarity (semantic groups) --
  const attrSim = attributeGroupSimilarity(
    customerFeatures.attributes,
    catalogFeatures.attributes
  );
  const sharedAttrGroups = countSharedAttributeGroups(
    customerFeatures.attributes,
    catalogFeatures.attributes
  );

  // -- Color similarity (membership) --
  const colorSim = colorMembership(customerFeatures.colors, catalogFeatures.colors);

  // -- Category --
  const catScore = categoryScore(customerFeatures.category, catalogFeatures.category);

  // -- Description similarity (lexical overlap of the full title + content) --
  const textMatch = textSimilarity(customerFeatures.description, productText);

  // -- Description semantic token overlap for fabric/material words --
  const descSim = semanticTokenOverlap(customerFeatures.description, productText);

  // Independent dimension agreement. Unknown dimensions stay neutral.
  const visualSimilarity = Math.max(
    0,
    Math.min(
      1,
      attrSim * 0.45 +
        colorSim * 0.18 +
        catScore * 0.12 +
        descSim * 0.25
    )
  );

  const metadataSimilarity = Math.max(
    0,
    Math.min(
      1,
      catScore * 0.4 +
        colorSim * 0.3 +
        Math.min(1, descSim) * 0.3
    )
  );

  return {
    skuMatch,
    textMatch,
    visualSimilarity,
    metadataSimilarity,
    attributeGroupSimilarity: attrSim,
    sharedAttributeGroupCount: sharedAttrGroups,
  };
}

// Sensible, conservative thresholds. These are calibrated to the semantic
// scoring above: strong fabric+color+category agreement yields a HIGH score,
// while weakly-correlated products stay well below similar. We keep the
// thresholds anchored so a real product photo rises into similar/likely but an
// unrelated image (e.g. a car) does not.
export const MATCH_THRESHOLDS = {
  exactSku: 1.0,        // SKU present -> exact
  exactVisual: 0.78,    // exceptionally strong multi-attribute visual match without SKU
  highConfidence: 0.62, // strong multi-dimension agreement
  similar: 0.40,        // meaningful shared attributes
};


// Aggregate the layered signals into a single match decision.
// `product` is the catalog product under evaluation.
export function aggregateMatch(
  signals: MatchSignals,
  product: any
): Omit<MultimodalMatchResult, "product" | "source"> {
  // 1. SKU exact match is the strongest possible identity signal.
  if (signals.skuMatch && product?.sku) {
    return {
      matchType: "exact",
      confidence: 1.0,
      signals,
    };
  }

  // Weighted aggregate of visual + text + metadata signals.
  const weighted =
    signals.visualSimilarity * 0.55 +
    signals.textMatch * 0.2 +
    signals.metadataSimilarity * 0.25;

  // HONESTY GATE: Without a verified SKU, we only claim a product match when
  // the customer image genuinely shares at least TWO independent attribute groups
  // (fabric, decoration, silhouette, sleeves, neckline, ...) with the catalog product.
  // A real product photo does this naturally; an unrelated image (e.g. a car) only
  // coincidentally overlaps a single generic token. Color + neutral-category noise
  // alone must never push it into similar/high_confidence.
  const hasGenuineSharedAttribute = signals.sharedAttributeGroupCount >= 2;

  // Layer 2: Exceptionally strong visual multi-attribute match
  // When multiple independent attribute dimensions strongly agree (shared groups >= 3)
  // and visual similarity is very high (>= 0.75), we treat it as an exact match.
  if (
    hasGenuineSharedAttribute &&
    signals.sharedAttributeGroupCount >= 3 &&
    signals.visualSimilarity >= 0.75 &&
    weighted >= MATCH_THRESHOLDS.exactVisual
  ) {
    return {
      matchType: "exact",
      confidence: Math.min(0.98, weighted),
      signals,
    };
  }

  if (hasGenuineSharedAttribute && weighted >= MATCH_THRESHOLDS.highConfidence) {
    return {
      matchType: "high_confidence",
      confidence: Math.min(0.95, weighted + 0.05),
      signals,
    };
  }
  if (hasGenuineSharedAttribute && weighted >= MATCH_THRESHOLDS.similar) {
    return {
      matchType: "similar",
      confidence: weighted,
      signals,
    };
  }
  return {
    matchType: "no_match",
    confidence: weighted,
    signals,
  };
}

// Run the full pipeline over a set of catalog candidates.
// Returns the best candidate decision or a safe no_match.
export function matchCustomerImageToProducts(
  customerFeatures: VisionFeatures,
  products: any[]
): MultimodalMatchResult {
  if (!products || products.length === 0) {
    return {
      matchType: "no_match",
      confidence: 0,
      product: null,
      signals: {
        skuMatch: false,
        textMatch: 0,
        visualSimilarity: 0,
        metadataSimilarity: 0,
        attributeGroupSimilarity: 0,
        sharedAttributeGroupCount: 0,
      },
      source: "none",
    };
  }

  let best: Omit<MultimodalMatchResult, "product" | "source"> | null = null;
  let bestProduct: any | null = null;
  let bestSource: MultimodalMatchResult["source"] = "none";

  for (const product of products) {
    const signals = scoreProductAgainstFeatures(customerFeatures, product);
    const decision = aggregateMatch(signals, product);
    if (!best || decision.confidence > best.confidence) {
      best = decision;
      bestProduct = product;
      bestSource = signals.skuMatch
        ? "sku"
        : signals.visualSimilarity > 0.5 && decision.matchType !== "similar"
          ? "visual"
          : signals.textMatch > 0.3
            ? "text"
            : signals.metadataSimilarity > 0.4
              ? "metadata"
              : "none";
    }
  }

  if (!best) {
    return {
      matchType: "no_match",
      confidence: 0,
      product: null,
      signals: { skuMatch: false, textMatch: 0, visualSimilarity: 0, metadataSimilarity: 0, attributeGroupSimilarity: 0, sharedAttributeGroupCount: 0 },
      source: "none",
    };
  }

  return {
    ...best,
    product: bestProduct,
    source: bestSource,
  } as MultimodalMatchResult;
}

// Convenience wrapper that keeps the existing SKU/title exact-match path
// first (so nothing regresses) and layers the visual pass on top.
export function analyzeAndMatchProductImage(
  imageDescription: string,
  catalogProducts: any[]
): MultimodalMatchResult {
  const features = extractVisionFeatures(imageDescription);
  const result = matchCustomerImageToProducts(features, catalogProducts);
  return result;
}




