import type { SupabaseClient } from "@supabase/supabase-js";

// =====================================================
// WEBSITE CAPABILITY MODEL
// =====================================================
//
// Sales Pilot is a universal website AI agent, not just an
// ecommerce chatbot. Every website can expose a different set
// of capabilities. The AI decides which capabilities are
// available for the current website and only uses what is
// actually present, so Shopify is optional and a plain
// crawled website still works.
// =====================================================

export interface WebsiteCapabilities {
  hasProducts: boolean;
  hasShopify: boolean;
  hasOrders: boolean;
  hasServices: boolean;
  hasPricing: boolean;
  hasBookings: boolean;
  hasKnowledgeBase: boolean;
  hasDocuments: boolean;
  hasRealEstate: boolean;
  hasContact: boolean;
  hasLocations: boolean;
  hasFaqs: boolean;
  hasPolicies: boolean;
}

export interface WebsiteContext {
  capabilities: WebsiteCapabilities;
  siteName: string;
  siteUrl: string;
  category: string;
  hasKnowledge: boolean;
  pageCount: number;
  documentCount: number;
}

// =====================================================
// DEFAULTS
// =====================================================

export function emptyCapabilities(): WebsiteCapabilities {
  return {
    hasProducts: false,
    hasShopify: false,
    hasOrders: false,
    hasServices: false,
    hasPricing: false,
    hasBookings: false,
    hasKnowledgeBase: false,
    hasDocuments: false,
    hasRealEstate: false,
    hasContact: false,
    hasLocations: false,
    hasFaqs: false,
    hasPolicies: false,
  };
}

// =====================================================
// CATEGORY -> CAPABILITIES HINT
// =====================================================

function capabilitiesForCategory(category: string): WebsiteCapabilities {
  const caps = emptyCapabilities();
  const c = category.toLowerCase();

  if (/ecommerce|store|shop|retail|marketplace/.test(c)) {
    caps.hasProducts = true;
    caps.hasPricing = true;
    caps.hasPolicies = true;
    caps.hasOrders = true;
  } else if (/saas|software/.test(c)) {
    caps.hasPricing = true;
    caps.hasServices = true;
    caps.hasKnowledgeBase = true;
  } else if (/restaurant|food/.test(c)) {
    caps.hasBookings = true;
    caps.hasServices = true;
    caps.hasPricing = true;
    caps.hasLocations = true;
    caps.hasContact = true;
  } else if (/hotel|hospitality/.test(c)) {
    caps.hasBookings = true;
    caps.hasServices = true;
    caps.hasPricing = true;
    caps.hasLocations = true;
    caps.hasContact = true;
    caps.hasPolicies = true;
  } else if (/real.?estate/.test(c)) {
    caps.hasRealEstate = true;
    caps.hasPricing = true;
    caps.hasLocations = true;
    caps.hasContact = true;
  } else if (/agency|services|service|health|education|school/.test(c)) {
    caps.hasServices = true;
    caps.hasPricing = true;
    caps.hasContact = true;
  } else if (/portfolio|blog|community|business|corporate/.test(c)) {
    caps.hasContact = true;
    caps.hasPolicies = true;
  }

  return caps;
}

// =====================================================
// DETECT CAPABILITIES FROM DATA
// =====================================================

export function detectCapabilities(data: {
  category?: string | null;
  productCount?: number;
  pageCount?: number;
  knowledgeCount?: number;
  documentCount?: number;
  hasShopify?: boolean;
}): WebsiteCapabilities {
  const caps = data.category
    ? capabilitiesForCategory(data.category)
    : emptyCapabilities();

  const hasKnowledge =
    (data.knowledgeCount ?? 0) > 0 ||
    (data.pageCount ?? 0) > 0 ||
    (data.documentCount ?? 0) > 0;

  if ((data.knowledgeCount ?? 0) > 0) {
    caps.hasKnowledgeBase = true;
    caps.hasFaqs = true;
  }
  if ((data.documentCount ?? 0) > 0) {
    caps.hasDocuments = true;
  }
  if (hasKnowledge) {
    caps.hasPolicies = true;
    caps.hasPricing = true;
  }

  if ((data.productCount ?? 0) > 0) {
    caps.hasProducts = true;
    caps.hasPricing = true;
    caps.hasPolicies = true;
  }

  if (data.hasShopify) {
    caps.hasShopify = true;
    caps.hasProducts = true;
    caps.hasOrders = true;
    caps.hasPricing = true;
  }

  return caps;
}

