// =====================================================
// SALES PILOT - LIVE SHOPIFY ORDERS SERVICE
// =====================================================
//
// Strictly live, read-only order tracking directly via
// Shopify Admin GraphQL API (2026-07).
//
// Rules:
// 1. Never trust client-supplied profileId/storeId/customerId.
//    Only accepts an already-verified VerifiedStoreContext.
// 2. Customer tracking must be LIVE. No silent stale fallbacks
//    to public.shopify_orders.
// 3. Customer verification fails generically to prevent enumeration.
// 4. Do not select protected customer fields (customer.email, phone)
//    in the selection set. Verification is handled via query filter.
// 5. Zero hallucination of tracking numbers, carriers, or dates.
// =====================================================

export const SHOPIFY_ADMIN_API_VERSION = "2026-07";

export interface VerifiedStoreContext {
  storeId?: string;
  shopDomain: string;
  accessToken: string;
}

export interface OrderLineItem {
  id: string;
  title: string;
  quantity: number;
  price: string;
  currency: string;
  variantTitle?: string | null;
}

export interface OrderFulfillment {
  id: string;
  status: string;
  createdAt?: string | null;
  trackingCompany?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

export interface LiveOrderResult {
  id: string;
  name: string;
  orderNumber: string;
  createdAt: string;
  updatedAt?: string | null;
  financialStatus: string;
  fulfillmentStatus: string;
  friendlyFulfillmentStatus: string;
  totalPrice: string;
  currency: string;
  lineItems: OrderLineItem[];
  fulfillments: OrderFulfillment[];
  hasTracking: boolean;
  trackingCompany?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

export interface LookupOrderResponse {
  success: boolean;
  orderNumber?: string;
  found?: boolean;
  verified?: boolean;
  requiresVerification?: boolean;
  verificationFailed?: boolean;
  unavailable?: boolean;
  notFound?: boolean;
  order?: LiveOrderResult;
  message?: string;
  error?: string;
}

export const GENERIC_VERIFICATION_FAILURE_MESSAGE =
  "I couldn't verify that order with the information provided. Please check the order number and email address and try again.";

export const SHOPIFY_UNAVAILABLE_MESSAGE =
  "Sorry, I can't access live order tracking right now. Please try again shortly.";

// Customer-friendly fulfillment prose formatting
export function formatFriendlyFulfillmentStatus(status: string | null | undefined): string {
  const raw = String(status || "").toUpperCase().trim();
  switch (raw) {
    case "FULFILLED":
      return "Your order has shipped.";
    case "UNFULFILLED":
      return "Your order has been received and is being prepared, but has not shipped yet.";
    case "PARTIALLY_FULFILLED":
      return "Part of your order has shipped.";
    case "ON_HOLD":
      return "Your order is currently on hold.";
    case "RESTOCKED":
      return "Your order items have been restocked.";
    case "CANCELLED":
      return "Your order was cancelled.";
    default:
      return "Your order is being processed.";
  }
}

// Clean order number: remove leading # and whitespace
export function normalizeOrderNumber(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }
  return String(value)
    .trim()
    .replace(/^#+/, "")
    .trim()
    .slice(0, 50);
}

// Extract email from string
export function cleanEmail(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const match = value.trim().toLowerCase().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : "";
}

const LIVE_ORDER_GRAPHQL_QUERY = `
  query GetLiveOrder($query: String!) {
    orders(first: 1, query: $query) {
      nodes {
        id
        name
        createdAt
        updatedAt
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        lineItems(first: 20) {
          nodes {
            id
            title
            quantity
            originalUnitPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            variant {
              id
              title
            }
          }
        }
        fulfillments {
          id
          status
          createdAt
          updatedAt
          trackingInfo {
            number
            url
            company
          }
        }
      }
    }
  }
`;

/**
 * Execute GraphQL against Shopify Admin API with timeout and error handling.
 */
export async function executeShopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
  timeoutMs = 8000
): Promise<{ data?: T; errors?: unknown[]; status: number; ok: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://${shop}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);
    let result: any = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }
    return { data: result.data, errors: result.errors, status: response.status, ok: response.ok };
  } catch (err: unknown) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Map raw Shopify order GraphQL node to a clean, customer-safe LiveOrderResult
 */
