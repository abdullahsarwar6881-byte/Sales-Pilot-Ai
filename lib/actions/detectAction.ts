import {
  ActionRequest,
} from "./types";

// =====================================================
// EXTRACT ORDER NUMBER
// =====================================================

function extractOrderNumber(
  message: string
) {
  const text =
    message
      .trim()
      .replace(
        /\s+/g,
        " "
      );

  // -------------------------------------------------
  // #1001
  // -------------------------------------------------

  const hashMatch =
    text.match(
      /#\s*(\d{1,12})\b/
    );

  if (
    hashMatch
  ) {
    return hashMatch[1];
  }

  // -------------------------------------------------
  // order 1001
  // order #1001
  // order number 1001
  // order no 1001
  // order no. 1001
  // -------------------------------------------------

  const orderMatch =
    text.match(
      /\border\s*(?:number|no\.?|#)?\s*(\d{1,12})\b/i
    );

  if (
    orderMatch
  ) {
    return orderMatch[1];
  }

  // -------------------------------------------------
  // order number is 1001
  // order number is #1001
  // order is 1001
  // order was 1001
  // order = 1001
  // -------------------------------------------------

  const orderIsMatch =
    text.match(
      /\border\s*(?:number|no\.?)?\s*(?:is|was|=|:)\s*#?\s*(\d{1,12})\b/i
    );

  if (
    orderIsMatch
  ) {
    return orderIsMatch[1];
  }

  // -------------------------------------------------
  // its number 1001
  // it's number 1001
  // its order number 1001
  // it's order number 1001
  // its number is 1001
  // -------------------------------------------------

  const itsNumberMatch =
    text.match(
      /\b(?:its|it's)\s+(?:order\s+)?number\s+(?:is\s+)?#?\s*(\d{1,12})\b/i
    );

  if (
    itsNumberMatch
  ) {
    return itsNumberMatch[1];
  }

  // -------------------------------------------------
  // number 1001
  // number is 1001
  // number: 1001
  // -------------------------------------------------

  const numberMatch =
    text.match(
      /\bnumber\s*(?:is|=|:)?\s*#?\s*(\d{1,12})\b/i
    );

  if (
    numberMatch
  ) {
    return numberMatch[1];
  }

  return null;
}

// =====================================================
// DETECT ACTION
// =====================================================

export function detectAction(
  message: string
): ActionRequest | null {
  const text =
    message
      .toLowerCase()
      .trim();

  // =================================================
  // HUMAN HANDOFF
  // =================================================

  if (
    [
      "talk to human",
      "talk to a human",
      "speak to human",
      "speak to a human",
      "human support",
      "contact support",
      "real person",
      "customer service",
      "agent",
    ].some(
      (phrase) =>
        text.includes(
          phrase
        )
    )
  ) {
    return {
      action:
        "handoff_to_human",

      parameters: {},
    };
  }

  // =================================================
  // EXTRACT ORDER NUMBER
  // =================================================

  const orderNumber =
    extractOrderNumber(
      message
    );

  // =================================================
  // ORDER STATUS
  // =================================================

  const orderStatusPhrases = [
    "where is my order",
    "where's my order",
    "where is the order",
    "where's the order",
    "track my order",
    "track order",
    "track the order",
    "order status",
    "order tracking",
    "has my order shipped",
    "has my order been shipped",
    "when will my order arrive",
    "when is my order arriving",
    "when will the order arrive",
    "where is my package",
    "where's my package",
    "track my package",
    "package status",
    "shipment status",
    "shipping status",
  ];

  const asksOrderStatus =
    orderStatusPhrases.some(
      (phrase) =>
        text.includes(
          phrase
        )
    );

  if (
    asksOrderStatus
  ) {
    console.log(
      "ORDER STATUS ACTION DETECTED"
    );

    console.log(
      "ORDER NUMBER:",
      orderNumber
    );

    return {
      action:
        "get_order_status",

      parameters: {
        orderNumber,
      },
    };
  }

  // =================================================
  // ORDER DETAILS
  // =================================================

  const orderDetailPhrases = [
    "order details",
    "details of my order",
    "details for my order",
    "details about my order",
    "what did i order",
    "what is in my order",
    "what's in my order",
    "what is in the order",
    "what's in the order",
    "items in my order",
    "items in the order",
    "order items",
    "products in my order",
    "products in the order",
  ];

  const asksOrderDetails =
    orderDetailPhrases.some(
      (phrase) =>
        text.includes(
          phrase
        )
    );

  if (
    asksOrderDetails
  ) {
    console.log(
      "ORDER DETAILS ACTION DETECTED"
    );

    console.log(
      "ORDER NUMBER:",
      orderNumber
    );

    return {
      action:
        "get_order_details",

      parameters: {
        orderNumber,
      },
    };
  }

  // =================================================
  // PRODUCT SEARCH PHRASES
  // =================================================

  const productSearchWords = [
    "show me",
    "show",
    "find me",
    "find",
    "looking for",
    "looking to buy",
    "recommend",
    "recommend me",

    "what products",
    "which products",
    "what product",
    "which product",

    "products do you have",
    "product do you have",

    "what do you have",
    "what do you sell",
    "what can i buy",
    "what can i purchase",

    "do you have",
    "do you sell",
    "have you got",

    "available products",
    "available",

    "shop",
    "browse",
    "browse products",
  ];

  // =================================================
  // PRODUCT WORDS
  // =================================================

  const productWords = [
    "product",
    "products",

    "hoodie",
    "hoodies",

    "shirt",
    "shirts",

    "t-shirt",
    "t-shirts",

    "shoe",
    "shoes",

    "cap",
    "caps",

    "jacket",
    "jackets",

    "dress",
    "dresses",

    "pants",

    "jeans",

    "bag",
    "bags",

    "watch",
    "watches",
  ];

  // =================================================
  // CHECK PRODUCT SEARCH
  // =================================================

  const hasSearchPhrase =
    productSearchWords.some(
      (phrase) =>
        text.includes(
          phrase
        )
    );

  const hasProductWord =
    productWords.some(
      (word) =>
        text.includes(
          word
        )
    );

  // =================================================
  // PRODUCT SEARCH ACTION
  // =================================================

  if (
    hasSearchPhrase &&
    hasProductWord
  ) {
    console.log(
      "PRODUCT SEARCH ACTION DETECTED"
    );

    console.log(
      "PRODUCT QUERY:",
      message
    );

    return {
      action:
        "search_products",

      parameters: {
        query:
          message,
      },
    };
  }

  // =================================================
  // DIRECT PRODUCT CATEGORY
  // =================================================

  if (
    text === "hoodies" ||
    text === "shirts" ||
    text === "shoes" ||
    text === "jackets" ||
    text === "caps" ||
    text === "dresses" ||
    text === "pants" ||
    text === "jeans" ||
    text === "bags" ||
    text === "watches"
  ) {
    console.log(
      "DIRECT PRODUCT CATEGORY DETECTED"
    );

    return {
      action:
        "search_products",

      parameters: {
        query:
          message,
      },
    };
  }

  // =================================================
  // NO ACTION
  // =================================================

  return null;
}