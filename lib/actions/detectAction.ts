import type { ActionRequest } from "./types";

// =====================================================
// SALES PILOT ACTION DETECTOR
// =====================================================
//
// This module determines whether the customer's message
// requires one of the available backend actions.
//
// Supported actions:
//
// - search_products
// - get_order_status
// - get_order_details
// - handoff_to_human
//
// IMPORTANT:
//
// This file detects WHAT the customer wants.
//
// It does NOT execute the action.
//
// The actual execution must happen in your /api/chat
// route or action executor.
//
// =====================================================

// =====================================================
// TYPES
// =====================================================

type DetectionResult =
  | ActionRequest
  | null;

// =====================================================
// NORMALIZATION
// =====================================================

function normalize(message: unknown): string {
  return String(message || "")
    .toLowerCase()
    .replace(/\u0000/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// NORMALIZE FOR MATCHING
// =====================================================

function normalizeForMatching(
  message: unknown
): string {
  return normalize(message)
    .replace(/[!?.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// TOKENIZE
// =====================================================

function tokenize(
  message: string
): string[] {
  return normalizeForMatching(message)
    .split(" ")
    .filter(Boolean);
}

// =====================================================
// CONTAINS PHRASE
// =====================================================

function containsAny(
  text: string,
  phrases: readonly string[]
): boolean {
  return phrases.some((phrase) => {
    return text.includes(
      phrase.toLowerCase()
    );
  });
}

// =====================================================
// WORD BOUNDARY MATCH
// =====================================================

function containsWord(
  text: string,
  word: string
): boolean {
  const normalizedText =
    normalizeForMatching(text);

  const normalizedWord =
    normalizeForMatching(word);

  if (
    !normalizedText ||
    !normalizedWord
  ) {
    return false;
  }

  const escaped =
    normalizedWord.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  return new RegExp(
    `\\b${escaped}\\b`,
    "i"
  ).test(normalizedText);
}

// =====================================================
// MATCH ANY WORD
// =====================================================

function containsAnyWord(
  text: string,
  words: readonly string[]
): boolean {
  return words.some((word) =>
    containsWord(text, word)
  );
}

// =====================================================
// NUMBER EXTRACTION
// =====================================================

function extractNumbers(
  message: string
): number[] {
  const matches =
    normalize(message).match(
      /\b\d+(?:[.,]\d+)?\b/g
    );

  if (!matches) {
    return [];
  }

  return matches
    .map((value) =>
      Number(
        value.replace(/,/g, "")
      )
    )
    .filter((value) =>
      Number.isFinite(value)
    );
}

// =====================================================
// ORDER NUMBER
// =====================================================
//
// Supports:
//
// #123
// order 123
// order #123
// order number 123
// order no 123
// order no. 123
// my order is 123
// it's order number 123
//
// =====================================================

function extractOrderNumber(
  message: string
): string | null {
  const text = normalize(message);

  if (!text) {
    return null;
  }

  const patterns = [
    // #123
    /(?:^|\s)#\s*(\d{1,12})\b/i,

    // order #123
    /\border\s*#\s*(\d{1,12})\b/i,

    // order 123
    /\border\s+(\d{1,12})\b/i,

    // order number 123
    /\border\s+(?:number|no\.?|num(?:ber)?)\s*[:#=\-]?\s*(\d{1,12})\b/i,

    // order number is 123
    /\border\s+(?:number|no\.?|num(?:ber)?)\s+(?:is|was|=|:|-)\s*#?\s*(\d{1,12})\b/i,

    // my order is 123
    /\bmy\s+order\s+(?:is|was|=|:|-)\s*#?\s*(\d{1,12})\b/i,

    // its order number is 123
    /\b(?:its|it's)\s+(?:my\s+)?order\s+(?:number|no\.?|num(?:ber)?)?\s*(?:is|was|=|:|-)?\s*#?\s*(\d{1,12})\b/i,

    // number is 123
    /\bnumber\s+(?:is|was|=|:|-)\s*#?\s*(\d{1,12})\b/i,
  ];

  for (const pattern of patterns) {
    const match =
      text.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

// =====================================================
// ORDER NUMBER EXISTS
// =====================================================

function hasOrderNumber(
  message: string
): boolean {
  return Boolean(
    extractOrderNumber(message)
  );
}

// =====================================================
// HUMAN HANDOFF
// =====================================================

const HUMAN_HANDOFF_PHRASES = [
  "talk to human",
  "talk to a human",
  "speak to human",
  "speak to a human",

  "talk with a human",
  "speak with a human",

  "human support",
  "live support",

  "contact support",
  "contact a human",
  "contact someone",

  "real person",
  "real human",

  "speak with someone",
  "speak to someone",

  "talk with someone",
  "talk to someone",

  "connect me to an agent",
  "connect me with an agent",

  "connect me to a human",
  "connect me with a human",

  "human agent",
  "live agent",

  "speak with an agent",
  "talk to an agent",

  "i want a human",
  "i need a human",

  "i want to speak to someone",
  "i need to speak to someone",
];

function detectHumanHandoff(
  text: string
): DetectionResult {
  if (
    containsAny(
      text,
      HUMAN_HANDOFF_PHRASES
    )
  ) {
    console.log(
      "ACTION: handoff_to_human"
    );

    return {
      action: "handoff_to_human",
      parameters: {},
    };
  }

  return null;
}

// =====================================================
// ORDER STATUS
// =====================================================

const ORDER_STATUS_PHRASES = [
  "where is my order",
  "wheres my order",
  "where's my order",

  "where is the order",
  "wheres the order",
  "where's the order",

  "where is my package",
  "wheres my package",
  "where's my package",

  "where is my parcel",
  "wheres my parcel",
  "where's my parcel",

  "track my order",
  "track order",
  "track the order",

  "track my package",
  "track package",

  "track my parcel",
  "track parcel",

  "order status",
  "order tracking",

  "tracking my order",
  "tracking order",

  "shipment status",
  "shipping status",

  "has my order shipped",
  "has my order been shipped",

  "has the order shipped",
  "has the order been shipped",

  "has it shipped",
  "has it been shipped",

  "when will my order arrive",
  "when is my order arriving",

  "when will the order arrive",
  "when is the order arriving",

  "when will my package arrive",
  "when is my package arriving",

  "delivery status",
  "delivery tracking",

  "is my order shipped",
  "is the order shipped",

  "is my order on the way",
  "is the order on the way",

  "order on the way",
];

const ORDER_STATUS_WORDS = [
  "tracking",
  "shipment",
  "shipped",
  "shipping",
  "delivery",
];

function looksLikeOrderStatus(
  text: string
): boolean {
  if (
    containsAny(
      text,
      ORDER_STATUS_PHRASES
    )
  ) {
    return true;
  }

  const hasOrder =
    containsWord(text, "order") ||
    containsWord(text, "package") ||
    containsWord(text, "parcel");

  const hasTracking =
    containsAnyWord(
      text,
      ORDER_STATUS_WORDS
    );

  if (
    hasOrder &&
    hasTracking
  ) {
    return true;
  }

  return false;
}

function detectOrderStatus(
  text: string,
  orderNumber: string | null
): DetectionResult {
  if (
    !looksLikeOrderStatus(text)
  ) {
    return null;
  }

  console.log(
    "ORDER STATUS ACTION DETECTED"
  );

  console.log(
    "ORDER NUMBER:",
    orderNumber
  );

  return {
    action: "get_order_status",

    parameters: {
      orderNumber,
    },
  };
}

// =====================================================
// ORDER DETAILS
// =====================================================

const ORDER_DETAIL_PHRASES = [
  "order details",
  "details of my order",
  "details for my order",
  "details about my order",

  "what did i order",
  "what have i ordered",

  "what is in my order",
  "what's in my order",
  "whats in my order",

  "what is in the order",
  "what's in the order",
  "whats in the order",

  "items in my order",
  "items in the order",

  "order items",

  "products in my order",
  "products in the order",

  "what products are in my order",
  "what products are in the order",

  "what did i buy",
  "what have i bought",

  "show my order",
  "show me my order",
];

function looksLikeOrderDetails(
  text: string
): boolean {
  if (
    containsAny(
      text,
      ORDER_DETAIL_PHRASES
    )
  ) {
    return true;
  }

  const hasOrder =
    containsWord(text, "order");

  const detailWords = [
    "details",
    "items",
    "products",
    "contents",
  ];

  return (
    hasOrder &&
    containsAnyWord(
      text,
      detailWords
    )
  );
}

function detectOrderDetails(
  text: string,
  orderNumber: string | null
): DetectionResult {
  if (
    !looksLikeOrderDetails(text)
  ) {
    return null;
  }

  console.log(
    "ORDER DETAILS ACTION DETECTED"
  );

  console.log(
    "ORDER NUMBER:",
    orderNumber
  );

  return {
    action: "get_order_details",

    parameters: {
      orderNumber,
    },
  };
}

// =====================================================
// PRODUCT CATEGORIES
// =====================================================

const PRODUCT_TERMS = [
  "product",
  "products",

  "dress",
  "dresses",

  "outfit",
  "outfits",

  "suit",
  "suits",

  "shirt",
  "shirts",

  "top",
  "tops",

  "t shirt",
  "t shirts",
  "tshirt",
  "tshirts",

  "shoe",
  "shoes",
  "footwear",

  "cap",
  "caps",

  "jacket",
  "jackets",

  "hoodie",
  "hoodies",

  "pants",
  "pant",

  "trouser",
  "trousers",

  "jeans",

  "bag",
  "bags",
  "handbag",
  "handbags",

  "watch",
  "watches",

  "lawn",
  "chiffon",
  "cotton",
  "cambric",
  "dupatta",
  "dupattas",

  "embroidered",
  "embroidery",
  "embroider",

  "printed",
  "print",

  "unstitched",
  "stitched",
  "pret",

  "formal",
  "casual",
];

// =====================================================
// COLORS
// =====================================================

const COLOR_TERMS = [
  "black",
  "white",
  "offwhite",
  "off-white",
  "ivory",

  "red",
  "maroon",
  "burgundy",

  "blue",
  "navy",
  "royal",

  "green",
  "olive",
  "sage",

  "pink",
  "rose",
  "peach",

  "purple",
  "plum",
  "lavender",

  "brown",
  "beige",
  "camel",

  "yellow",
  "mustard",

  "orange",
  "rust",

  "grey",
  "gray",
  "silver",

  "cream",
];

// =====================================================
// PRODUCT SEARCH PHRASES
// =====================================================

const PRODUCT_SEARCH_PHRASES = [
  "show me",
  "show",

  "find me",
  "find",

  "looking for",
  "looking to buy",

  "i am looking for",
  "i'm looking for",

  "i want",
  "i need",

  "recommend",
  "recommend me",
  "recommend something",

  "suggest",
  "suggest something",

  "what products",
  "which products",
  "what product",
  "which product",

  "products do you have",
  "product do you have",

  "what do you have",
  "what do you sell",
  "what you sell",

  "what can i buy",
  "what can i purchase",

  "do you have",
  "do you sell",
  "have you got",

  "available products",
  "available product",

  "what is available",
  "what's available",
  "whats available",

  "shop",
  "browse",
  "browse products",
  "browse your products",

  "catalog",
  "catalogue",

  "options",
  "more options",
  "other options",
  "different options",

  "something",
  "something else",

  "between",
  "under",
  "below",
  "less than",

  "over",
  "above",
  "more than",

  "from",
  "around",
  "within",

  "budget",
  "price range",
  "price range of",

  "in the range",
  "range of",

  "sale",
  "discount",
  "offer",
  "offers",
];

// =====================================================
// SHOPPING WORDS
// =====================================================

const SHOPPING_WORDS = [
  "buy",
  "purchase",
  "shop",
  "browse",
  "recommend",
  "suggest",
  "available",
  "options",
  "budget",
  "price",
  "cost",
];

// =====================================================
// PRICE / BUDGET DETECTION
// =====================================================

function hasPriceRange(
  text: string
): boolean {
  const numbers =
    extractNumbers(text);

  if (numbers.length < 1) {
    return false;
  }

  const rangeWords = [
    "between",
    "under",
    "below",
    "over",
    "above",
    "around",
    "within",
    "less than",
    "more than",
    "from",
  ];

  return containsAny(
    text,
    rangeWords
  );
}

function hasMoneyAmount(
  text: string
): boolean {
  return (
    /(?:pkr|rs\.?|₨|\$|usd|€|eur|£|gbp)\s*\d+/i.test(
      text
    ) ||
    /\d+\s*(?:pkr|rs\.?|₨|usd|eur|gbp)/i.test(
      text
    )
  );
}

function looksLikePriceQuestion(
  text: string
): boolean {
  const priceWords = [
    "price",
    "prices",
    "cost",
    "costs",
    "budget",
    "cheap",
    "expensive",
    "affordable",
  ];

  return containsAnyWord(
    text,
    priceWords
  );
}

// =====================================================
// GENERIC PRODUCT QUESTION
// =====================================================

function isGenericCatalogQuestion(
  text: string
): boolean {
  const phrases = [
    "what do you sell",
    "what you sell",
    "what do you have",

    "what products do you have",
    "which products do you have",

    "what can i buy",
    "what can i purchase",

    "show your products",
    "show me your products",
    "show me products",
    "show products",

    "browse",
    "catalog",
    "catalogue",
    "shop",
  ];

  return containsAny(
    text,
    phrases
  );
}

// =====================================================
// PRODUCT QUERY DETECTION
// =====================================================

function looksLikeProductQuery(
  text: string
): boolean {
  if (!text) {
    return false;
  }

  const hasProductTerm =
    containsAnyWord(
      text,
      PRODUCT_TERMS
    );

  const hasColorTerm =
    containsAnyWord(
      text,
      COLOR_TERMS
    );

  const hasSearchPhrase =
    containsAny(
      text,
      PRODUCT_SEARCH_PHRASES
    );

  const hasShoppingWord =
    containsAnyWord(
      text,
      SHOPPING_WORDS
    );

  // ---------------------------------------------------
  // Generic catalog request
  // ---------------------------------------------------

  if (
    isGenericCatalogQuestion(text)
  ) {
    return true;
  }

  // ---------------------------------------------------
  // Product + shopping language
  //
  // Examples:
  //
  // show me black dresses
  // I want a blue shirt
  // recommend a hoodie
  // do you have shoes
  // ---------------------------------------------------

  if (
    hasProductTerm &&
    (
      hasSearchPhrase ||
      hasShoppingWord
    )
  ) {
    return true;
  }

  // ---------------------------------------------------
  // Color + product
  //
  // Example:
  //
  // black dresses
  // navy shirts
  // red bags
  // ---------------------------------------------------

  if (
    hasProductTerm &&
    hasColorTerm
  ) {
    return true;
  }

  // ---------------------------------------------------
  // Product + price
  //
  // Example:
  //
  // dresses under 5000
  // shoes around 3000
  // bags below PKR 5000
  // ---------------------------------------------------

  if (
    hasProductTerm &&
    (
      hasPriceRange(text) ||
      hasMoneyAmount(text) ||
      looksLikePriceQuestion(text)
    )
  ) {
    return true;
  }

  // ---------------------------------------------------
  // Price range without explicit product
  //
  // Example:
  //
  // anything under 5000
  // something between 2000 and 5000
  // ---------------------------------------------------

  if (
    hasPriceRange(text)
  ) {
    return true;
  }

  if (
    hasMoneyAmount(text) &&
    (
      hasSearchPhrase ||
      hasShoppingWord ||
      text.includes("price") ||
      text.includes("budget") ||
      text.includes("buy")
    )
  ) {
    return true;
  }

  // ---------------------------------------------------
  // Explicit product language
  //
  // "products"
  // "dresses"
  // "shoes"
  //
  // We allow direct category searches.
  // ---------------------------------------------------

  if (
    hasProductTerm &&
    text.length <= 80
  ) {
    return true;
  }

  return false;
}

// =====================================================
// PRODUCT SEARCH ACTION
// =====================================================

function detectProductSearch(
  message: string,
  text: string
): DetectionResult {
  if (
    !looksLikeProductQuery(text)
  ) {
    return null;
  }

  console.log(
    "PRODUCT SEARCH ACTION DETECTED"
  );

  console.log(
    "PRODUCT QUERY:",
    message
  );

  return {
    action: "search_products",

    parameters: {
      query: message,
    },
  };
}

// =====================================================
// DIRECT PRODUCT CATEGORY
// =====================================================
//
// Handles:
//
// "dresses"
// "shoes"
// "hoodies"
// "bags"
// "shirts"
//
// =====================================================

const DIRECT_CATEGORIES = new Set([
  "products",

  "product",

  "hoodie",
  "hoodies",

  "shirt",
  "shirts",

  "top",
  "tops",

  "tshirt",
  "tshirts",

  "t shirt",
  "t shirts",

  "shoes",
  "shoe",

  "footwear",

  "jackets",
  "jacket",

  "caps",
  "cap",

  "dresses",
  "dress",

  "outfits",
  "outfit",

  "suits",
  "suit",

  "pants",
  "pant",

  "trousers",
  "trouser",

  "jeans",

  "bags",
  "bag",

  "handbags",
  "handbag",

  "watches",
  "watch",

  "dupatta",
  "dupattas",

  "lawn",
  "chiffon",
  "cotton",
  "cambric",
]);

function detectDirectCategory(
  message: string,
  text: string
): DetectionResult {
  if (
    !DIRECT_CATEGORIES.has(text)
  ) {
    return null;
  }

  console.log(
    "DIRECT PRODUCT CATEGORY DETECTED"
  );

  return {
    action: "search_products",

    parameters: {
      query: message,
    },
  };
}

// =====================================================
// SINGLE PRODUCT / SHOPPING REQUEST
// =====================================================
//
// Handles short natural requests:
//
// "black"
// "black dresses"
// "navy"
// "embroidered"
// "cotton"
// "something cheap"
//
// =====================================================

function detectShortShoppingRequest(
  message: string,
  text: string
): DetectionResult {
  const tokens =
    tokenize(text);

  if (
    tokens.length === 0 ||
    tokens.length > 5
  ) {
    return null;
  }

  const hasProduct =
    containsAnyWord(
      text,
      PRODUCT_TERMS
    );

  const hasColor =
    containsAnyWord(
      text,
      COLOR_TERMS
    );

  const hasAttribute =
    containsAnyWord(
      text,
      [
        "embroidered",
        "embroidery",
        "printed",
        "print",
        "stitched",
        "unstitched",
        "pret",
        "formal",
        "casual",
      ]
    );

  const hasShopping =
    containsAnyWord(
      text,
      SHOPPING_WORDS
    );

  if (
    (
      hasProduct &&
      (
        hasColor ||
        hasAttribute
      )
    ) ||
    (
      hasShopping &&
      (
        hasProduct ||
        hasColor
      )
    )
  ) {
    console.log(
      "SHORT SHOPPING REQUEST DETECTED"
    );

    return {
      action: "search_products",

      parameters: {
        query: message,
      },
    };
  }

  return null;
}

// =====================================================
// MAIN ACTION DETECTOR
// =====================================================
//
// Priority is important.
//
// 1. Human handoff
// 2. Order status
// 3. Order details
// 4. Direct product category
// 5. Product search
// 6. No action
//
// This prevents generic shopping words from accidentally
// overriding order-related requests.
//
// =====================================================

export function detectAction(
  message: string
): DetectionResult {
  const originalMessage =
    String(message || "");

  const text =
    normalizeForMatching(
      originalMessage
    );

  if (!text) {
    return null;
  }

  console.log(
    "================================="
  );

  console.log(
    "SALES PILOT ACTION DETECTION"
  );

  console.log(
    "MESSAGE:",
    originalMessage
  );

  console.log(
    "NORMALIZED:",
    text
  );

  console.log(
    "ORDER NUMBER:",
    extractOrderNumber(
      originalMessage
    )
  );

  console.log(
    "================================="
  );

  // ===================================================
  // 1. HUMAN HANDOFF
  // ===================================================

  const humanAction =
    detectHumanHandoff(
      text
    );

  if (humanAction) {
    return humanAction;
  }

  // ===================================================
  // 2. ORDER NUMBER
  // ===================================================

  const orderNumber =
    extractOrderNumber(
      originalMessage
    );

  // ===================================================
  // 3. ORDER STATUS
  // ===================================================

  const orderStatusAction =
    detectOrderStatus(
      text,
      orderNumber
    );

  if (orderStatusAction) {
    return orderStatusAction;
  }

  // ===================================================
  // 4. ORDER DETAILS
  // ===================================================

  const orderDetailsAction =
    detectOrderDetails(
      text,
      orderNumber
    );

  if (orderDetailsAction) {
    return orderDetailsAction;
  }

  // ===================================================
  // 5. DIRECT PRODUCT CATEGORY
  // ===================================================

  const directCategoryAction =
    detectDirectCategory(
      originalMessage,
      text
    );

  if (directCategoryAction) {
    return directCategoryAction;
  }

  // ===================================================
  // 6. SHORT SHOPPING REQUEST
  // ===================================================

  const shortShoppingAction =
    detectShortShoppingRequest(
      originalMessage,
      text
    );

  if (shortShoppingAction) {
    return shortShoppingAction;
  }

  // ===================================================
  // 7. PRODUCT SEARCH
  // ===================================================

  const productAction =
    detectProductSearch(
      originalMessage,
      text
    );

  if (productAction) {
    return productAction;
  }

  // ===================================================
  // 8. NO ACTION
  // ===================================================

  console.log(
    "NO ACTION DETECTED"
  );

  return null;
}

// =====================================================
// DEBUG HELPER
// =====================================================
//
// Useful during development.
//
// Example:
//
// const result = debugActionDetection(
//   "Can you show me some black dresses under 5000?"
// );
//
// =====================================================

export function debugActionDetection(
  message: string
) {
  const normalized =
    normalizeForMatching(
      message
    );

  const orderNumber =
    extractOrderNumber(
      message
    );

  const action =
    detectAction(
      message
    );

  return {
    message,

    normalized,

    orderNumber,

    hasOrderNumber:
      Boolean(orderNumber),

    detectedAction:
      action?.action ?? null,

    parameters:
      action?.parameters ?? null,

    productQuery:
      looksLikeProductQuery(
        normalized
      ),

    orderStatus:
      looksLikeOrderStatus(
        normalized
      ),

    orderDetails:
      looksLikeOrderDetails(
        normalized
      ),

    humanHandoff:
      Boolean(
        detectHumanHandoff(
          normalized
        )
      ),
  };
}