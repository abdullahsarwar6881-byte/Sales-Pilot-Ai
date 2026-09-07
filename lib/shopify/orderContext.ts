// =====================================================
// SALES PILOT - PERSISTENT CONVERSATION ORDER CONTEXT
// =====================================================
//
// Manages serverless-safe conversation order context stored
// directly in public.conversations (metadata->order_context).
//
// Rules:
// 1. Never rely on in-memory Maps across serverless instances.
// 2. Bound strictly to conversation.id & visitor_session_id.
// 3. Customer A's verified session cannot be accessed by Customer B.
// 4. Pending order number is NEVER authorization by itself.
// 5. Minimal state stored (orderNumber, orderId, verifiedAt).
// =====================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConversationOrderContext {
  pendingOrderNumber?: string | null;
  verifiedOrderNumber?: string | null;
  verifiedOrderId?: string | null;
  verifiedEmail?: string | null;
  storeId?: string | null;
  verifiedAt?: string | null;
}

const ORDER_VERIFICATION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Get active order context for a conversation from database metadata.
 */
export async function getConversationOrderContext(
  supabase: SupabaseClient,
  conversationId: number | string
): Promise<ConversationOrderContext | null> {
  if (!conversationId) {
    return null;
  }

  try {
    const { data: conv, error } = await supabase
      .from("conversations")
      .select("id, visitor_session_id, customer_email, metadata")
      .eq("id", conversationId)
      .maybeSingle();

    if (error || !conv) {
      // If metadata column is not yet applied, gracefully return null
      return null;
    }

    const rawContext = (conv.metadata as Record<string, any>)?.order_context;
    if (!rawContext || typeof rawContext !== "object") {
      return null;
    }

    // Check TTL on verified status
    if (rawContext.verifiedAt) {
      const verifiedTime = new Date(rawContext.verifiedAt).getTime();
      if (Date.now() - verifiedTime > ORDER_VERIFICATION_TTL_MS) {
        // Expired verification
        return {
          pendingOrderNumber: rawContext.pendingOrderNumber || null,
          verifiedOrderNumber: null,
          verifiedOrderId: null,
          verifiedEmail: null,
          storeId: rawContext.storeId || null,
          verifiedAt: null,
        };
      }
    }

    return {
      pendingOrderNumber: rawContext.pendingOrderNumber || null,
      verifiedOrderNumber: rawContext.verifiedOrderNumber || null,
      verifiedOrderId: rawContext.verifiedOrderId || null,
      verifiedEmail: rawContext.verifiedEmail || null,
      storeId: rawContext.storeId || null,
      verifiedAt: rawContext.verifiedAt || null,
    };
  } catch (err) {
    console.warn("Failed to read conversation order context:", err);
    return null;
  }
}

/**
 * Store pending order number in conversation metadata while awaiting customer email verification.
 * Note: A pending order number is NEVER proof of ownership.
 */
export async function setConversationPendingOrder(
  supabase: SupabaseClient,
  conversationId: number | string,
  orderNumber: string,
  storeId?: string
): Promise<void> {
  if (!conversationId || !orderNumber) {
    return;
  }

  try {
    const { data: conv } = await supabase
      .from("conversations")
      .select("metadata")
      .eq("id", conversationId)
      .maybeSingle();

    const currentMetadata = (conv?.metadata as Record<string, any>) || {};
    const currentContext = currentMetadata.order_context || {};

    const updatedMetadata = {
      ...currentMetadata,
      order_context: {
        ...currentContext,
        pendingOrderNumber: orderNumber,
        storeId: storeId || currentContext.storeId || null,
      },
    };

    await supabase
      .from("conversations")
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  } catch (err) {
    console.warn("Failed to set conversation pending order:", err);
  }
}

/**
 * Persist verified order context after successful server-side customer verification.
 */
export async function setConversationVerifiedOrder(
  supabase: SupabaseClient,
  conversationId: number | string,
  data: {
    orderNumber: string;
    orderId?: string;
    email?: string;
    storeId?: string;
  }
): Promise<void> {
  if (!conversationId || !data.orderNumber) {
    return;
  }

  try {
    const { data: conv } = await supabase
      .from("conversations")
      .select("metadata")
      .eq("id", conversationId)
      .maybeSingle();

    const currentMetadata = (conv?.metadata as Record<string, any>) || {};
    const currentContext = currentMetadata.order_context || {};

    const updatedMetadata = {
      ...currentMetadata,
      order_context: {
        ...currentContext,
        pendingOrderNumber: null, // Clear pending state
        verifiedOrderNumber: data.orderNumber,
        verifiedOrderId: data.orderId || null,
        verifiedEmail: data.email || null,
        storeId: data.storeId || currentContext.storeId || null,
        verifiedAt: new Date().toISOString(),
      },
    };

    await supabase
      .from("conversations")
      .update({
        metadata: updatedMetadata,
        // Optionally update customer_email if provided and not yet set
        ...(data.email ? { customer_email: data.email } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  } catch (err) {
    console.warn("Failed to set conversation verified order:", err);
  }
}

/**
 * Reset conversation order context.
 */
export async function clearConversationOrderContext(
  supabase: SupabaseClient,
  conversationId: number | string
): Promise<void> {
  if (!conversationId) {
    return;
  }

  try {
    const { data: conv } = await supabase
      .from("conversations")
      .select("metadata")
      .eq("id", conversationId)
      .maybeSingle();

    if (!conv?.metadata) {
      return;
    }

    const currentMetadata = (conv.metadata as Record<string, any>) || {};
    const updatedMetadata = { ...currentMetadata };
    delete updatedMetadata.order_context;

    await supabase
      .from("conversations")
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  } catch (err) {
    console.warn("Failed to clear conversation order context:", err);
  }
}

