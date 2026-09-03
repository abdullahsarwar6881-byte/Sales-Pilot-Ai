import {
  cleanProductName,
  cleanProductDescription,
  cleanProductPrice,
  cleanProductUrl,
  cleanProductText,
} from "./cleanProduct";

import type {
  CleanProduct,
} from "./cleanProduct";

// =====================================================
// NORMALIZE PRODUCT
// =====================================================

export function normalizeProduct(
  product: any
): CleanProduct {
  // ---------------------------------------------------
  // NAME
  // ---------------------------------------------------

  const name = cleanProductName(
    product?.name ||
      product?.title ||
      product?.product_name ||
      product?.page_title ||
      ""
  );

  // ---------------------------------------------------
  // DESCRIPTION
  // ---------------------------------------------------

  const description =
    cleanProductDescription(
      product?.description ||
        product?.body_html ||
        product?.content ||
        ""
    );

  // ---------------------------------------------------
  // PRICE
  // ---------------------------------------------------

  const price =
    cleanProductPrice(
      product?.price ||
        product?.min_price ||
        product?.amount ||
        ""
    );

  // ---------------------------------------------------
  // CURRENCY
  // ---------------------------------------------------

  const currency =
    cleanProductText(
      product?.currency ||
        product?.currency_code ||
        ""
    );

  // ---------------------------------------------------
  // PRODUCT URL
  // ---------------------------------------------------

  const productUrl =
    cleanProductUrl(
      product?.productUrl ||
        product?.product_url ||
        product?.url ||
        product?.page_url ||
        product?.source_url ||
        ""
    );

  // ---------------------------------------------------
  // IMAGE
  // ---------------------------------------------------

  const imageUrl =
    cleanProductUrl(
      product?.imageUrl ||
        product?.image_url ||
        product?.image ||
        product?.featured_image ||
        product?.featuredImage ||
        ""
    );

  // ---------------------------------------------------
  // SKU
  // ---------------------------------------------------

  const sku =
    cleanProductText(
      product?.sku ||
        ""
    );

  // ---------------------------------------------------
  // AVAILABILITY
  // ---------------------------------------------------

  let available:
    | boolean
    | undefined;

  if (
    typeof product?.available ===
    "boolean"
  ) {
    available =
      product.available;
  } else if (
    typeof product?.available_for_sale ===
    "boolean"
  ) {
    available =
      product.available_for_sale;
  } else if (
    typeof product?.availableForSale ===
    "boolean"
  ) {
    available =
      product.availableForSale;
  } else if (
    typeof product?.in_stock ===
    "boolean"
  ) {
    available =
      product.in_stock;
  } else if (
    typeof product?.inventory_quantity ===
    "number"
  ) {
    available =
      product.inventory_quantity > 0;
  }

  // ---------------------------------------------------
  // COLLECTION NAMES
  // ---------------------------------------------------

  const collectionNames =
    extractCollectionNames(
      product
    );

  // ---------------------------------------------------
  // COLLECTION URLS
  // ---------------------------------------------------

  const collectionUrls =
    extractCollectionUrls(
      product
    );

  // ---------------------------------------------------
  // RETURN NORMALIZED PRODUCT
  // ---------------------------------------------------

  return {
    id:
      product?.id ||
      product?.product_id ||
      undefined,

    externalId:
      product?.externalId ||
      product?.external_id ||
      product?.shopify_product_id ||
      undefined,

    name,

    description:
      description || undefined,

    price:
      price || undefined,

    currency:
      currency || undefined,

    available,

    imageUrl:
      imageUrl || undefined,

    productUrl,

    sku:
      sku || undefined,

    collectionNames,

    collectionUrls,
  };
}

// =====================================================
// COLLECTION NAMES
// =====================================================

function extractCollectionNames(
  product: any
): string[] {
  const values: string[] = [];

  // Array
  if (
    Array.isArray(
      product?.collectionNames
    )
  ) {
    values.push(
      ...product.collectionNames
    );
  }

  if (
    Array.isArray(
      product?.collections
    )
  ) {
    for (
      const collection of
        product.collections
    ) {
      if (
        typeof collection ===
        "string"
      ) {
        values.push(collection);
      } else if (
        collection?.title
      ) {
        values.push(
          String(
            collection.title
          )
        );
      } else if (
        collection?.name
      ) {
        values.push(
          String(
            collection.name
          )
        );
      }
    }
  }

  if (
    typeof product?.collection ===
    "string"
  ) {
    values.push(
      product.collection
    );
  }

  return uniqueCleanStrings(
    values
  );
}

// =====================================================
// COLLECTION URLS
// =====================================================

function extractCollectionUrls(
  product: any
): string[] {
  const values: string[] = [];

  if (
    Array.isArray(
      product?.collectionUrls
    )
  ) {
    values.push(
      ...product.collectionUrls
    );
  }

  if (
    Array.isArray(
      product?.collections
    )
  ) {
    for (
      const collection of
        product.collections
    ) {
      if (
        typeof collection ===
        "object" &&
        collection?.url
      ) {
        values.push(
          String(
            collection.url
          )
        );
      }

      if (
        typeof collection ===
        "object" &&
        collection?.handle
      ) {
        const shopUrl =
          product?.storeUrl ||
          product?.shopUrl;

        if (shopUrl) {
          values.push(
            `${String(
              shopUrl
            ).replace(
              /\/$/,
              ""
            )}/collections/${String(
              collection.handle
            ).replace(
              /^\//,
              ""
            )}`
          );
        }
      }
    }
  }

  return uniqueCleanUrls(
    values
  );
}

// =====================================================
// UNIQUE CLEAN STRINGS
// =====================================================

function uniqueCleanStrings(
  values: string[]
): string[] {
  const result: string[] = [];

  const seen =
    new Set<string>();

  for (
    const value of values
  ) {
    const cleaned =
      cleanProductText(
        value
      );

    if (!cleaned) {
      continue;
    }

    const key =
      cleaned.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push(
      cleaned
    );
  }

  return result;
}

// =====================================================
// UNIQUE URLS
// =====================================================

function uniqueCleanUrls(
  values: string[]
): string[] {
  const result: string[] = [];

  const seen =
    new Set<string>();

  for (
    const value of values
  ) {
    const cleaned =
      cleanProductUrl(
        value
      );

    if (!cleaned) {
      continue;
    }

    const key =
      cleaned.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push(
      cleaned
    );
  }

  return result;
}