import "@shopify/shopify-api/adapters/node";

import {
  shopifyApi,
  ApiVersion,
  LogSeverity,
} from "@shopify/shopify-api";

const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const apiSecretKey = process.env.SHOPIFY_API_SECRET;

if (!apiKey) {
  throw new Error("Missing NEXT_PUBLIC_SHOPIFY_API_KEY");
}

if (!apiSecretKey) {
  throw new Error("Missing SHOPIFY_API_SECRET");
}

export const shopify = shopifyApi({
  apiKey,
  apiSecretKey,

  scopes: [
    "read_products",
    "read_inventory",
    "read_orders",
    "read_customers",
  ],

  hostName: "localhost:3000",
  hostScheme: "http",

  apiVersion: ApiVersion.July26,

  isEmbeddedApp: true,
  isCustomStoreApp: false,

  logger: {
    level: LogSeverity.Error,
  },
});