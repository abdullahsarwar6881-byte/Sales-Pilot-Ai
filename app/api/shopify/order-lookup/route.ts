import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// --------------------------------------------------
// SUPABASE ADMIN CLIENT
// --------------------------------------------------

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

// --------------------------------------------------
// GET ORDER
// --------------------------------------------------

export async function GET(
  request: Request
) {
  try {
    // --------------------------------------------------
    // 1. Read query parameters
    // --------------------------------------------------

    const { searchParams } =
      new URL(request.url);

    const rawOrderNumber =
      searchParams.get("order");

    const rawShop =
      searchParams.get("shop");

    // --------------------------------------------------
    // 2. Validate order number
    // --------------------------------------------------

    if (!rawOrderNumber) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          error:
            "Missing order number. Example: ?order=1001",
        },
        {
          status: 400,
        }
      );
    }

    const cleanedOrderNumber =
      rawOrderNumber.trim();

    if (!cleanedOrderNumber) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          error:
            "Order number cannot be empty.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // Normalize order number
    //
    // Accept:
    // 1001
    // #1001
    //
    // Search for both formats in case the database
    // contains either one.
    // --------------------------------------------------

    const numericOrderNumber =
      cleanedOrderNumber.replace(
        /^#/,
        ""
      );

    if (!numericOrderNumber) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          error:
            "Invalid order number.",
        },
        {
          status: 400,
        }
      );
    }

    const hashOrderNumber =
      `#${numericOrderNumber}`;

    // --------------------------------------------------
    // 3. Validate Shopify store
    // --------------------------------------------------

    if (!rawShop) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          error:
            "Missing shop. Example: ?shop=sales-pilot.myshopify.com",
        },
        {
          status: 400,
        }
      );
    }

    const shop =
      rawShop.trim().toLowerCase();

    if (
      !shop.endsWith(
        ".myshopify.com"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          error:
            "Invalid Shopify store domain.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // 4. Connect to Supabase
    // --------------------------------------------------

    const supabase =
      getSupabaseAdmin();

    // --------------------------------------------------
    // 5. Find Shopify store
    // --------------------------------------------------

    const {
      data: store,
      error: storeError,
    } = await supabase
      .from("shopify_stores")
      .select(
        `
          id,
          shop_domain
        `
      )
      .eq(
        "shop_domain",
        shop
      )
      .maybeSingle();

    if (storeError) {
      console.error(
        "Store lookup error:",
        storeError
      );

      return NextResponse.json(
        {
          success: false,
          found: false,
          error:
            "Failed to find Shopify store.",
          details:
            storeError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!store) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          error:
            `Shopify store ${shop} is not synchronized yet.`,
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------
    // 6. Find order
    // --------------------------------------------------
    //
    // First search using #1001.
    // If that doesn't exist, search using 1001.
    //
    // This makes the API compatible with either
    // database format.
    // --------------------------------------------------

    let order = null;

    let orderError = null;

    // --------------------------------------------------
    // First attempt: #1001
    // --------------------------------------------------

    const firstSearch =
      await supabase
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
        .eq(
          "order_number",
          hashOrderNumber
        )
        .maybeSingle();

    order =
      firstSearch.data;

    orderError =
      firstSearch.error;

    // --------------------------------------------------
    // Second attempt: 1001
    // --------------------------------------------------

    if (!order && !orderError) {
      const secondSearch =
        await supabase
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
          .eq(
            "order_number",
            numericOrderNumber
          )
          .maybeSingle();

      order =
        secondSearch.data;

      orderError =
        secondSearch.error;
    }

    // --------------------------------------------------
    // 7. Handle database error
    // --------------------------------------------------

    if (orderError) {
      console.error(
        "Order lookup error:",
        orderError
      );

      return NextResponse.json(
        {
          success: false,
          found: false,
          error:
            "Failed to search for order.",
          details:
            orderError.message,
        },
        {
          status: 500,
        }
      );
    }

    // --------------------------------------------------
    // 8. Order not found
    // --------------------------------------------------

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          error:
            `Order #${numericOrderNumber} was not found.`,
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------
    // 9. Return order
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      found: true,

      store: {
        id:
          store.id,

        shop:
          store.shop_domain,
      },

      order: {
        id:
          order.id,

        shopifyId:
          order.shopify_id,

        orderNumber:
          order.order_number,

        customerName:
          order.customer_name,

        // Email may be null when Shopify protected
        // customer data access has not been approved.
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
      },
    });
  } catch (error) {
    // --------------------------------------------------
    // 10. Unexpected error
    // --------------------------------------------------

    console.error(
      "Order lookup API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        found: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      },
      {
        status: 500,
      }
    );
  }
}