/**
 * Sales Pilot — Public Widget Authentication & Domain Security
 * 
 * Safely resolves public widget identifiers to merchant tenant accounts,
 * validates requesting origins against registered store domains,
 * and handles CORS preflight and headers.
 */

import { createClient } from "@supabase/supabase-js";

export interface ResolvedWidgetConfig {
  widgetPublicId: string;
  merchantId: string;
  allowedDomains: string[];
  settings: {
    aiName: string;
    welcomeMessage: string;
    brandColor: string;
    position: string;
    theme: string;
    size: string;
    radius: string;
    autoOpen: boolean;
    showTypingIndicator: boolean;
    soundNotifications: boolean;
    showAiAvatar: boolean;
    collectVisitorName: boolean;
    collectVisitorEmail: boolean;
    enableAnimations: boolean;
    showPoweredBy: boolean;
  };
}

const DEFAULT_SETTINGS = {
  aiName: "Sales Pilot AI",
  welcomeMessage: "👋 Hi! How can I help you today?",
  brandColor: "#6366F1",
  position: "Bottom Right",
  theme: "Light",
  size: "Medium",
  radius: "Rounded",
  autoOpen: false,
  showTypingIndicator: true,
  soundNotifications: false,
  showAiAvatar: true,
  collectVisitorName: false,
  collectVisitorEmail: false,
  enableAnimations: true,
  showPoweredBy: true,
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Resolves a public widget identifier or fallback ID to merchant tenant account
 * and collects all verified registered domains for origin validation.
 */
export async function resolveMerchantFromWidget(
  widgetIdentifier: string
): Promise<ResolvedWidgetConfig | null> {
  if (!widgetIdentifier || typeof widgetIdentifier !== "string") {
    return null;
  }

  const cleanId = widgetIdentifier.trim();
  if (!cleanId || cleanId.length > 128) {
    return null;
  }

  const supabase = getAdminClient();

  // 1. Try finding widget in widget_settings by id (UUID) or user_id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

  let widgetRow: Record<string, any> | null = null;

  if (isUuid) {
    const { data } = await supabase
      .from("widget_settings")
      .select("*")
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
      .maybeSingle();
    widgetRow = data;
  } else {
    // If a custom string public_id is used
    const { data } = await supabase
      .from("widget_settings")
      .select("*")
      .eq("id", cleanId)
      .maybeSingle();
    widgetRow = data;
  }

  let merchantId: string | null = null;
  let widgetPublicId: string = cleanId;

  if (widgetRow) {
    merchantId = widgetRow.user_id;
    widgetPublicId = widgetRow.id;
  } else if (isUuid) {
    // Fallback check in profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", cleanId)
      .maybeSingle();

    if (profile) {
      merchantId = profile.id;
      widgetPublicId = profile.id;
    }
  }

  if (!merchantId) {
    return null;
  }

  // 2. Fetch all registered domains for this merchant
  const allowedDomains: string[] = [];

  // 2a. Profile website / website_url
  const { data: profileData } = await supabase
    .from("profiles")
    .select("website, website_url")
    .eq("id", merchantId)
    .maybeSingle();

  if (profileData?.website) allowedDomains.push(profileData.website);
  if (profileData?.website_url) allowedDomains.push(profileData.website_url);

  // 2b. Knowledge URLs (crawled store URLs)
  const { data: knowledgeUrls } = await supabase
    .from("knowledge_urls")
    .select("url")
    .eq("user_id", merchantId);

  if (knowledgeUrls && knowledgeUrls.length > 0) {
    for (const item of knowledgeUrls) {
      if (item.url) allowedDomains.push(item.url);
    }
  }

  // 2c. Connected Shopify stores
  const { data: shopifyStores } = await supabase
    .from("shopify_stores")
    .select("shop_domain")
    .or(`user_id.eq.${merchantId},profile_id.eq.${merchantId}`);

  if (shopifyStores && shopifyStores.length > 0) {
    for (const store of shopifyStores) {
      if (store.shop_domain) allowedDomains.push(store.shop_domain);
    }
  }

  return {
    widgetPublicId,
    merchantId,
    allowedDomains,
    settings: {
      aiName: widgetRow?.ai_name || DEFAULT_SETTINGS.aiName,
      welcomeMessage: widgetRow?.welcome_message || DEFAULT_SETTINGS.welcomeMessage,
      brandColor: widgetRow?.brand_color || DEFAULT_SETTINGS.brandColor,
      position: widgetRow?.position || DEFAULT_SETTINGS.position,
      theme: widgetRow?.theme || DEFAULT_SETTINGS.theme,
      size: widgetRow?.size || DEFAULT_SETTINGS.size,
      radius: widgetRow?.radius || DEFAULT_SETTINGS.radius,
      autoOpen: widgetRow?.auto_open ?? DEFAULT_SETTINGS.autoOpen,
      showTypingIndicator: widgetRow?.show_typing_indicator ?? DEFAULT_SETTINGS.showTypingIndicator,
      soundNotifications: widgetRow?.sound_notifications ?? DEFAULT_SETTINGS.soundNotifications,
      showAiAvatar: widgetRow?.show_ai_avatar ?? DEFAULT_SETTINGS.showAiAvatar,
      collectVisitorName: widgetRow?.collect_visitor_name ?? DEFAULT_SETTINGS.collectVisitorName,
      collectVisitorEmail: widgetRow?.collect_visitor_email ?? DEFAULT_SETTINGS.collectVisitorEmail,
      enableAnimations: widgetRow?.enable_animations ?? DEFAULT_SETTINGS.enableAnimations,
      showPoweredBy: widgetRow?.show_powered_by ?? DEFAULT_SETTINGS.showPoweredBy,
    },
  };
}

/**
 * Extracts and normalizes a hostname from a URL string or domain string
 */
export function normalizeHostname(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const urlString = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(urlString);
    let host = parsed.hostname.toLowerCase();
    // Normalize www prefix
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    return host;
  } catch {
    return null;
  }
}

