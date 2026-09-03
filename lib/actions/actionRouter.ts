import {
  ActionName,
  ActionResult,
} from "./types";

import {
  searchProducts,
} from "./searchProducts";

import {
  getOrder,
} from "./getOrder";

// =====================================================
// ACTION EXECUTOR
// =====================================================
//
// Production goals:
//
// 1. Validate all incoming action parameters.
// 2. Keep product-search context intact.
// 3. Support natural catalog / shopping queries.
// 4. Preserve structured product data for the AI/UI layer.
// 5. Normalize order numbers safely.
// 6. Prevent malformed values from reaching integrations.
// 7. Return predictable ActionResult objects.
// 8. Keep customer-facing response generation OUT of this layer.
// 9. Remain compatible with the existing searchProducts()
//    and getOrder() function signatures.
// =====================================================

// =====================================================
// TYPES
// =====================================================

interface PriceRange {
  min?: number;
  max?: number;
}

interface ProductQueryAnalysis {
  isCatalogQuery: boolean;
  isShoppingQuery: boolean;
  hasPriceRange: boolean;
  priceMin?: number;
  priceMax?: number;
}

interface ProductSearchData {
  products: unknown[];
  count: number;
  query: string;
  originalQuery: string;
  analysis: ProductQueryAnalysis;
  isCatalogQuery: boolean;
  hasPriceRange: boolean;
  priceMin?: number;
  priceMax?: number;
}

// =====================================================
// CONSTANTS
// =====================================================

const MAX_SEARCH_QUERY_LENGTH = 500;
const MAX_PROFILE_ID_LENGTH = 200;
const MAX_ORDER_NUMBER_LENGTH = 100;
const MAX_PRODUCT_ID_LENGTH = 200;
const MAX_PRODUCT_NAME_LENGTH = 300;

const MAX_PRODUCT_RESULTS =
  50;

// =====================================================
// SAFE STRING
// =====================================================

function getString(
  value: unknown
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
}

// =====================================================
// SAFE NUMBER
// =====================================================

function getNumber(
  value: unknown
): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed =
      Number(
        value
          .replace(
            /,/g,
            ""
          )
          .trim()
      );

    if (
      Number.isFinite(parsed)
    ) {
      return parsed;
    }
  }

  return undefined;
}

// =====================================================
// LIMIT STRING
// =====================================================

function limitString(
  value: unknown,
  maxLength: number
): string {
  return getString(value).slice(
    0,
    maxLength
  );
}

// =====================================================
// NORMALIZE TEXT
// =====================================================

