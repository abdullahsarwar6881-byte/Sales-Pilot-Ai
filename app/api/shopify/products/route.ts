import { NextResponse } from "next/server";

import { authenticateShopifyRequest } from "@/lib/shopify/auth";

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      nodes {
        id
        title
        handle
        description
        status

        variants(first: 20) {
          nodes {
            id
            title
            price
            inventoryQuantity
          }
        }
      }

      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

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
          query: PRODUCTS_QUERY,
          variables: {
            first: 20,
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