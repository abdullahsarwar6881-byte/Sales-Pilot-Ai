// =====================================================
// PRODUCT CONVERSATION CONTEXT
// =====================================================

const FOLLOW_UP_WORDS = [
  "it",
  "its",
  "it's",
  "they",
  "them",
  "their",
  "those",
  "these",
  "that",
  "this",
];

const PRICE_WORDS = [
  "price",
  "prices",
  "cost",
  "costs",
  "how much",
  "expensive",
  "cheap",
];

const AVAILABILITY_WORDS = [
  "available",
  "availability",
  "in stock",
  "stock",
];

const MATERIAL_WORDS = [
  "material",
  "materials",
  "fabric",
  "fabrics",
  "cloth",
  "quality",
  "texture",
  "made of",
  "cotton",
  "lawn",
  "silk",
  "chiffon",
  "wool",
  "linen",
  "denim",
];

const LINK_WORDS = [
  "link",
  "url",
  "where can i buy",
  "where to buy",
  "buy it",
  "purchase",
  "order this",
  "get this",
];

const OBJECTION_WORDS = [
  "don't like",
  "dont like",
  "dislike",
  "not like",
  "not for me",
  "not really my style",
  "something else",
  "different",
  "another",
  "other options",
  "other option",
  "alternatives",
  "alternative",
];

const PRODUCT_REFERENCE_WORDS = [
  "product",
  "products",
  "dress",
  "dresses",
  "shirt",
  "shirts",
  "lawn",
  "chiffon",
  "shoe",
  "shoes",
  "jacket",
  "jackets",
  "bag",
  "bags",
  "pants",
  "item",
  "items",
  "outfit",
  "outfits",
];

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// CHECK OBJECTION OR ALTERNATIVE REQUEST
// =====================================================

export function isObjectionOrAlternative(message: string): boolean {
  const text = normalize(message);
  if (!text) return false;
  return (
    OBJECTION_WORDS.some((word) => text.includes(word)) ||
    /\b(?:don'?t\s+like|dislike|not\s+(?:for\s+me|my\s+style)|show\s+(?:me\s+)?(?:something\s+else|another|different)|something\s+else|different\s+(?:one|color|style|option)|other\s+options?|alternatives?)\b/i.test(
      text
    )
  );
}

// =====================================================
// CHECK FOLLOW-UP
// =====================================================

export function isProductFollowUp(
  message: string
) {
  const text = normalize(message);

  if (!text) {
    return false;
  }

  const hasReference =
    FOLLOW_UP_WORDS.some((word) =>
      text.includes(word)
    );

  const hasProductQuestion =
    [
      ...PRICE_WORDS,
      ...AVAILABILITY_WORDS,
      ...MATERIAL_WORDS,
      ...LINK_WORDS,
      ...OBJECTION_WORDS,
      ...PRODUCT_REFERENCE_WORDS,
    ].some((word) =>
      text.includes(word)
    );

  return (
    hasReference ||
    hasProductQuestion ||
    isObjectionOrAlternative(text)
  );
}

// =====================================================
// GET LAST PRODUCT CONTEXT
// =====================================================

export function getLastProductContext(
  history: any[]
) {
  if (!Array.isArray(history)) {
    return "";
  }

  const recentMessages =
    history.slice(-10);

  // Look backwards for the latest
  // meaningful product-related AI/customer text.
  for (
    let i = recentMessages.length - 1;
    i >= 0;
    i--
  ) {
    const item =
      recentMessages[i];

    const content =
      normalize(item?.content);

    if (!content) {
      continue;
    }

    const isProductMessage =
      PRODUCT_REFERENCE_WORDS.some(
        (word) =>
          content.includes(word)
      );

    if (isProductMessage) {
      return String(
        item.content || ""
      ).trim();
    }
  }

  return "";
}

// =====================================================
// RESOLVE FOLLOW-UP QUERY
// =====================================================

export function resolveProductContext(
  message: string,
  history: any[]
) {
  const current =
    String(message || "").trim();

  if (!current) {
    return "";
  }

  if (!isProductFollowUp(current)) {
    return current;
  }

  const context =
    getLastProductContext(history);

  if (!context) {
    return current;
  }

  const text =
    normalize(current);

  // ---------------------------------------------------
  // PRICE FOLLOW-UP
  // ---------------------------------------------------

  if (
    PRICE_WORDS.some((word) =>
      text.includes(word)
    ) &&
    FOLLOW_UP_WORDS.some((word) =>
      text.includes(word)
    )
  ) {
    return `${current} regarding these products: ${context}`;
  }

  // ---------------------------------------------------
  // AVAILABILITY FOLLOW-UP
  // ---------------------------------------------------

  if (
    AVAILABILITY_WORDS.some(
      (word) =>
        text.includes(word)
    ) &&
    FOLLOW_UP_WORDS.some((word) =>
      text.includes(word)
    )
  ) {
    return `${current} regarding these products: ${context}`;
  }

  // ---------------------------------------------------
  // GENERAL PRODUCT FOLLOW-UP
  // ---------------------------------------------------

  if (
    FOLLOW_UP_WORDS.some((word) =>
      text.includes(word)
    )
  ) {
    return `${current} regarding these products: ${context}`;
  }

  return current;
}