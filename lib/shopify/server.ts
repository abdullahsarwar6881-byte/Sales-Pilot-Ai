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

const appUrlStr =
  process.env.SHOPIFY_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

let parsedHostName = "localhost:3000";
let parsedHostScheme: "http" | "https" = "http";

try {
  const url = new URL(
    appUrlStr.startsWith("http://") || appUrlStr.startsWith("https://")
      ? appUrlStr
      : `https://${appUrlStr}`
  );
  parsedHostName = url.host;
  parsedHostScheme = url.protocol === "http:" ? "http" : "https";
} catch {
  parsedHostName = "localhost:3000";
  parsedHostScheme = "http";
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

  hostName: parsedHostName,
  hostScheme: parsedHostScheme,

  apiVersion: ApiVersion.July26,

  isEmbeddedApp: true,
  isCustomStoreApp: false,

  logger: {
    level: LogSeverity.Error,
  },
});