import {
  ActionRequest,
} from "./types";

export function detectAction(
  message: string
): ActionRequest | null {
  const text =
    message.toLowerCase().trim();

  // --------------------------------
  // HUMAN HANDOFF
  // --------------------------------

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
    ].some((phrase) =>
      text.includes(phrase)
    )
  ) {
    return {
      action: "handoff_to_human",

      parameters: {},
    };
  }

  // --------------------------------
  // ORDER STATUS
  // --------------------------------

  if (
    [
      "where is my order",
      "where's my order",
      "track my order",
      "track order",
      "order status",
      "order tracking",
      "has my order shipped",
    ].some((phrase) =>
      text.includes(phrase)
    )
  ) {
    return {
      action: "get_order_status",

      parameters: {},
    };
  }

  // --------------------------------
  // PRODUCT SEARCH PHRASES
  // --------------------------------

  const productSearchWords = [
    "show me",
    "show",
    "find me",
    "find",
    "looking for",
    "looking to buy",
    "recommend",
    "recommend me",

    // Product questions
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

    // Availability / browsing
    "available products",
    "available",
    "shop",
    "browse",
    "browse products",
  ];

  // --------------------------------
  // PRODUCT WORDS
  // --------------------------------

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

  // --------------------------------
  // CHECK PRODUCT SEARCH
  // --------------------------------

  const hasSearchPhrase =
    productSearchWords.some(
      (phrase) =>
        text.includes(phrase)
    );

  const hasProductWord =
    productWords.some(
      (word) =>
        text.includes(word)
    );

  // --------------------------------
  // PRODUCT SEARCH ACTION
  // --------------------------------
  //
  // Examples:
  //
  // "Show me hoodies"
  // "Find black shirts"
  // "Recommend a jacket"
  // "Do you have t shirts"
  // "Do you sell shoes"
  // "What products do you have"
  // "What do you have"
  //
  // --------------------------------

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
      action: "search_products",

      parameters: {
        query: message,
      },
    };
  }

  // --------------------------------
  // DIRECT PRODUCT CATEGORY REQUEST
  // --------------------------------
  //
  // Examples:
  //
  // "hoodies"
  // "shirts"
  // "shoes"
  // "jackets"
  //
  // --------------------------------

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
      action: "search_products",

      parameters: {
        query: message,
      },
    };
  }

  // --------------------------------
  // NO ACTION
  // --------------------------------

  return null;
}