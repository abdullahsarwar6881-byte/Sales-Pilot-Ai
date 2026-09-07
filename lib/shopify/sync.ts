import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { authenticateShopifyRequest } from "./auth";
import { upsertProductVisualIndex } from "@/lib/products/visualIndex";

const SHOPIFY_API_VERSION = "2026-07";

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      nodes {
        id
        title
        handle
        description
        status
        productType
        vendor

        images(first: 20) {
          nodes {
            id
            src
            altText
          }
        }

        variants(first: 100) {
          nodes {
            id
            title
            price
            inventoryQuantity
          }
        }
      }
    }
  }
`;

const ORDERS_QUERY = `
  query GetOrders($first: Int!) {
    orders(first: $first, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id
        name
        createdAt
        updatedAt
        displayFinancialStatus
        displayFulfillmentStatus

        customer {
          displayName
        }

        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }

        lineItems(first: 100) {
          nodes {
            title
            quantity
          }
        }
      }
    }
  }
`;

type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: unknown[];
};

type ProductsData = {
  products: {
    nodes: Array<{
      id: string;
      title: string;
      handle: string;
      description: string | null;
      status: string;
      productType: string | null;
      vendor: string | null;
      images:
        | {
            nodes: Array<{
              id: string;
              src: string;
              altText: string | null;
            }>;
          }
        | null
        | undefined;
      variants: {
        nodes: Array<{
          id: string;
          title: string;
          price: string;
          inventoryQuantity: number | null;
        }>;
      };
    }>;
  };
};

type OrdersData = {
  orders: {
    nodes: Array<{
      id: string;
      name: string;
      createdAt: string;
      updatedAt: string;
      displayFinancialStatus: string | null;
      displayFulfillmentStatus: string | null;

      customer: {
        displayName: string | null;
      } | null;

      totalPriceSet: {
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      };

      lineItems: {
        nodes: Array<{
          title: string;
          quantity: number;
        }>;
      };
    }>;
  };
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: "no-store",
    }
  );

  const result = (await response.json()) as ShopifyGraphQLResponse<T>;

  if (!response.ok) {
    throw new Error(
      `Shopify API returned HTTP ${response.status}: ${JSON.stringify(result)}`
    );
  }

  if (result.errors?.length) {
    throw new Error(
      `Shopify GraphQL error: ${JSON.stringify(result.errors)}`
    );
  }

  if (!result.data) {
    throw new Error("Shopify returned no data.");
  }

  return result.data;
}

import { fetchAllShopifyProducts } from "./products";

// Re-export products query and types for backwards compatibility
export { SHOPIFY_PRODUCTS_QUERY, fetchAllShopifyProducts, syncShopifyProducts } from "./products";

export async function syncShopifyStore(request: Request) {
  // ---------------------------------------------------------
  // 1. Authenticate Shopify request
  // ---------------------------------------------------------

  const { shop, accessToken, scope } = await authenticateShopifyRequest(
    request
  );

  const supabase = getSupabaseAdmin();

  // ---------------------------------------------------------
  // 1b. Validate merchant ownership & multi-tenant isolation
  // ---------------------------------------------------------
  let currentUserId: string | null = null;
  try {
    const serverSupabase = await createServerSupabase();
    const { data: authData } = await serverSupabase.auth.getUser();
    if (authData?.user?.id) {
      currentUserId = authData.user.id;
    }
  } catch {
    // Cookie session not available (e.g. non-browser context)
  }

  if (!currentUserId) {
    const customAuth = request.headers.get("x-supabase-auth");
    if (customAuth) {
      try {
        const { data: tokenUser } = await supabase.auth.getUser(customAuth);
        if (tokenUser?.user?.id) {
          currentUserId = tokenUser.user.id;
        }
      } catch {
        // invalid token
      }
    }
  }

  // Check if store already exists
  const { data: existingStore, error: lookupError } = await supabase
    .from("shopify_stores")
    .select("id, user_id, profile_id, shop_domain")
    .eq("shop_domain", shop)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Database error querying store: ${lookupError.message}`);
  }

  // Prevent cross-tenant store hijacking
  if (existingStore) {
    const existingOwnerId = existingStore.user_id || existingStore.profile_id;
    if (existingOwnerId && currentUserId && existingOwnerId !== currentUserId) {
      const forbiddenError = new Error(
        `Forbidden: This Shopify store (${shop}) is already connected to another Sales Pilot merchant account.`
      );
      (forbiddenError as any).statusCode = 403;
      throw forbiddenError;
    }
  }

  const resolvedUserId = currentUserId || existingStore?.user_id || null;
  const resolvedProfileId = currentUserId || existingStore?.profile_id || null;

  // ---------------------------------------------------------
  // 2. Save / update Shopify store
  // ---------------------------------------------------------

  const { data: store, error: storeError } = await supabase
    .from("shopify_stores")
    .upsert(
      {
        shop_domain: shop,
        access_token: accessToken,
        scope,
        is_active: true,
        user_id: resolvedUserId,
        profile_id: resolvedProfileId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "shop_domain",
      }
    )
    .select("id, user_id, profile_id, shop_domain")
    .single();

  if (storeError) {
    throw new Error(`Failed to save Shopify store: ${storeError.message}`);
  }

  const effectiveUserId = store.user_id || store.profile_id || null;

  // ---------------------------------------------------------
  // 3. Load products (with cursor-based pagination)
  // ---------------------------------------------------------

  const products = await fetchAllShopifyProducts(shop, accessToken, 100);

  // ---------------------------------------------------------
  // 4. Save products
  // ---------------------------------------------------------

  const currentSyncedShopifyIds = new Set<string>();

  if (products.length > 0) {
    const productRows = products.map((product) => {
      currentSyncedShopifyIds.add(product.id);

      const rawImages = [];
      if (product.featuredImage) {
        rawImages.push(product.featuredImage);
      }
      if (product.images?.nodes) {
        for (const img of product.images.nodes) {
          if (!rawImages.some((existing) => existing.url === img.url || existing.id === img.id)) {
            rawImages.push(img);
          }
        }
      }

      const formattedImages = rawImages.map((img) => ({
        id: img.id,
        src: img.url,
        url: img.url,
        altText: img.altText || null,
      }));

      return {
        store_id: store.id,
        shopify_id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        status: product.status,
        product_type: product.productType,
        vendor: product.vendor,

        data: {
          tags: product.tags || [],
          options: product.options || [],
          variants: product.variants?.nodes || [],
          images: formattedImages,
          featuredImage: product.featuredImage || formattedImages[0] || null,
          updatedAt: product.updatedAt,
        },

        updated_at: new Date().toISOString(),
      };
    });

    const BATCH_SIZE = 100;
    for (let i = 0; i < productRows.length; i += BATCH_SIZE) {
      const batch = productRows.slice(i, i + BATCH_SIZE);
      const { error: productsError } = await supabase
        .from("shopify_products")
        .upsert(batch, {
          onConflict: "store_id,shopify_id",
        });

      if (productsError) {
        throw new Error(`Failed to save products: ${productsError.message}`);
      }
    }
  }

  // ---------------------------------------------------------
  // 4b. Mirror into public.products for search & AI assistant
  // ---------------------------------------------------------
  if (effectiveUserId && products.length > 0) {
    const publicProductRows = products.map((product) => {
      const firstVariant = product.variants?.nodes?.[0];
      const parsedPrice = firstVariant?.price ? parseFloat(firstVariant.price) : null;
      const isAvailable =
        product.status?.toUpperCase() === "ACTIVE" &&
        product.variants?.nodes?.some(
          (v) => v.availableForSale === true || (typeof v.inventoryQuantity === "number" && v.inventoryQuantity > 0)
        );

      const featuredImageUrl =
        product.featuredImage?.url ||
        product.images?.nodes?.[0]?.url ||
        null;

      const productUrl = product.handle ? `https://${shop}/products/${product.handle}` : null;
      const primarySku = firstVariant?.sku || null;
      const collections = product.productType ? [product.productType] : [];

      return {
        user_id: effectiveUserId,
        external_id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        price: isNaN(Number(parsedPrice)) ? null : parsedPrice,
        currency: null,
        available: isAvailable ?? true,
        image_url: featuredImageUrl,
        product_url: productUrl,
        sku: primarySku,
        collection_names: collections,
        collection_urls: [],
        source: "shopify",
        updated_at: new Date().toISOString(),
      };
    });

    // Perform batch upsert on public.products (idempotent, conflict target: user_id, external_id)
    const BATCH_SIZE = 100;
    for (let i = 0; i < publicProductRows.length; i += BATCH_SIZE) {
      const batch = publicProductRows.slice(i, i + BATCH_SIZE);
      const { error: upsertError } = await supabase
        .from("products")
        .upsert(batch, {
          onConflict: "user_id,external_id",
        });

      if (upsertError) {
        console.error("Failed to upsert public.products mirror:", upsertError);
      }
    }
  }

  // ---------------------------------------------------------
  // 4c. Index product images for visual matching
  // ---------------------------------------------------------
  // Best-effort, non-blocking: failures never fail the sync.
  for (const product of products) {
    upsertProductVisualIndex(
      supabase,
      {
        ...product,
        store_id: store.id,
      },
      {
        userId: effectiveUserId || undefined,
        storeId: store.id,
        source: "shopify",
      }
    ).catch((e) => {
      console.error("PRODUCT VISUAL INDEX ERROR:", e?.message || e);
    });
  }

  // ---------------------------------------------------------
  // 5. Load orders
  // ---------------------------------------------------------

  const ordersData = await shopifyGraphQL<OrdersData>(
    shop,
    accessToken,
    ORDERS_QUERY,
    {
      first: 100,
    }
  );

  const orders = ordersData.orders.nodes;

  // ---------------------------------------------------------
  // 6. Save orders
  // ---------------------------------------------------------

  if (orders.length > 0) {
    const orderRows = orders.map((order) => ({
      store_id: store.id,
      shopify_id: order.id,
      order_number: order.name,
      // Email intentionally omitted.
      // Shopify requires additional protected customer data approval for this field.
      email: null,
      customer_name: order.customer?.displayName ?? null,
      financial_status: order.displayFinancialStatus ?? null,
      fulfillment_status: order.displayFulfillmentStatus ?? null,
      currency: order.totalPriceSet.shopMoney.currencyCode,
      total_price: Number(order.totalPriceSet.shopMoney.amount),
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      data: {
        lineItems: order.lineItems.nodes,
      },
    }));

    const { error: ordersError } = await supabase
      .from("shopify_orders")
      .upsert(orderRows, {
        onConflict: "store_id,shopify_id",
      });

    if (ordersError) {
      throw new Error(`Failed to save orders: ${ordersError.message}`);
    }
  }

  // ---------------------------------------------------------
  // 7. Return result
  // ---------------------------------------------------------

  return {
    success: true,
    shop,
    storeId: store.id,
    productsSynced: products.length,
    ordersSynced: orders.length,
    message: `Shopify sync completed successfully. ${products.length} products and ${orders.length} orders synchronized.`,
  };
}