// =====================================================
// BUILD WEBSITE CONTEXT FOR THE AI PROMPT
// =====================================================

export function buildWebsiteContextForAI(context: WebsiteContext): string {
  const caps = context.capabilities;
  const lines: string[] = [];

  if (context.siteName) lines.push(`Website/business: ${context.siteName}`);
  if (context.category) lines.push(`Website category: ${context.category}`);
  if (context.siteUrl) lines.push(`Website URL: ${context.siteUrl}`);

  const available: string[] = [];
  if (caps.hasProducts) available.push("products");
  if (caps.hasShopify) available.push("shopify integration");
  if (caps.hasOrders) available.push("orders");
  if (caps.hasServices) available.push("services");
  if (caps.hasPricing) available.push("pricing");
  if (caps.hasBookings) available.push("bookings");
  if (caps.hasKnowledgeBase) available.push("knowledge base");
  if (caps.hasDocuments) available.push("documents");
  if (caps.hasRealEstate) available.push("real estate listings");
  if (caps.hasContact) available.push("contact information");
  if (caps.hasLocations) available.push("locations");
  if (caps.hasFaqs) available.push("FAQs");
  if (caps.hasPolicies) available.push("policies");
  if (context.pageCount > 0) available.push(`${context.pageCount} crawled pages`);

  if (available.length > 0) {
    lines.push(`Available website capabilities: ${available.join(", ")}.`);
  } else {
    lines.push("No specialized capabilities detected; answer using general website knowledge and conversation context.");
  }

  return lines.join("\n");
}

// =====================================================
// LOAD WEBSITE CONTEXT FOR A PROFILE
// =====================================================

export async function loadWebsiteContext(
  supabaseAdmin: SupabaseClient,
  profileId: string
): Promise<WebsiteContext> {
  const out: WebsiteContext = {
    capabilities: emptyCapabilities(),
    siteName: "",
    siteUrl: "",
    category: "",
    hasKnowledge: false,
    pageCount: 0,
    documentCount: 0,
  };

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      console.error("WEBSITE CONTEXT PROFILE ERROR:", error);
    } else if (data) {
      out.siteName = String((data as any).business_name || "").trim();
      out.siteUrl = String((data as any).website_url || "").trim();
      // category may not exist in older live schemas; treat safely.
      out.category = String((data as any).category ? (data as any).category : "").trim();
    }
  } catch (e) {
    console.error("WEBSITE CONTEXT PROFILE EXCEPTION:", e);
  }

  try {
    const { count, error } = await supabaseAdmin
      .from("knowledge_pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profileId);

    if (!error) {
      out.pageCount = count ?? 0;
      if (out.pageCount > 0) out.hasKnowledge = true;
    }
  } catch (e) {
    console.error("WEBSITE CONTEXT KNOWLEDGE COUNT ERROR:", e);
  }

  let productCount = 0;
  try {
    const { count, error } = await supabaseAdmin
      .from("knowledge_pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profileId)
      .eq("page_type", "product");

    if (!error) productCount = count ?? 0;
  } catch (e) {
    console.error("WEBSITE CONTEXT PRODUCT COUNT ERROR:", e);
  }

  out.capabilities = detectCapabilities({
    category: out.category,
    productCount,
    pageCount: out.pageCount,
    knowledgeCount: out.pageCount,
    documentCount: 0,
  });

  return out;
}
