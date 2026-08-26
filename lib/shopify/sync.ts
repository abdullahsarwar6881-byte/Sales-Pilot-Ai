import { createClient } from "@supabase/supabase-js";
import { authenticateShopifyRequest } from "./auth";

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

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
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

  const result =
    (await response.json()) as ShopifyGraphQLResponse<T>;

  if (!response.ok) {
    throw new Error(
      `Shopify API returned HTTP ${response.status}: ${JSON.stringify(
        result
      )}`
    );
  }

  if (result.errors?.length) {
    throw new Error(
      `Shopify GraphQL error: ${JSON.stringify(
        result.errors
      )}`
    );
  }

  if (!result.data) {
    throw new Error(
      "Shopify returned no data."
    );
  }

  return result.data;
}

export async function syncShopifyStore(
  request: Request
) {
  // ---------------------------------------------------------
  // 1. Authenticate Shopify request
  // ---------------------------------------------------------

  const {
    shop,
    accessToken,
    scope,
  } = await authenticateShopifyRequest(
    request
  );

  const supabase =
    getSupabaseAdmin();

  // ---------------------------------------------------------
  // 2. Save / update Shopify store
  // ---------------------------------------------------------

  const {
    data: store,
    error: storeError,
  } = await supabase
    .from("shopify_stores")
    .upsert(
      {
        shop_domain: shop,
        access_token: accessToken,
        scope,
        is_active: true,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: "shop_domain",
      }
    )
    .select("id, shop_domain")
    .single();

  if (storeError) {
    throw new Error(
      `Failed to save Shopify store: ${storeError.message}`
    );
  }

  // ---------------------------------------------------------
  // 3. Load products
  // ---------------------------------------------------------

  const productsData =
    await shopifyGraphQL<ProductsData>(
      shop,
      accessToken,
      PRODUCTS_QUERY,
      {
        first: 100,
      }
    );

  const products =
    productsData.products.nodes;

  // ---------------------------------------------------------
  // 4. Save products
  // ---------------------------------------------------------

  if (products.length > 0) {
    const productRows =
      products.map((product) => ({
        store_id: store.id,
        shopify_id: product.id,
        title: product.title,
        handle: product.handle,
        description:
          product.description,
        status: product.status,
        product_type:
          product.productType,
        vendor: product.vendor,

        data: {
          variants:
            product.variants.nodes,
        },

        updated_at:
          new Date().toISOString(),
      }));

    const {
      error: productsError,
    } = await supabase
      .from("shopify_products")
      .upsert(productRows, {
        onConflict:
          "store_id,shopify_id",
      });

    if (productsError) {
      throw new Error(
        `Failed to save products: ${productsError.message}`
      );
    }
  }

  // ---------------------------------------------------------
  // 5. Load orders
  // ---------------------------------------------------------

  const ordersData =
    await shopifyGraphQL<OrdersData>(
      shop,
      accessToken,
      ORDERS_QUERY,
      {
        first: 100,
      }
    );

  const orders =
    ordersData.orders.nodes;

  // ---------------------------------------------------------
  // 6. Save orders
  // ---------------------------------------------------------

  if (orders.length > 0) {
    const orderRows =
      orders.map((order) => ({
        store_id: store.id,
        shopify_id: order.id,

        order_number:
          order.name,

        // Email intentionally omitted.
        // Shopify requires additional protected
        // customer data approval for this field.
        email: null,

        customer_name:
          order.customer?.displayName ??
          null,

        financial_status:
          order.displayFinancialStatus ??
          null,

        fulfillment_status:
          order.displayFulfillmentStatus ??
          null,

        currency:
          order.totalPriceSet
            .shopMoney
            .currencyCode,

        total_price:
          Number(
            order.totalPriceSet
              .shopMoney
              .amount
          ),

        created_at:
          order.createdAt,

        updated_at:
          order.updatedAt,

        data: {
          lineItems:
            order.lineItems.nodes,
        },
      }));

    const {
      error: ordersError,
    } = await supabase
      .from("shopify_orders")
      .upsert(orderRows, {
        onConflict:
          "store_id,shopify_id",
      });

    if (ordersError) {
      throw new Error(
        `Failed to save orders: ${ordersError.message}`
      );
    }
  }

  // ---------------------------------------------------------
  // 7. Return result
  // ---------------------------------------------------------

  return {
    success: true,

    shop,

    storeId: store.id,

    productsSynced:
      products.length,

    ordersSynced:
      orders.length,

    message:
      `Shopify sync completed successfully. ${products.length} products and ${orders.length} orders synchronized.`,
  };
}