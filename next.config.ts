import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Helper to safely extract hostname from an optional tunnel URL
function getHostname(urlStr?: string): string | null {
  if (!urlStr) return null;
  try {
    const url = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    return url.hostname;
  } catch {
    return null;
  }
}

// Development origins to allow for Shopify CLI Cloudflare quick tunnels
const devOrigins: string[] = [
  "*.trycloudflare.com",
  "**.trycloudflare.com",
];

// Dynamically include any tunnel host provided via environment variables
const envTunnelHosts = [
  getHostname(process.env.SHOPIFY_APP_URL),
  getHostname(process.env.TUNNEL_URL),
  getHostname(process.env.HOST),
].filter((h): h is string => Boolean(h));

for (const host of envTunnelHosts) {
  if (!devOrigins.includes(host)) {
    devOrigins.push(host);
  }
}

const nextConfig: NextConfig = {
  // Disable the floating Next.js development indicator / dev tools button in the browser
  devIndicators: false,

  // In development, allow Shopify Cloudflare quick tunnels without breaking on restarts.
  // In production, allowedDevOrigins is omitted to preserve strict production security.
  ...(isDev ? { allowedDevOrigins: devOrigins } : {}),
};

export default nextConfig;
