import { createClient } from "@supabase/supabase-js";
import {
  lookupLiveShopifyOrder,
  VerifiedStoreContext,
  LookupOrderResponse,
  normalizeOrderNumber,
  SHOPIFY_UNAVAILABLE_MESSAGE,
} from "@/lib/shopify/orders";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface GetOrderOptions {
  email?: string;
  isMerchant?: boolean;
}

/**
 * Resolve verified Shopify store context from profileId server-side.
 */
async function resolveStoreContextFromProfile(
  profileId: string
): Promise<VerifiedStoreContext | null> {
  const { data: store, error } = await supabaseAdmin
    .from("shopify_stores")
    .select("id, shop_domain, access_token")
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !store || !store.access_token) {
    return null;
  }

  return {
    storeId: store.id,
    shopDomain: store.shop_domain,
    accessToken: store.access_token,
  };
}

/**
 * Get live Shopify order details.
 * Strictly uses live Shopify Admin API; no stale cached fallbacks.
 */
export async function getOrder(
  storeContextOrProfileId: VerifiedStoreContext | string,
  orderNumber: string,
  options?: GetOrderOptions
): Promise<LookupOrderResponse> {
  const cleanNumber = normalizeOrderNumber(orderNumber);

  if (!cleanNumber) {
    return {
      success: false,
      verificationFailed: true,
      message: "Please provide your order number, for example #1001.",
    };
  }

  let storeContext: VerifiedStoreContext | null = null;

  if (
    typeof storeContextOrProfileId === "object" &&
    storeContextOrProfileId !== null &&
    "shopDomain" in storeContextOrProfileId &&
    "accessToken" in storeContextOrProfileId
  ) {
    storeContext = storeContextOrProfileId;
  } else if (typeof storeContextOrProfileId === "string" && storeContextOrProfileId.trim()) {
    storeContext = await resolveStoreContextFromProfile(storeContextOrProfileId.trim());
  }

  if (!storeContext || !storeContext.shopDomain || !storeContext.accessToken) {
    return {
      success: false,
      unavailable: true,
      message: SHOPIFY_UNAVAILABLE_MESSAGE,
      error: "No connected Shopify store found for this request.",
    };
  }

  return lookupLiveShopifyOrder(storeContext, {
    orderNumber: cleanNumber,
    email: options?.email,
    isMerchant: options?.isMerchant,
  });
}