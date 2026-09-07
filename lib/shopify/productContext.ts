import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Persistent per‑conversation product context stored in `metadata.product_context`.
 * Allows the assistant to remember which product/variant the user is referring to
 * across multiple messages.
 */
export interface ConversationProductContext {
  /** Global Shopify ID of the product variant */
  variantId?: string | null;
  /** SKU of the variant (if available) */
  sku?: string | null;
  /** ISO timestamp when the context was set */
  resolvedAt?: string | null;
}

/** Retrieve the product context for a conversation. */
export async function getConversationProductContext(
  supabase: SupabaseClient,
  conversationId: number | string
): Promise<ConversationProductContext | null> {
  if (!conversationId) return null;
  try {
    const { data: conv, error } = await supabase
      .from("conversations")
      .select("metadata")
      .eq("id", conversationId)
      .maybeSingle();
    if (error || !conv) return null;
    const raw = (conv.metadata as Record<string, any>)?.product_context;
    if (!raw || typeof raw !== "object") return null;
    return {
      variantId: raw.variantId || null,
      sku: raw.sku || null,
      resolvedAt: raw.resolvedAt || null,
    };
  } catch (err) {
    console.warn("Failed to read conversation product context:", err);
    return null;
  }
}

/** Store product context for a conversation. */
export async function setConversationProductContext(
  supabase: SupabaseClient,
  conversationId: number | string,
  data: { variantId?: string; sku?: string }
): Promise<void> {
  if (!conversationId) return;
  try {
    const { data: conv } = await supabase
      .from("conversations")
      .select("metadata")
      .eq("id", conversationId)
      .maybeSingle();
    const currentMetadata = (conv?.metadata as Record<string, any>) || {};
    const currentContext = currentMetadata.product_context || {};
    const updatedMetadata = {
      ...currentMetadata,
      product_context: {
        ...currentContext,
        variantId: data.variantId ?? currentContext.variantId ?? null,
        sku: data.sku ?? currentContext.sku ?? null,
        resolvedAt: new Date().toISOString(),
      },
    };
    await supabase
      .from("conversations")
      .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  } catch (err) {
    console.warn("Failed to set conversation product context:", err);
  }
}

/** Clear product context for a conversation. */
export async function clearConversationProductContext(
  supabase: SupabaseClient,
  conversationId: number | string
): Promise<void> {
  if (!conversationId) return;
  try {
    const { data: conv } = await supabase
      .from("conversations")
      .select("metadata")
      .eq("id", conversationId)
      .maybeSingle();
    const currentMetadata = (conv?.metadata as Record<string, any>) || {};
    const updatedMetadata = { ...currentMetadata, product_context: null };
    await supabase
      .from("conversations")
      .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  } catch (err) {
    console.warn("Failed to clear conversation product context:", err);
  }
}

