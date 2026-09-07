// =====================================================
// URL NORMALIZATION & VALIDATION
// =====================================================

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "gad_source",
  "gbraid",
  "wbraid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
  "ref",
  "source",
  "affiliate",
  "aff",
  "spm",
]);

/**
 * Checks if a hostname or IP address is a private, loopback, or metadata endpoint (SSRF protection).
 */
export function isSafePublicUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // 1. Block localhost and local domains
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".corp") ||
      hostname.endsWith(".home")
    ) {
      return false;
    }

    // 2. Block IPv6 loopback and private ranges
    if (
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe80")
    ) {
      return false;
    }

    // 3. Block IPv4 private, loopback, link-local, and reserved ranges
    // Matches: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 (metadata), 0.0.0.0/8
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const octet1 = parseInt(ipMatch[1], 10);
      const octet2 = parseInt(ipMatch[2], 10);
      const octet3 = parseInt(ipMatch[3], 10);
      const octet4 = parseInt(ipMatch[4], 10);

      if (octet1 > 255 || octet2 > 255 || octet3 > 255 || octet4 > 255) {
        return false;
      }

      // 0.0.0.0/8
      if (octet1 === 0) return false;
      // 127.0.0.0/8 (Loopback)
      if (octet1 === 127) return false;
      // 10.0.0.0/8 (Private network)
      if (octet1 === 10) return false;
      // 172.16.0.0/12 (Private network: 172.16 - 172.31)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
      // 192.168.0.0/16 (Private network)
      if (octet1 === 192 && octet2 === 168) return false;
      // 169.254.0.0/16 (Link-local / Cloud metadata service e.g. 169.254.169.254)
      if (octet1 === 169 && octet2 === 254) return false;
      // 100.64.0.0/10 (Carrier-grade NAT)
      if (octet1 === 100 && octet2 >= 64 && octet2 <= 127) return false;
      // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
      if (octet1 >= 224) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL:
 * - Strips fragments (#...)
 * - Strips marketing/tracking query parameters (utm_*, fbclid, gclid, etc.)
 * - Preserves meaningful query parameters (?page=2, ?category=shoes, etc.)
 * - Strips trailing slashes (except root /)
 * - Returns a clean absolute URL string or null if invalid / unsafe.
 */
export function normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (
    !trimmed ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("file:") ||
    trimmed.startsWith("data:")
  ) {
    return null;
  }

  try {
    const parsed = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);

    // Only support HTTP and HTTPS protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    // SSRF Check
    if (!isSafePublicUrl(parsed.href)) {
      return null;
    }

    // Strip fragment
    parsed.hash = "";

    // Clean tracking parameters while preserving real query params
    if (parsed.search) {
      const searchParams = new URLSearchParams(parsed.search);
      const keysToDelete: string[] = [];

      searchParams.forEach((_, key) => {
        const lowerKey = key.toLowerCase();
        if (TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith("utm_")) {
          keysToDelete.push(key);
        }
      });

      for (const key of keysToDelete) {
        searchParams.delete(key);
      }

      const cleanQuery = searchParams.toString();
      parsed.search = cleanQuery ? `?${cleanQuery}` : "";
    }

    // Normalize pathname trailing slash (except for homepage "/")
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }

    // Remove .md suffix if present
    if (parsed.pathname.endsWith(".md")) {
      parsed.pathname = parsed.pathname.replace(/\.md$/, "");
    }

    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Checks if two URLs belong to the exact same registered domain/subdomain.
 */
export function isSameDomain(url1: string, url2: string): boolean {
  try {
    const host1 = new URL(url1).hostname.toLowerCase().replace(/^www\./, "");
    const host2 = new URL(url2).hostname.toLowerCase().replace(/^www\./, "");
    return host1 === host2;
  } catch {
    return false;
  }
}

const BLOCKED_PATHS = [
  "/login",
  "/signin",
  "/sign-in",
  "/signup",
  "/sign-up",
  "/register",
  "/logout",
  "/cart",
  "/checkout",
  "/account",
  "/my-account",
  "/search",
  "/wishlist",
  "/compare",
  "/password",
  "/admin",
  "/wp-admin",
  "/wp-login",
  "/feed",
  "/rss",
  "/cdn-cgi/",
];

const BLOCKED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".pdf",
  ".zip",
  ".rar",
  ".tar",
  ".gz",
  ".xml",
  ".json",
  ".mp3",
  ".mp4",
  ".avi",
  ".mov",
  ".webm",
  ".css",
  ".js",
  ".map",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
];

/**
 * Determines whether a URL should be skipped from crawling (e.g. login, cart, static assets).
 */
export function shouldSkipUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    for (const path of BLOCKED_PATHS) {
      if (pathname.includes(path)) {
        return true;
      }
    }

    for (const ext of BLOCKED_EXTENSIONS) {
      if (pathname.endsWith(ext)) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

