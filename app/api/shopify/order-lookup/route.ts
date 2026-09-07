import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { authenticateShopifyRequest } from "@/lib/shopify/auth";
import {
  lookupLiveShopifyOrder,
  VerifiedStoreContext,
  normalizeOrderNumber,
  cleanEmail,
  GENERIC_VERIFICATION_FAILURE_MESSAGE,
  SHOPIFY_UNAVAILABLE_MESSAGE,
} from "@/lib/shopify/orders";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawOrderNumber = searchParams.get("order");
    const rawShop = searchParams.get("shop");
    const rawEmail = searchParams.get("email");

    if (!rawOrderNumber) {
      return NextResponse.json(
        { success: false, error: "Missing order number. Example: ?order=1001" },
        { status: 400 }
      );
    }

    const orderNumber = normalizeOrderNumber(rawOrderNumber);
    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: "Invalid order number." },
        { status: 400 }
      );
    }

    if (!rawShop) {
      return NextResponse.json(
        { success: false, error: "Missing shop parameter." },
        { status: 400 }
      );
    }

    const shop = rawShop.trim().toLowerCase();
    if (!shop.endsWith(".myshopify.com")) {
      return NextResponse.json(
        { success: false, error: "Invalid Shopify store domain." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // -------------------------------------------------------------------------
    // 1. Check for Merchant Authentication (Shopify App Bridge or Supabase)
    // -------------------------------------------------------------------------
    let isMerchant = false;
    let storeContext: VerifiedStoreContext | null = null;

    // A. Check Shopify App Bridge Session Token
    try {
      const shopifyAuth = await authenticateShopifyRequest(request);
      if (shopifyAuth && shopifyAuth.shop.toLowerCase() === shop) {
        isMerchant = true;
        storeContext = {
          shopDomain: shopifyAuth.shop,
          accessToken: shopifyAuth.accessToken,
        };
      }
    } catch {
      // Not a Shopify App Bridge request
    }

    // B. Check Supabase Merchant Session
    if (!isMerchant) {
      try {
        const serverSupabase = await createServerSupabase();
        const { data: authData } = await serverSupabase.auth.getUser();
        if (authData?.user?.id) {
          const { data: merchantStore } = await supabase
            .from("shopify_stores")
            .select("id, shop_domain, access_token, user_id, profile_id")
            .eq("shop_domain", shop)
            .eq("is_active", true)
            .maybeSingle();

          if (
            merchantStore &&
            (merchantStore.user_id === authData.user.id || merchantStore.profile_id === authData.user.id)
          ) {
            isMerchant = true;
            storeContext = {
              storeId: merchantStore.id,
              shopDomain: merchantStore.shop_domain,
              accessToken: merchantStore.access_token,
            };
          }
        }
      } catch {
        // Not an authenticated Supabase merchant
      }
    }

    // -------------------------------------------------------------------------
    // 2. Public Customer Widget Request Handling
    // -------------------------------------------------------------------------
    if (!isMerchant) {
      const email = cleanEmail(rawEmail);

      // Require email verification for public customer lookups
      if (!email) {
        return NextResponse.json(
          {
            success: false,
            requiresVerification: true,
            message: "Please provide the email address used when placing this order.",
          },
          { status: 401 }
        );
      }

      // Look up store for domain
      const { data: activeStore, error: storeErr } = await supabase
        .from("shopify_stores")
        .select("id, shop_domain, access_token")
        .eq("shop_domain", shop)
        .eq("is_active", true)
        .maybeSingle();

      if (storeErr || !activeStore || !activeStore.access_token) {
        return NextResponse.json(
          { success: false, error: GENERIC_VERIFICATION_FAILURE_MESSAGE },
          { status: 404 }
        );
      }

      storeContext = {
        storeId: activeStore.id,
        shopDomain: activeStore.shop_domain,
        accessToken: activeStore.access_token,
      };

      // Query live Shopify with customer verification filter
      const result = await lookupLiveShopifyOrder(storeContext, {
        orderNumber,
        email,
        isMerchant: false,
      });

      if (result.unavailable) {
        return NextResponse.json(
          { success: false, unavailable: true, message: SHOPIFY_UNAVAILABLE_MESSAGE },
          { status: 503 }
        );
      }

      if (!result.success || !result.order) {
        // Generic failure response prevents order enumeration
        return NextResponse.json(
          { success: false, error: GENERIC_VERIFICATION_FAILURE_MESSAGE },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        verified: true,
        order: result.order,
      });
    }

    // -------------------------------------------------------------------------
    // 3. Authenticated Merchant Request Handling
    // -------------------------------------------------------------------------
    if (!storeContext) {
      return NextResponse.json(
        { success: false, error: "Store credentials could not be verified." },
        { status: 403 }
      );
    }

    const result = await lookupLiveShopifyOrder(storeContext, {
      orderNumber,
      isMerchant: true,
    });

    if (result.unavailable) {
      return NextResponse.json(
        { success: false, unavailable: true, message: SHOPIFY_UNAVAILABLE_MESSAGE },
        { status: 503 }
      );
    }

    if (!result.success || !result.order) {
      return NextResponse.json(
        { success: false, error: `Order #${orderNumber} was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      order: result.order,
    });
  } catch (error) {
    console.error("Order lookup endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error.",
      },
      { status: 500 }
    );
  }
}