import { RequestedTokenType } from "@shopify/shopify-api";

import { shopify } from "./server";

export async function authenticateShopifyRequest(request: Request) {
  // Get Shopify session token
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    throw new Error("Missing Shopify authorization header");
  }

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw new Error("Invalid Shopify authorization header");
  }

  const sessionToken = authorization.slice("bearer ".length).trim();

  if (!sessionToken) {
    throw new Error("Missing Shopify session token");
  }

  // Decode and verify Shopify session token
  const decodedSessionToken =
    await shopify.session.decodeSessionToken(sessionToken);

  // Get shop domain
  const destination = new URL(decodedSessionToken.dest);

  const shop = destination.hostname;

  if (!shop.endsWith(".myshopify.com")) {
    throw new Error("Invalid Shopify shop domain");
  }

  // Exchange session token for an Admin API access token
  const { session } = await shopify.auth.tokenExchange({
    shop,
    sessionToken,
    requestedTokenType: RequestedTokenType.OfflineAccessToken,
    expiring: true,
  });

  return {
    shop,
    accessToken: session.accessToken,
    scope: session.scope,
    session,
  };
}