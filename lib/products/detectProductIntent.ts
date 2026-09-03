export type ProductIntent =
  | "catalog"
  | "collection"
  | "product"
  | "general";

export function detectProductIntent(
  message: string
): ProductIntent {
  const text =
    message
      .toLowerCase()
      .trim();

  const catalogWords = [
    "which products",
    "what products",
    "what do you sell",
    "what do you have",
    "all products",
    "everything",
    "catalog",
    "catalogue",
    "browse products",
    "show me everything",
  ];

  if (
    catalogWords.some(
      (word) =>
        text.includes(word)
    )
  ) {
    return "catalog";
  }

  const collectionWords = [
    "collection",
    "category",
    "dresses",
    "shirts",
    "shoes",
    "lawn",
    "embroidered",
    "formal",
    "ready to wear",
    "unstitched",
    "sale",
  ];

  if (
    collectionWords.some(
      (word) =>
        text.includes(word)
    )
  ) {
    return "collection";
  }

  const productWords = [
    "price",
    "how much",
    "do you have",
    "is this available",
    "available",
    "buy",
    "show me",
  ];

  if (
    productWords.some(
      (word) =>
        text.includes(word)
    )
  ) {
    return "product";
  }

  return "general";
}