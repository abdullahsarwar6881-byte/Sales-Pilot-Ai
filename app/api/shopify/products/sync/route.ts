import { NextResponse } from "next/server";
import { syncShopifyProducts } from "@/lib/shopify/products";

function determineStatusCode(error: unknown): number {
  if (error && typeof error === "object") {
    if ("statusCode" in error && typeof (error as { statusCode: unknown }).statusCode === "number") {
      return (error as { statusCode: number }).statusCode;
    }
  }

  const message = error instanceof Error ? error.message : String(error);

  // 400 Bad Request
  if (
    message.includes("Invalid Shopify shop domain") ||
    message.includes("bad request") ||
    message.includes("Missing parameter")
  ) {
    return 400;
  }

  // 401 Unauthorized
  if (
    message.includes("Missing Shopify authorization") ||
    message.includes("Invalid Shopify authorization") ||
    message.includes("Missing Shopify session token") ||
    message.includes("Failed to decode session token") ||
    message.toLowerCase().includes("jwt") ||
    message.toLowerCase().includes("expired") ||
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("session token")
  ) {
    return 401;
  }

  // 403 Forbidden
  if (
    message.includes("Forbidden") ||
    message.includes("already connected to another Sales Pilot") ||
    message.includes("not permitted")
  ) {
    return 403;
  }

  // 500 Internal Server Error
  return 500;
}

async function handleProductSync(request: Request) {
  try {
    const result = await syncShopifyProducts(request);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("Shopify product sync error:", error instanceof Error ? error.message : error);

    const status = determineStatusCode(error);
    const errorMessage =
      error instanceof Error ? error.message : "Shopify product synchronization failed.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      {
        status,
      }
    );
  }
}

export async function POST(request: Request) {
  return handleProductSync(request);
}

export async function GET(request: Request) {
  return handleProductSync(request);
}

