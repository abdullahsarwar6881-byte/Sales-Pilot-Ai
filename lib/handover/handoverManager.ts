/**
 * Sales Pilot — Human Handover Manager
 * 
 * Central coordinator for human handover detection, conversation state transitions,
 * atomic takeovers, AI suppression, and system audit logging.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { notifyHumanHandover } from "@/lib/notifications/notificationManager";

export interface HandoverDetectionResult {
  requiresHumanHandover: boolean;
  reason: string;
}

export interface ConversationStateCheck {
  id?: string | number;
  status?: string | null;
  assigned_to?: string | null;
  handover_requested_at?: string | null;
  taken_over_at?: string | null;
}

const HUMAN_HANDOVER_KEYWORDS = [
  "talk to a human",
  "talk to human",
  "speak to a human",
  "speak to human",
  "speak with a human",
  "talk with a human",
  "speak to a person",
  "talk to a person",
  "speak with a person",
  "talk with a person",
  "real person",
  "real human",
  "human support",
  "live support",
  "human agent",
  "live agent",
  "customer support",
  "customer service",
  "talk to support",
  "speak to support",
  "contact support",
  "contact a human",
  "contact someone",
  "connect me to support",
  "connect me with support",
  "connect me to an agent",
  "connect me with an agent",
  "connect me to a human",
  "connect me with a human",
  "let me talk to someone",
  "let me speak to someone",
  "let me talk to an agent",
  "let me speak to an agent",
  "let me talk to a human",
  "let me speak to a human",
  "agent please",
  "human please",
  "representative please",
  "representative",
  "i want a human",
  "i need a human",
  "i want a real person",
  "i need a real person",
  "i need human help",
  "i need human support",
  "i want to speak to someone",
  "i need to speak to someone",
  "i want to talk to someone",
  "i need to talk to someone",
  "can i speak with a real person",
  "can i speak to a real person",
  "can i speak to customer support",
  "can i speak with customer support",
  "transfer me to a human",
  "transfer me to an agent",
  "transfer to agent",
  "transfer to human",
  "operator please",
  "speak to an operator",
];

/**
 * Normalizes input text for deterministic intent detection
 */
function normalizeForHandover(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/\u0000/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[!?.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detects whether the customer's message indicates a human handover request
 * or an escalation trigger.
 */
export function detectHandoverIntent(
  message: string,
  history?: Array<{ sender: string; content: string }>
): HandoverDetectionResult {
  const normalized = normalizeForHandover(message);
  if (!normalized) {
    return { requiresHumanHandover: false, reason: "" };
  }

  // 1. Explicit customer request matching
  for (const phrase of HUMAN_HANDOVER_KEYWORDS) {
    if (normalized.includes(phrase)) {
      return {
        requiresHumanHandover: true,
        reason: "customer_requested_human",
      };
    }
  }

  // Exact single-word checks for "agent" or "representative"
  const tokens = normalized.split(" ");
  if (tokens.length <= 3) {
    if (tokens.includes("agent") || tokens.includes("representative") || tokens.includes("human")) {
      return {
        requiresHumanHandover: true,
        reason: "customer_requested_human",
      };
    }
  }

  // 2. Frustration / escalation indicators in conversation history
  if (Array.isArray(history) && history.length >= 4) {
    const recentCustomerMsgs = history
      .filter((m) => m.sender === "customer")
      .slice(-3)
      .map((m) => normalizeForHandover(m.content));

    const frustrationKeywords = [
      "not helping",
      "useless",
      "terrible",
      "horrible",
      "stupid bot",
      "waste of time",
      "hate this",
      "wrong answer",
    ];

    const hasFrustration = frustrationKeywords.some((fk) => normalized.includes(fk));
    const repeatsMessage =
      recentCustomerMsgs.length >= 2 &&
      recentCustomerMsgs.filter((m) => m === normalized).length >= 2;

    if (hasFrustration || repeatsMessage) {
      return {
        requiresHumanHandover: true,
        reason: hasFrustration ? "customer_frustrated" : "repeated_unresolved_query",
      };
    }
  }

  return { requiresHumanHandover: false, reason: "" };
}

/**
 * Checks whether the AI assistant is permitted to respond to the conversation.
 * If waiting for a human, handled by a human, or resolved, AI is muted.
 */
export function isAIAllowedForConversation(
  conversation: ConversationStateCheck | null | undefined
): boolean {
  if (!conversation) {
    // New conversation starts with AI enabled
    return true;
  }

  const status = String(conversation.status || "").toLowerCase().trim();
  const assignedTo = String(conversation.assigned_to || "").toLowerCase().trim();

  // Muted states
  if (status === "waiting_for_human") {
    return false;
  }
  if (status === "human_active") {
    return false;
  }
  if (status === "resolved") {
    return false;
  }
  // If assigned to a specific human user (UUID or non-'ai')
  if (assignedTo && assignedTo !== "ai") {
    return false;
  }

  return true;
}

/**
 * Requests human handover for a conversation.
 * Updates conversation status, records timestamp and reason, logs a system
 * audit message, and dispatches a notification to staff.
 */
export async function requestHumanHandover(
  supabase: SupabaseClient,
  params: {
    conversationId: string | number;
    profileId: string;
    reason?: string;
    customerName?: string | null;
    customerEmail?: string | null;
    lastMessage?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const {
    conversationId,
    profileId,
    reason = "customer_requested_human",
    customerName,
    customerEmail,
    lastMessage,
  } = params;

  try {
    const nowIso = new Date().toISOString();

    // 1. Transition conversation status to waiting_for_human
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        status: "waiting_for_human",
        assigned_to: "waiting_for_human",
        handover_requested_at: nowIso,
        handover_reason: reason,
        updated_at: nowIso,
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("[HandoverManager] Conversation status update error:", updateError);
      return { success: false, error: updateError.message };
    }

    // 2. Insert internal system audit message
    const { error: msgError } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        sender: "system",
        role: "system",
        content: "Customer requested human support.",
        created_at: nowIso,
      });

    if (msgError) {
      console.warn("[HandoverManager] System audit message insert warning:", msgError);
    }

    // 3. Dispatch handover notification
    await notifyHumanHandover(
      {
        conversationId,
        profileId,
        customerName,
        customerEmail,
        reason,
        requestedAt: nowIso,
        lastMessage,
      },
      supabase
    );

    return { success: true };
  } catch (err: any) {
    console.error("[HandoverManager] requestHumanHandover exception:", err);
    return { success: false, error: err?.message || "Failed to request human handover" };
  }
}