function mapShopifyOrderNode(node: any, rawOrderNumber: string): LiveOrderResult {
  const lineItems: OrderLineItem[] = Array.isArray(node?.lineItems?.nodes)
    ? node.lineItems.nodes.map((item: any) => ({
        id: String(item.id || ""),
        title: String(item.title || "Item"),
        quantity: Number(item.quantity || 1),
        price: item.originalUnitPriceSet?.shopMoney?.amount ? String(item.originalUnitPriceSet.shopMoney.amount) : "0",
        currency: item.originalUnitPriceSet?.shopMoney?.currencyCode ? String(item.originalUnitPriceSet.shopMoney.currencyCode) : "USD",
        variantTitle: item.variant?.title || null,
      }))
    : [];

  const fulfillments: OrderFulfillment[] = [];
  let primaryTrackingCompany: string | null = null;
  let primaryTrackingNumber: string | null = null;
  let primaryTrackingUrl: string | null = null;

  if (Array.isArray(node?.fulfillments)) {
    for (const f of node.fulfillments) {
      const trackingList = Array.isArray(f.trackingInfo) ? f.trackingInfo : [];
      const primaryTrack = trackingList[0] || null;

      const trackCompany = primaryTrack?.company || null;
      const trackNumber = primaryTrack?.number || null;
      const trackUrl = primaryTrack?.url || null;

      if (!primaryTrackingUrl && trackUrl) {
        primaryTrackingUrl = trackUrl;
      }
      if (!primaryTrackingNumber && trackNumber) {
        primaryTrackingNumber = trackNumber;
      }
      if (!primaryTrackingCompany && trackCompany) {
        primaryTrackingCompany = trackCompany;
      }

      fulfillments.push({
        id: String(f.id || ""),
        status: String(f.status || "").toUpperCase(),
        createdAt: f.createdAt || null,
        trackingCompany: trackCompany,
        trackingNumber: trackNumber,
        trackingUrl: trackUrl,
      });
    }
  }

  const fulfillmentStatus = String(node.displayFulfillmentStatus || "UNFULFILLED").toUpperCase();
  const financialStatus = String(node.displayFinancialStatus || "PENDING").toUpperCase();

  return {
    id: String(node.id),
    name: String(node.name || `#${rawOrderNumber}`),
    orderNumber: rawOrderNumber,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt || null,
    financialStatus,
    fulfillmentStatus,
    friendlyFulfillmentStatus: formatFriendlyFulfillmentStatus(fulfillmentStatus),
    totalPrice: node.totalPriceSet?.shopMoney?.amount ? String(node.totalPriceSet.shopMoney.amount) : "0",
    currency: node.totalPriceSet?.shopMoney?.currencyCode ? String(node.totalPriceSet.shopMoney.currencyCode) : "USD",
    lineItems,
    fulfillments,
    hasTracking: Boolean(primaryTrackingNumber || primaryTrackingUrl),
    trackingCompany: primaryTrackingCompany,
    trackingNumber: primaryTrackingNumber,
    trackingUrl: primaryTrackingUrl,
  };
}

/**
 * Look up order status and tracking strictly from live Shopify Admin API.
 * Never trust client-supplied profileId/storeId/customerId.
 */
export async function lookupLiveShopifyOrder(
  storeContext: VerifiedStoreContext,
  options: {
    orderNumber: string;
    email?: string;
    isMerchant?: boolean;
  }
): Promise<LookupOrderResponse> {
  const { storeId, shopDomain, accessToken } = storeContext;

  if (!shopDomain || !accessToken) {
    return {
      success: false,
      unavailable: true,
      message: SHOPIFY_UNAVAILABLE_MESSAGE,
      error: "Missing verified Shopify store credentials.",
    };
  }

  const cleanNum = normalizeOrderNumber(options.orderNumber);
  if (!cleanNum) {
    return {
      success: false,
      verificationFailed: true,
      message: "Please provide a valid order number, for example #1001.",
    };
  }

  const isMerchant = options.isMerchant === true;
  const verifiedEmail = cleanEmail(options.email);

  // For public customers: Require email before accessing order details
  if (!isMerchant && !verifiedEmail) {
    return {
      success: false,
      requiresVerification: true,
      orderNumber: cleanNum,
      message: `Please provide the email address used when placing order #${cleanNum} so I can verify and look it up for you.`,
    };
  }

  try {
    // -------------------------------------------------------------------------
    // Construct Query Filter
    // -------------------------------------------------------------------------
    // If not merchant: Query must match order number AND email server-side
    // This protects customer data without selecting protected email in selection set.
    // -------------------------------------------------------------------------
    const queriesToTry: string[] = [];

    if (isMerchant) {
      queriesToTry.push(`name:#${cleanNum}`);
      queriesToTry.push(`name:${cleanNum}`);
    } else {
      queriesToTry.push(`name:#${cleanNum} email:${verifiedEmail}`);
      queriesToTry.push(`name:${cleanNum} email:${verifiedEmail}`);
    }

    let foundNode: any = null;

    for (const queryStr of queriesToTry) {
      const response = await executeShopifyGraphQL<{ orders?: { nodes?: any[] } }>(
        shopDomain,
        accessToken,
        LIVE_ORDER_GRAPHQL_QUERY,
        { query: queryStr }
      );

      if (response.status === 429 || response.status >= 400) {
        console.warn(`Shopify API Error status (${response.status})`);
        return {
          success: false,
          unavailable: true,
          message: SHOPIFY_UNAVAILABLE_MESSAGE,
        };
      }

      if (response.errors && Array.isArray(response.errors) && response.errors.length > 0) {
        console.error("Shopify GraphQL errors:", response.errors);
        return {
          success: false,
          unavailable: true,
          message: SHOPIFY_UNAVAILABLE_MESSAGE,
        };
      }

      const nodes = response.data?.orders?.nodes;
      if (Array.isArray(nodes) && nodes.length > 0 && nodes[0]) {
        foundNode = nodes[0];
        break;
      }
    }

    // -------------------------------------------------------------------------
    // Verification or Lookup Failed
    // -------------------------------------------------------------------------
    if (!foundNode) {
      if (isMerchant) {
        return {
          success: false,
          notFound: true,
          message: `Order #${cleanNum} was not found in your connected store.`,
        };
      }

      // Public Customer: Generic anti-enumeration response
      // Do not reveal whether order exists or email is wrong.
      return {
        success: false,
        verificationFailed: true,
        message: GENERIC_VERIFICATION_FAILURE_MESSAGE,
      };
    }

    // -------------------------------------------------------------------------
    // Order Found & Verified
    // -------------------------------------------------------------------------
    const order = mapShopifyOrderNode(foundNode, cleanNum);

    return {
      success: true,
      found: true,
      verified: true,
      orderNumber: cleanNum,
      order,
    };
  } catch (apiError: unknown) {
    console.error("Live Shopify order lookup failed:", apiError);
    // On any network timeout, 5xx, or network failure, return safe unavailable message
    // DO NOT silently fall back to stale shopify_orders!
    return {
      success: false,
      unavailable: true,
      message: SHOPIFY_UNAVAILABLE_MESSAGE,
      error: apiError instanceof Error ? apiError.message : "Shopify API network error",
    };
  }
}
