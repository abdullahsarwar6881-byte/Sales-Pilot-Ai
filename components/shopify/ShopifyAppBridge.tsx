"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

interface ShopifyAppBridgeProps {
  apiKey?: string;
}

/**
 * Conditionally loads Shopify App Bridge ONLY when running inside an embedded Shopify context.
 *
 * In standalone localhost / web SaaS mode (no Shopify `shop` or `host` query parameters
 * and not in a Shopify iframe), App Bridge is NOT loaded, preventing the
 * "App Bridge Next: missing required configuration fields: shop" crash.
 */
export default function ShopifyAppBridge({ apiKey }: ShopifyAppBridgeProps) {
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !apiKey) return;

    const searchParams = new URLSearchParams(window.location.search);
    const hasShopifyParams =
      searchParams.has("host") ||
      searchParams.has("shop") ||
      searchParams.has("embedded");

    let isFramed = false;
    try {
      isFramed = window.self !== window.top;
    } catch {
      isFramed = true;
    }

    // Activate App Bridge only if Shopify parameters are present or if running in an iframe with Shopify context
    if (hasShopifyParams || (isFramed && (searchParams.has("host") || searchParams.has("shop")))) {
      setIsEmbedded(true);
    }
  }, [apiKey]);

  if (!isEmbedded || !apiKey) {
    return null;
  }

  return (
    <>
      <meta name="shopify-api-key" content={apiKey} />
      <Script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        strategy="afterInteractive"
      />
    </>
  );
}

