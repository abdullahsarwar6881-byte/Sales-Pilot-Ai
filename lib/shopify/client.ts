"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Shopify App Bridge Client Helper
 *
 * Provides utilities to detect the Shopify embedded context, obtain a fresh
 * short-lived session token (JWT) via Shopify App Bridge v4, and execute
 * authenticated fetch requests with `Authorization: Bearer <session-token>`.
 */

export interface ShopifyFetchOptions extends RequestInit {
  sessionToken?: string;
  timeoutMs?: number;
}

/**
 * Checks whether the current window is executing inside a Shopify embedded iframe
 * or has the global Shopify App Bridge object initialized.
 */
export function isShopifyEmbedded(): boolean {
  if (typeof window === "undefined") return false;

  const hasShopifyGlobal = Boolean((window as unknown as { shopify?: unknown }).shopify);

  let isFramed = false;
  try {
    isFramed = window.self !== window.top;
  } catch {
    isFramed = true;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hasShopifyParams =
    searchParams.has("host") ||
    searchParams.has("shop") ||
    searchParams.has("embedded");

  return hasShopifyGlobal || (isFramed && hasShopifyParams);
}

/**
 * Obtains a fresh session token from Shopify App Bridge.
 * Waits up to timeoutMs for the App Bridge CDN script to load and initialize.
 */
export async function getShopifySessionToken(timeoutMs = 3000): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const shopify = (window as unknown as {
      shopify?: {
        idToken?: () => Promise<string>;
        ready?: Promise<void>;
      };
    }).shopify;

    if (shopify && typeof shopify.idToken === "function") {
      try {
        if (shopify.ready && typeof shopify.ready.then === "function") {
          await Promise.race([
            shopify.ready,
            new Promise((resolve) => setTimeout(resolve, 1000)),
          ]);
        }

        const token = await shopify.idToken();
        if (token && typeof token === "string") {
          return token.trim();
        }
      } catch (err) {
        console.warn("[Shopify App Bridge] Failed to retrieve idToken:", err);
      }
    }

    // Wait 50ms before polling again
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return null;
}

/**
 * Wrapper around global `fetch()` that automatically fetches a fresh
 * Shopify session token via App Bridge and sets the `Authorization: Bearer <token>`
 * header before sending the request.
 *
 * Example:
 * ```ts
 * const response = await shopifyFetch("/api/shopify/sync", {
 *   method: "POST",
 * });
 * ```
 */

export async function shopifyFetch(
  input: RequestInfo | URL,
  init?: ShopifyFetchOptions
): Promise<Response> {
  const headers = new Headers(init?.headers);

  // If Authorization header is not explicitly set, obtain session token
  if (!headers.has("Authorization")) {
    let token = init?.sessionToken;

    if (!token) {
      token = (await getShopifySessionToken(init?.timeoutMs ?? 3000)) || undefined;
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // If x-supabase-auth header is not explicitly set, attach Supabase session token if available
  if (!headers.has("x-supabase-auth") && typeof window !== "undefined") {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers.set("x-supabase-auth", data.session.access_token);
      }
    } catch (err) {
      console.warn("[shopifyFetch] Failed to retrieve Supabase session token:", err);
    }
  }

  const { sessionToken: _ignoredToken, timeoutMs: _ignoredTimeout, ...fetchInit } = init || {};

  return fetch(input, {
    ...fetchInit,
    headers,
  });
}

