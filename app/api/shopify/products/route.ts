import { NextResponse } from "next/server";

import { authenticateShopifyRequest } from "@/lib/shopify/auth";
import { SHOPIFY_PRODUCTS_QUERY } from "@/lib/shopify/products";

export async function GET(request: Request) {
  try {
    // --------------------------------------------
    // 1. Authenticate the Shopify request
    // --------------------------------------------

    const {
      shop,
      accessToken,
      scope,
    } = await authenticateShopifyRequest(request);

    // Extract optional pagination search params
    const url = new URL(request.url);
    const firstParam = parseInt(url.searchParams.get("first") || "50", 10);
    const first = isNaN(firstParam) || firstParam <= 0 ? 50 : Math.min(firstParam, 100);
    const after = url.searchParams.get("after") || null;

    // --------------------------------------------
    // 2. Call Shopify Admin GraphQL API
    // --------------------------------------------

    const response = await fetch(
      `https://${shop}/admin/api/2026-07/graphql.json`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },

        body: JSON.stringify({
          query: SHOPIFY_PRODUCTS_QUERY,
          variables: {
            first,
            after,
          },
        }),

        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Shopify API error:", result);

      return NextResponse.json(
        {
          error: "Shopify API request failed",
          details: result,
        },
        {
          status: response.status,
        }
      );
    }

    if (result.errors) {
      console.error("Shopify GraphQL errors:", result.errors);

      return NextResponse.json(
        {
          error: "Shopify GraphQL request failed",
          details: result.errors,
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------
    // 3. Return products
    // --------------------------------------------

    return NextResponse.json({
      success: true,
      shop,
      scope,
      products: result.data.products,
    });
  } catch (error) {
    console.error("Shopify products error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Shopify authentication failed",
      },
      {
        status: 401,
      }
    );
  }
}