/**
 * Validates request Origin or Referer against the merchant's registered domains.
 * Uses strict URL hostname comparison rather than loose substring matching.
 */
export function isOriginAllowed(
  requestOriginOrReferer: string | null,
  allowedDomains: string[]
): { allowed: boolean; originToEcho: string | null; hostname: string | null } {
  const isDev = process.env.NODE_ENV !== "production";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const appHostname = normalizeHostname(appUrl);

  // If no origin or referer provided (e.g. server-side/curl/tests)
  if (!requestOriginOrReferer) {
    if (isDev) {
      return { allowed: true, originToEcho: "*", hostname: null };
    }
    // In production, browser requests will have Origin or Referer.
    // If neither is present, block unverified public callers.
    return { allowed: false, originToEcho: null, hostname: null };
  }

  const incomingHost = normalizeHostname(requestOriginOrReferer);
  if (!incomingHost) {
    return { allowed: false, originToEcho: null, hostname: null };
  }

  // Derive origin to echo back for CORS (must include scheme and port if present)
  let originToEcho: string = requestOriginOrReferer;
  try {
    const parsed = new URL(requestOriginOrReferer);
    originToEcho = parsed.origin;
  } catch {
    // leave as string
  }

  // 1. Allow localhost / 127.0.0.1 in development or preview
  if (
    incomingHost === "localhost" ||
    incomingHost === "127.0.0.1" ||
    incomingHost.endsWith(".localhost")
  ) {
    return { allowed: true, originToEcho, hostname: incomingHost };
  }

  // 2. Allow Sales Pilot application domain (for dashboard live preview)
  if (appHostname && (incomingHost === appHostname || incomingHost.endsWith(`.${appHostname}`))) {
    return { allowed: true, originToEcho, hostname: incomingHost };
  }

  // 3. Match against registered merchant domains
  for (const domain of allowedDomains) {
    const registeredHost = normalizeHostname(domain);
    if (!registeredHost) continue;

    // Exact match (e.g. shop.com === shop.com)
    if (incomingHost === registeredHost) {
      return { allowed: true, originToEcho, hostname: incomingHost };
    }

    // Subdomain match (e.g. store.shop.com is allowed for registered shop.com)
    // CRITICAL: We check endsWith("." + registeredHost) so that shop.com.attacker.com is REJECTED!
    if (incomingHost.endsWith(`.${registeredHost}`)) {
      return { allowed: true, originToEcho, hostname: incomingHost };
    }
  }

  // Origin not registered for this merchant
  return { allowed: false, originToEcho: null, hostname: incomingHost };
}

/**
 * Constructs appropriate CORS headers
 */
export function getCorsHeaders(
  allowedOrigin: string | null,
  methods: string = "GET, OPTIONS"
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    "Access-Control-Max-Age": "86400",
  };

  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    headers["Vary"] = "Origin";
  }

  return headers;
}

