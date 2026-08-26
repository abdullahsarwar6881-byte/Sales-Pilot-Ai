import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseAdmin =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

// =====================================================
// TYPES
// =====================================================

export interface OrderLookupResult {
  id: string;
  shopifyId: string;
  orderNumber: string;
  customerName: string | null;
  email: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  totalPrice: number | null;
  currency: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  data: Record<string, unknown> | null;
}

// =====================================================
// NORMALIZE ORDER NUMBER
// =====================================================

function normalizeOrderNumber(
  orderNumber: string
) {
  return orderNumber
    .trim()
    .replace(/^#/, "")
    .trim();
}

// =====================================================
// GET ORDER
// =====================================================

export async function getOrder(
  profileId: string,
  orderNumber: string
): Promise<OrderLookupResult | null> {
  console.log(
    "================================="
  );

  console.log(
    "SHOPIFY ORDER ACTION"
  );

  console.log(
    "PROFILE ID:",
    profileId
  );

  console.log(
    "ORDER NUMBER:",
    orderNumber
  );

  console.log(
    "================================="
  );

  if (
    !profileId ||
    !profileId.trim()
  ) {
    throw new Error(
      "Profile information is missing."
    );
  }

  if (
    !orderNumber ||
    !orderNumber.trim()
  ) {
    throw new Error(
      "Order number is missing."
    );
  }

  const normalizedNumber =
    normalizeOrderNumber(
      orderNumber
    );

  if (
    !normalizedNumber
  ) {
    throw new Error(
      "Invalid order number."
    );
  }

  // =================================================
  // FIND SHOPIFY STORE FOR THIS PROFILE
  // =================================================
  //
  // IMPORTANT:
  //
  // Your current shopify_stores table appears to
  // identify stores by shop_domain, but we need to
  // associate the store with the Sales Pilot profile.
  //
  // Therefore we first try profile_id.
  //
  // =================================================

  let store: any = null;

  const {
    data: profileStore,
    error: profileStoreError,
  } =
    await supabaseAdmin
      .from("shopify_stores")
      .select(
        "id, shop_domain, profile_id"
      )
      .eq(
        "profile_id",
        profileId
      )
      .maybeSingle();

  if (
    !profileStoreError &&
    profileStore
  ) {
    store =
      profileStore;
  }

  // =================================================
  // FALLBACK
  // =================================================
  //
  // Some existing Sales Pilot installations may not
  // have profile_id populated yet.
  //
  // In that case, if there is exactly one active store,
  // use it temporarily.
  //
  // =================================================

  if (!store) {
    const {
      data: stores,
      error: storesError,
    } =
      await supabaseAdmin
        .from("shopify_stores")
        .select(
          "id, shop_domain, profile_id"
        )
        .eq(
          "is_active",
          true
        )
        .limit(10);

    if (
      storesError
    ) {
      console.error(
        "SHOPIFY STORE LOOKUP ERROR:",
        storesError
      );

      throw new Error(
        "Unable to find the connected Shopify store."
      );
    }

    if (
      stores &&
      stores.length === 1
    ) {
      store =
        stores[0];
    }
  }

  if (!store) {
    throw new Error(
      "No Shopify store is connected to this Sales Pilot account."
    );
  }

  console.log(
    "SHOPIFY STORE:",
    store.shop_domain
  );

  // =================================================
  // FIND ORDER
  // =================================================

  const possibleNumbers = [
    normalizedNumber,
    `#${normalizedNumber}`,
  ];

  const {
    data: order,
    error: orderError,
  } =
    await supabaseAdmin
      .from("shopify_orders")
      .select(
        `
          id,
          store_id,
          shopify_id,
          order_number,
          email,
          customer_name,
          financial_status,
          fulfillment_status,
          currency,
          total_price,
          created_at,
          updated_at,
          data
        `
      )
      .eq(
        "store_id",
        store.id
      )
      .in(
        "order_number",
        possibleNumbers
      )
      .maybeSingle();

  if (
    orderError
  ) {
    console.error(
      "SHOPIFY ORDER LOOKUP ERROR:",
      orderError
    );

    throw new Error(
      "Unable to search for the order."
    );
  }

  if (!order) {
    console.log(
      "ORDER NOT FOUND:",
      normalizedNumber
    );

    return null;
  }

  console.log(
    "ORDER FOUND:",
    order.order_number
  );

  return {
    id:
      order.id,

    shopifyId:
      order.shopify_id,

    orderNumber:
      order.order_number,

    customerName:
      order.customer_name,

    // Shopify protected customer data is not
    // required for order-status functionality.
    //
    // This remains null until the app receives
    // appropriate Shopify approval.
    email:
      order.email,

    financialStatus:
      order.financial_status,

    fulfillmentStatus:
      order.fulfillment_status,

    totalPrice:
      order.total_price,

    currency:
      order.currency,

    createdAt:
      order.created_at,

    updatedAt:
      order.updated_at,

    data:
      order.data,
  };
}