function normalizeText(
  value: string
): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(
      /[\u0000-\u001F\u007F]/g,
      " "
    )
    .replace(
      /[!?.,;:()[\]{}]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

// =====================================================
// CONTAINS ANY
// =====================================================

function containsAny(
  text: string,
  values: string[]
): boolean {
  return values.some(
    (value) =>
      text.includes(
        value
      )
  );
}

// =====================================================
// WORD-BASED MATCH
// =====================================================
//
// Prevents false positives such as:
//
// "bag" matching "baggage"
// "cap" matching "capacity"
// =====================================================

function containsAnyWord(
  text: string,
  values: string[]
): boolean {
  return values.some(
    (value) => {
      const escaped =
        value.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      return new RegExp(
        `(?:^|\\s)${escaped}(?:$|\\s)`,
        "i"
      ).test(text);
    }
  );
}

// =====================================================
// CATALOG QUERY
// =====================================================

function isCatalogQuery(
  query: string
): boolean {
  const text =
    normalizeText(query);

  if (!text) {
    return false;
  }

  const catalogPatterns = [
    "what do you sell",
    "what you sell",

    "what products do you sell",
    "what product do you sell",

    "what do you have",

    "what products do you have",
    "what product do you have",

    "which products do you have",
    "which product do you have",

    "which products you have",
    "which product you have",

    "what products are available",
    "what products available",

    "show me your products",
    "show me products",
    "show your products",
    "show products",

    "show me everything",
    "show everything",

    "all products",
    "all your products",

    "everything you have",
    "everything you sell",

    "what can i buy",
    "what can i purchase",

    "what is available",
    "whats available",
    "what's available",

    "what are available",

    "available products",
    "available items",

    "browse products",
    "browse your products",
    "browse the products",

    "product catalog",
    "product catalogue",

    "catalog",
    "catalogue",

    "shop",
  ];

  return catalogPatterns.some(
    (pattern) =>
      text === pattern ||
      text.includes(pattern)
  );
}

// =====================================================
// PRODUCT SEARCH QUERY
// =====================================================
//
// Keep the customer's actual query.
//
// DO NOT convert:
//
// "show me black dresses"
//
// into:
//
// "products"
//
// because doing that destroys useful search intent.
// =====================================================

function normalizeProductSearchQuery(
  query: string
): string {
  const clean =
    limitString(
      query,
      MAX_SEARCH_QUERY_LENGTH
    );

  if (!clean) {
    return "";
  }

  return clean
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

// =====================================================
// PRICE RANGE EXTRACTION
// =====================================================

function extractPriceRange(
  query: string
): PriceRange {
  const text =
    normalizeText(query);

  if (!text) {
    return {};
  }

  // ---------------------------------------------------
  // "between 1500 and 6000"
  // ---------------------------------------------------

  const betweenMatch =
    text.match(
      /\bbetween\s+(\d[\d,]*)\s+(?:and|to|-)\s+(\d[\d,]*)\b/i
    );

  if (betweenMatch) {
    const min =
      getNumber(
        betweenMatch[1]
      );

    const max =
      getNumber(
        betweenMatch[2]
      );

    return normalizePriceRange(
      min,
      max
    );
  }

  // ---------------------------------------------------
  // "1500 to 6000"
  // ---------------------------------------------------

  const rangeMatch =
    text.match(
      /\b(\d[\d,]*)\s*(?:to|-)\s*(\d[\d,]*)\b/i
    );

  if (rangeMatch) {
    const min =
      getNumber(
        rangeMatch[1]
      );

    const max =
      getNumber(
        rangeMatch[2]
      );

    return normalizePriceRange(
      min,
      max
    );
  }

  // ---------------------------------------------------
  // "between Rs 1500 and Rs 6000"
  // ---------------------------------------------------

  const currencyBetweenMatch =
    text.match(
      /\bbetween\s+(?:rs\.?|pkr|₨|\$)?\s*(\d[\d,]*)\s+(?:and|to|-)\s+(?:rs\.?|pkr|₨|\$)?\s*(\d[\d,]*)\b/i
    );

  if (currencyBetweenMatch) {
    return normalizePriceRange(
      getNumber(
        currencyBetweenMatch[1]
      ),
      getNumber(
        currencyBetweenMatch[2]
      )
    );
  }

  // ---------------------------------------------------
  // "under 6000"
  // ---------------------------------------------------

  const underMatch =
    text.match(
      /\b(?:under|below|less than|max(?:imum)?|up to)\s+(?:rs\.?|pkr|₨|\$)?\s*(\d[\d,]*)\b/i
    );

  if (underMatch) {
    const max =
      getNumber(
        underMatch[1]
      );

    return {
      max,
    };
  }

  // ---------------------------------------------------
  // "above 1500"
  // ---------------------------------------------------

  const aboveMatch =
    text.match(
      /\b(?:over|above|more than|at least|minimum|from)\s+(?:rs\.?|pkr|₨|\$)?\s*(\d[\d,]*)\b/i
    );

  if (aboveMatch) {
    const min =
      getNumber(
        aboveMatch[1]
      );

    return {
      min,
    };
  }

  return {};
}

// =====================================================
// NORMALIZE PRICE RANGE
// =====================================================

function normalizePriceRange(
  min?: number,
  max?: number
): PriceRange {
  if (
    min === undefined &&
    max === undefined
  ) {
    return {};
  }

  if (
    min !== undefined &&
    max !== undefined &&
    min > max
  ) {
    return {
      min: max,
      max: min,
    };
  }

  return {
    min,
    max,
  };
}

// =====================================================
// PRICE RANGE DETECTION
// =====================================================

function hasPriceRange(
  query: string
): boolean {
  const range =
    extractPriceRange(
      query
    );

  return (
    range.min !== undefined ||
    range.max !== undefined
  );
}

// =====================================================
// SHOPPING QUERY DETECTION
// =====================================================

function isShoppingQuery(
  query: string
): boolean {
  const text =
    normalizeText(query);

  if (!text) {
    return false;
  }

  // ---------------------------------------------------
  // Product language
  // ---------------------------------------------------

  const productWords = [
    "product",
    "products",

    "item",
    "items",

    "dress",
    "dresses",

    "outfit",
    "outfits",

    "suit",
    "suits",

    "shirt",
    "shirts",

    "tshirt",
    "t shirts",
    "t shirt",

    "shoe",
    "shoes",

    "footwear",

    "bag",
    "bags",

    "jacket",
    "jackets",

    "hoodie",
    "hoodies",

    "sweater",
    "sweaters",

    "pants",
    "jeans",

    "trouser",
    "trousers",

    "watch",
    "watches",

    "cap",
    "caps",

    "hat",
    "hats",

    "lawn",
    "chiffon",
    "cotton",
    "cambric",

    "silk",
    "linen",

    "embroidered",
    "embroidery",

    "printed",
    "print",

    "unstitched",
    "stitched",

    "pret",

    "collection",
    "collections",

    "category",
    "categories",
  ];

  if (
    containsAnyWord(
      text,
      productWords
    ) ||
    containsAny(
      text,
      [
        "t-shirt",
        "2 pcs",
        "3 pcs",
        "two piece",
        "three piece",
        "price range",
      ]
    )
  ) {
    return true;
  }

  // ---------------------------------------------------
  // Shopping phrases
  // ---------------------------------------------------

  const shoppingPhrases = [
    "show me",
    "find me",
    "looking for",
    "looking to buy",
    "looking for something",

    "recommend",
    "recommend me",

    "what can i buy",
    "what can i purchase",

    "do you have",
    "do you sell",

    "have you got",

    "available",
    "available products",

    "browse",
    "shop",

    "something",
    "options",
    "more options",
    "other options",

    "similar",
    "another one",
    "another option",

    "price range",
    "budget",
    "under rs",
    "under pkr",
    "under $",

    "how much",
    "what does it cost",
    "price of",
  ];

  if (
    containsAny(
      text,
      shoppingPhrases
    )
  ) {
    return true;
  }

  // ---------------------------------------------------
  // Price query
  // ---------------------------------------------------

  if (
    hasPriceRange(
      query
    )
  ) {
    return true;
  }

  return false;
}

// =====================================================
// PRODUCT QUERY ANALYSIS
// =====================================================

function analyzeProductQuery(
  query: string
): ProductQueryAnalysis {
  const priceRange =
    extractPriceRange(
      query
    );

  const catalog =
    isCatalogQuery(
      query
    );

  const shopping =
    isShoppingQuery(
      query
    );

  return {
    isCatalogQuery:
      catalog,

    isShoppingQuery:
      shopping,

    hasPriceRange:
      priceRange.min !== undefined ||
      priceRange.max !== undefined,

    priceMin:
      priceRange.min,

    priceMax:
      priceRange.max,
  };
}

// =====================================================
// PROFILE ID
// =====================================================

function getProfileId(
  parameters: Record<
    string,
    unknown
  >
): string {
  return limitString(
    parameters.profileId ??
      parameters.userId,
    MAX_PROFILE_ID_LENGTH
  );
}

// =====================================================
// PRODUCT ID
// =====================================================

function getProductId(
  parameters: Record<
    string,
    unknown
  >
): string {
  return limitString(
    parameters.productId ??
      parameters.product_id,
    MAX_PRODUCT_ID_LENGTH
  );
}

// =====================================================
// PRODUCT NAME
// =====================================================

function getProductName(
  parameters: Record<
    string,
    unknown
  >
): string {
  return limitString(
    parameters.productName ??
      parameters.product_name,
    MAX_PRODUCT_NAME_LENGTH
  );
}

// =====================================================
// ORDER NUMBER
// =====================================================
//
// Accept:
//
// #1001
// 1001
// Order #1001
// order 1001
//
// Preserve the actual number instead of sending an
// unnecessarily verbose customer sentence downstream.
// =====================================================

function normalizeOrderNumber(
  value: unknown
): string {
  const raw =
    limitString(
      value,
      MAX_ORDER_NUMBER_LENGTH
    );

  if (!raw) {
    return "";
  }

  const cleaned =
    raw
      .replace(
        /^order\s*(?:number|no\.?|#)?\s*/i,
        ""
      )
      .replace(
        /^#\s*/,
        ""
      )
      .trim();

  return cleaned.slice(
    0,
    MAX_ORDER_NUMBER_LENGTH
  );
}

// =====================================================
// PRODUCT QUERY RESOLUTION
// =====================================================

function resolveProductQuery(
  parameters: Record<
    string,
    unknown
  >
): {
  rawQuery: string;
  contextQuery: string;
  effectiveQuery: string;
} {
  const resolvedQuery =
    normalizeProductSearchQuery(
      getString(
        parameters.resolvedQuery
      )
    );

  const parameterQuery =
    normalizeProductSearchQuery(
      getString(
        parameters.query
      )
    );

  const originalQuery =
    normalizeProductSearchQuery(
      getString(
        parameters.originalQuery
      )
    );

  const contextQuery =
    normalizeProductSearchQuery(
      getString(
        parameters.contextQuery
      )
    );

  // Priority:
  //
  // resolvedQuery
  // query
  // originalQuery
  // contextQuery
  //
  // This preserves conversation-resolved product context
  // while still supporting older callers.
  const effectiveQuery =
    resolvedQuery ||
    parameterQuery ||
    originalQuery ||
    contextQuery;

  return {
    rawQuery:
      resolvedQuery ||
      parameterQuery ||
      originalQuery,

    contextQuery,

    effectiveQuery,
  };
}

// =====================================================
// PRODUCT RESULT SANITIZATION
// =====================================================
//
// We do NOT mutate the product objects.
//
// We only remove null / undefined entries and cap the
// amount returned to the rest of the application.
// =====================================================

function sanitizeProducts(
  products: unknown
): unknown[] {
  if (
    !Array.isArray(products)
  ) {
    return [];
  }

  return products
    .filter(
      (product) =>
        product !== null &&
        product !== undefined
    )
    .slice(
      0,
      MAX_PRODUCT_RESULTS
    );
}

// =====================================================
// PRODUCT RESULT DEDUPLICATION
// =====================================================
//
// Keeps the original product object untouched.
// Uses common identifiers where available.
// =====================================================

function deduplicateProducts(
  products: unknown[]
): unknown[] {
  const seen =
    new Set<string>();

  const result: unknown[] =
    [];

  for (
    const product of products
  ) {
    if (
      !product ||
      typeof product !== "object"
    ) {
      continue;
    }

    const item =
      product as Record<
        string,
        unknown
      >;

    const id =
      getString(
        item.id ??
          item.productId ??
          item.product_id
      );

    const url =
      getString(
        item.productUrl ??
          item.product_url ??
          item.url ??
          item.page_url
      )
        .toLowerCase()
        .replace(
          /\/+$/,
          ""
        );

    const name =
      getString(
        item.name ??
          item.title ??
          item.product_name
      )
        .toLowerCase()
        .replace(
          /\s+/g,
          " "
        );

    const key =
      id ||
      url ||
      name;

    if (!key) {
      result.push(
        product
      );

      continue;
    }

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(
      key
    );

    result.push(
      product
    );

    if (
      result.length >=
      MAX_PRODUCT_RESULTS
    ) {
      break;
    }
  }

  return result;
}

// =====================================================
// SEARCH RESULT DATA
// =====================================================

function buildProductSearchData(
  products: unknown[],
  effectiveQuery: string,
  originalQuery: string,
  analysis: ProductQueryAnalysis
): ProductSearchData {
  const safeProducts =
    deduplicateProducts(
      sanitizeProducts(
        products
      )
    );

  return {
    products:
      safeProducts,

    count:
      safeProducts.length,

    query:
      effectiveQuery,

    originalQuery:
      originalQuery ||
      effectiveQuery,

    analysis,

    isCatalogQuery:
      analysis.isCatalogQuery,

    hasPriceRange:
      analysis.hasPriceRange,

    priceMin:
      analysis.priceMin,

    priceMax:
      analysis.priceMax,
  };
}

// =====================================================
// ERROR MESSAGE
// =====================================================

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message.trim();
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message =
      getString(
        (
          error as {
            message?: unknown;
          }
        ).message
      );

    if (message) {
      return message;
    }
  }

  return fallback;
}

// =====================================================
// LOG ACTION FAILURE
// =====================================================

function logActionError(
  action: ActionName,
  error: unknown
): void {
  console.error(
    "================================="
  );

  console.error(
    "ACTION FAILED:",
    action
  );

  console.error(
    "ERROR:",
    error
  );

  console.error(
    "================================="
  );
}

// =====================================================
// EXECUTE ACTION
// =====================================================

export async function executeAction(
  action: ActionName,
  parameters: Record<
    string,
    unknown
  >
): Promise<ActionResult> {
  const safeParameters =
    parameters &&
    typeof parameters === "object"
      ? parameters
      : {};

  console.log(
    "================================="
  );

  console.log(
    "EXECUTING ACTION:",
    action
  );

  console.log(
    "PARAMETERS:",
    safeParameters
  );

  console.log(
    "================================="
  );

  try {
    switch (
      action
    ) {
      // =================================================
      // SEARCH PRODUCTS
      // =================================================

      case "search_products": {
        const profileId =
          getProfileId(
            safeParameters
          );

        if (!profileId) {
          return {
            success: false,

            error:
              "Profile information is missing.",
          };
        }

        const {
          rawQuery,
          contextQuery,
          effectiveQuery,
        } =
          resolveProductQuery(
            safeParameters
          );

        if (
          !effectiveQuery
        ) {
          return {
            success: false,

            error:
              "Product search query is missing.",
          };
        }

        const analysis =
          analyzeProductQuery(
            effectiveQuery
          );

        console.log(
          "PRODUCT SEARCH RAW QUERY:",
          rawQuery
        );

        console.log(
          "PRODUCT SEARCH CONTEXT QUERY:",
          contextQuery
        );

        console.log(
          "PRODUCT SEARCH FINAL QUERY:",
          effectiveQuery
        );

        console.log(
          "PRODUCT QUERY ANALYSIS:",
          analysis
        );

        // -----------------------------------------------
        // SEARCH
        // -----------------------------------------------

        const products =
          await searchProducts(
            profileId,
            effectiveQuery
          );

        const data =
          buildProductSearchData(
            products,
            effectiveQuery,
            rawQuery ||
              effectiveQuery,
            analysis
          );

        console.log(
          "PRODUCT SEARCH RESULT COUNT:",
          data.count
        );

        // -----------------------------------------------
        // STRUCTURED RESULT
        // -----------------------------------------------
        //
        // The AI/chat route is responsible for creating
        // the final customer-facing message.
        //
        // This executor only retrieves and describes the
        // result.
        // -----------------------------------------------

        return {
          success: true,

          data,
        };
      }

      // =================================================
      // ORDER STATUS
      // =================================================

      case "get_order_status": {
        const profileId =
          getProfileId(
            safeParameters
          );

        const orderNumber =
          normalizeOrderNumber(
            safeParameters.orderNumber ??
              safeParameters.order_number
          );

        if (!profileId) {
          return {
            success: false,

            error:
              "Profile information is missing.",
          };
        }

        if (!orderNumber) {
          return {
            success: false,

            error:
              "Please provide your order number, for example #1001.",
          };
        }

        const order =
          await getOrder(
            profileId,
            orderNumber
          );

        if (!order) {
          return {
            success: true,

            data: {
              found: false,

              orderNumber,
            },
          };
        }

        return {
          success: true,

          data: {
            found: true,

            order,
          },
        };
      }

      // =================================================
      // ORDER DETAILS
      // =================================================

      case "get_order_details": {
        const profileId =
          getProfileId(
            safeParameters
          );

        const orderNumber =
          normalizeOrderNumber(
            safeParameters.orderNumber ??
              safeParameters.order_number
          );

        if (!profileId) {
          return {
            success: false,

            error:
              "Profile information is missing.",
          };
        }

        if (!orderNumber) {
          return {
            success: false,

            error:
              "Please provide your order number, for example #1001.",
          };
        }

        const order =
          await getOrder(
            profileId,
            orderNumber
          );

        if (!order) {
          return {
            success: true,

            data: {
              found: false,

              orderNumber,
            },
          };
        }

        return {
          success: true,

          data: {
            found: true,

            order,
          },
        };
      }

      // =================================================
      // PRODUCT STOCK
      // =================================================

      case "check_product_stock": {
        const profileId =
          getProfileId(
            safeParameters
          );

        const productId =
          getProductId(
            safeParameters
          );

        const productName =
          getProductName(
            safeParameters
          );

        console.log(
          "CHECK PRODUCT STOCK:",
          {
            profileId,
            productId,
            productName,
          }
        );

        if (!profileId) {
          return {
            success: false,

            error:
              "Profile information is missing.",
          };
        }

        if (
          !productId &&
          !productName
        ) {
          return {
            success: false,

            error:
              "Product information is missing.",
          };
        }

        // ------------------------------------------------
        // Deliberately do not fake inventory results.
        //
        // This action must be connected to Shopify
        // inventory before it can claim availability.
        // ------------------------------------------------

        return {
          success: false,

          error:
            "Product inventory is not connected yet.",
        };
      }

      // =================================================
      // PRODUCT DETAILS
      // =================================================

      case "get_product_details": {
        const profileId =
          getProfileId(
            safeParameters
          );

        const productId =
          getProductId(
            safeParameters
          );

        const productName =
          getProductName(
            safeParameters
          );

        console.log(
          "GET PRODUCT DETAILS:",
          {
            profileId,
            productId,
            productName,
          }
        );

        if (!profileId) {
          return {
            success: false,

            error:
              "Profile information is missing.",
          };
        }

        if (
          !productId &&
          !productName
        ) {
          return {
            success: false,

            error:
              "Product information is missing.",
          };
        }

        // ------------------------------------------------
        // Deliberately do not fabricate product details.
        // ------------------------------------------------

        return {
          success: false,

          error:
            "Product details are not connected yet.",
        };
      }

      // =================================================
      // SHIPPING POLICY
      // =================================================

      case "get_shipping_policy": {
        const profileId =
          getProfileId(
            safeParameters
          );

        if (!profileId) {
          return {
            success: false,

            error:
              "Profile information is missing.",
          };
        }

        return {
          success: false,

          error:
            "Shipping policy action is not connected yet.",
        };
      }

      // =================================================
      // RETURN POLICY
      // =================================================

      case "get_return_policy": {
        const profileId =
          getProfileId(
            safeParameters
          );

        if (!profileId) {
          return {
            success: false,

            error:
              "Profile information is missing.",
          };
        }

        return {
          success: false,

          error:
            "Return policy action is not connected yet.",
        };
      }

      // =================================================
      // HUMAN HANDOFF
      // =================================================

      case "handoff_to_human": {
        const profileId =
          getProfileId(
            safeParameters
          );

        if (!profileId) {
          return {
            success: false,

            error:
              "Profile information is missing.",
          };
        }

        const reason =
          limitString(
            safeParameters.reason ??
              safeParameters.handoffReason,
            500
          );

        const conversationId =
          limitString(
            safeParameters.conversationId ??
              safeParameters.conversation_id,
            200
          );

        return {
          success: true,

          data: {
            status:
              "handoff_requested",

            profileId,

            conversationId:
              conversationId ||
              undefined,

            reason:
              reason ||
              undefined,
          },
        };
      }

      // =================================================
      // UNKNOWN ACTION
      // =================================================

      default: {
        return {
          success: false,

          error:
            "Action is not allowed.",
        };
      }
    }
  } catch (
    error
  ) {
    logActionError(
      action,
      error
    );

    switch (
      action
    ) {
      case "search_products":
        return {
          success: false,

          error:
            getErrorMessage(
              error,
              "Unable to search products right now."
            ),
        };

      case "get_order_status":
        return {
          success: false,

          error:
            getErrorMessage(
              error,
              "Unable to retrieve your order status right now."
            ),
        };

      case "get_order_details":
        return {
          success: false,

          error:
            getErrorMessage(
              error,
              "Unable to retrieve your order details right now."
            ),
        };

      case "check_product_stock":
        return {
          success: false,

          error:
            getErrorMessage(
              error,
              "Unable to check product inventory right now."
            ),
        };

      case "get_product_details":
        return {
          success: false,

          error:
            getErrorMessage(
              error,
              "Unable to retrieve product details right now."
            ),
        };

      case "get_shipping_policy":
        return {
          success: false,

          error:
            getErrorMessage(
              error,
              "Unable to retrieve shipping information right now."
            ),
        };

      case "get_return_policy":
        return {
          success: false,

          error:
            getErrorMessage(
              error,
              "Unable to retrieve return information right now."
            ),
        };

      case "handoff_to_human":
        return {
          success: false,

          error:
            getErrorMessage(
              error,
              "Unable to request human support right now."
            ),
        };

      default:
        return {
          success: false,

          error:
            "Unable to complete this action right now.",
        };
    }
  }
}