/**
 * Takes over a conversation atomically using the PostgreSQL RPC function.
 * Prevents race conditions between simultaneous agents.
 */
export async function takeOverConversation(
  supabase: SupabaseClient,
  params: {
    conversationId: string | number;
    userId: string;
    agentName?: string;
  }
): Promise<{
  success: boolean;
  error?: string;
  code?: string;
  assigned_to?: string;
  status?: string;
}> {
  const { conversationId, userId, agentName = "Support Agent" } = params;

  try {
    const { data, error } = await supabase.rpc("take_over_conversation", {
      p_conversation_id: conversationId,
      p_user_id: userId,
      p_agent_name: agentName,
    });

    if (error) {
      console.error("[HandoverManager] take_over_conversation RPC error:", error);
      return { success: false, error: error.message };
    }

    return (
      (data as any) || {
        success: true,
        conversation_id: conversationId,
        assigned_to: userId,
        status: "human_active",
      }
    );
  } catch (err: any) {
    console.error("[HandoverManager] takeOverConversation exception:", err);
    return { success: false, error: err?.message || "Failed to take over conversation" };
  }
}

/**
 * Returns a conversation from human mode back to AI assistant.
 */
export async function returnConversationToAI(
  supabase: SupabaseClient,
  params: {
    conversationId: string | number;
    userId: string;
  }
): Promise<{ success: boolean; error?: string; code?: string }> {
  const { conversationId, userId } = params;

  try {
    const { data, error } = await supabase.rpc("return_conversation_to_ai", {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });

    if (error) {
      console.error("[HandoverManager] return_conversation_to_ai RPC error:", error);
      return { success: false, error: error.message };
    }

    return (data as any) || { success: true };
  } catch (err: any) {
    console.error("[HandoverManager] returnConversationToAI exception:", err);
    return { success: false, error: err?.message || "Failed to return conversation to AI" };
  }
}

/**
 * Resolves an active conversation.
 */
export async function resolveConversation(
  supabase: SupabaseClient,
  params: {
    conversationId: string | number;
    userId: string;
  }
): Promise<{ success: boolean; error?: string; code?: string }> {
  const { conversationId, userId } = params;

  try {
    const { data, error } = await supabase.rpc("resolve_conversation", {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });

    if (error) {
      console.error("[HandoverManager] resolve_conversation RPC error:", error);
      return { success: false, error: error.message };
    }

    return (data as any) || { success: true };
  } catch (err: any) {
    console.error("[HandoverManager] resolveConversation exception:", err);
    return { success: false, error: err?.message || "Failed to resolve conversation" };
  }
}

