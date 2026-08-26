import { NextResponse } from "next/server";

import { syncShopifyStore } from "@/lib/shopify/sync";

export async function GET(request: Request) {
  try {
    const result = await syncShopifyStore(request);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Shopify sync error:", error);

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Shopify synchronization failed.",
      },
      {
        status: 401,
      }
    );
  }
}