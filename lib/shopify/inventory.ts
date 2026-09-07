import { VerifiedStoreContext, executeShopifyGraphQL } from "./orders";

export const LOW_STOCK_THRESHOLD = 5;

/** Normalized inventory status */
export type InventoryStatus =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "UNKNOWN"
  | "NOT_TRACKED";

export interface InventoryResult {
  /** Normalized status */
  status: InventoryStatus;
  /** Total available quantity across all active locations.
   *  `null` when the variant does not track inventory or when the
   *  aggregation cannot be reliably determined. */
  available: number | null;
}

/** GraphQL query – fetches inventory levels for a product variant */
const GET_VARIANT_INVENTORY = `
  query GetVariantInventory($variantId: ID!) {
    node(id: $variantId) {
      ... on ProductVariant {
        id
        sku
        inventoryItem {
          id
          tracked
          inventoryLevels(first: 100, includeInactive: false) {
            edges {
              node {
                id
                isActive
                quantities(names: ["available"]) {
                  name
                  quantity
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Checks inventory for a Shopify product variant.
 *
 * @param store - VerifiedStoreContext containing shop domain and admin token.
 * @param params.variantId - Global Shopify ID of the ProductVariant to inspect.
 * @returns Normalized InventoryResult.
 */
export async function checkInventory(
  store: VerifiedStoreContext,
  params: { variantId: string }
): Promise<InventoryResult> {
  const { variantId } = params;

  // 1️⃣ Execute the GraphQL query using the shared executor.
  const { data, errors, ok, status: httpStatus } = await executeShopifyGraphQL<any>(
    store.shopDomain,
    store.accessToken,
    GET_VARIANT_INVENTORY,
    { variantId }
  );

  // Handle HTTP‑level errors.
  if (!ok) {
    throw new Error(
        `Shopify inventory query failed (status ${httpStatus}): ${JSON.stringify(
          errors ?? {}
        )}`
      );
  }

  // Detect GraphQL userErrors – Shopify may return 200 with errors.
  if (data?.errors?.length) {
    throw new Error(`Shopify inventory error: ${JSON.stringify(data.errors[0])}`);
  }

  // 3️⃣ Navigate to the inventoryItem node.
  const variantNode = data?.node;

  // NOT_TRACKED logic – if no inventoryItem or tracking disabled.
  if (!variantNode?.inventoryItem) {
    return { status: "NOT_TRACKED", available: null };
  }
  const tracked = variantNode.inventoryItem.tracked;
  if (tracked === false) {
    return { status: "NOT_TRACKED", available: null };
  }

  const levels = variantNode.inventoryItem.inventoryLevels?.edges ?? [];

  // If there are no active inventory levels but tracking is true, we cannot determine quantity.
  if (levels.length === 0) {
    return { status: "UNKNOWN", available: null };
  }

  // Pagination protection – if we receive the maximum number of edges, we cannot guarantee completeness.
  if (levels.length === 100) {
    return { status: "UNKNOWN", available: null };
  }

  // 4️⃣ Aggregate "available" quantities across active locations.
  let totalAvailable = 0;
  for (const edge of levels) {
    const level = edge?.node;
    // Defensive check – query already filtered inactive levels.
    if (level?.isActive === false) continue;

    const qtyObj = (level.quantities ?? []).find(
      (q: any) => q?.name === "available"
    );
    if (!qtyObj) {
      return { status: "UNKNOWN", available: null };
    }
    const qty = Number(qtyObj.quantity ?? 0);
    totalAvailable += isNaN(qty) ? 0 : qty;
  }

  // 5️⃣ Map summed quantity → InventoryStatus.
  let status: InventoryStatus;
  if (totalAvailable === 0) {
    status = "OUT_OF_STOCK";
  } else if (totalAvailable <= LOW_STOCK_THRESHOLD) {
    status = "LOW_STOCK";
  } else {
    status = "IN_STOCK";
  }

  return { status, available: totalAvailable };
}

