import { NextResponse } from "next/server";

import { authenticateShopifyRequest } from "@/lib/shopify/auth";

const ORDERS_QUERY = `
  query GetOrders($first: Int!) {
    orders(first: $first, reverse: true) {
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

        customer {
          id
          firstName
          lastName
          email
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
    const {
      shop,
      accessToken,
      scope,
    } = await authenticateShopifyRequest(request);

    const response = await fetch(
      `https://${shop}/admin/api/2026-07/graphql.json`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },

        body: JSON.stringify({
          query: ORDERS_QUERY,
          variables: {
            first: 20,
          },
        }),

        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "Shopify Orders API error:",
        result
      );

      return NextResponse.json(
        {
          success: false,
          error: "Shopify Orders API request failed",
          details: result,
        },
        {
          status: response.status,
        }
      );
    }

    if (result.errors) {
      console.error(
        "Shopify Orders GraphQL errors:",
        result.errors
      );

      return NextResponse.json(
        {
          success: false,
          error: "Shopify Orders GraphQL request failed",
          details: result.errors,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,
      shop,
      scope,
      orders: result.data.orders,
    });
  } catch (error) {
    console.error(
      "Shopify Orders error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Shopify order authentication failed",
      },
      {
        status: 401,
      }
    );
  }
}