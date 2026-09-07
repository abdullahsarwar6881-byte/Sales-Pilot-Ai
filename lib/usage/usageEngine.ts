/**
 * Sales Pilot — Merchant Usage Tracking & Quota Enforcement Engine
 *
 * Provides atomic quota reservations, token tracking, cost accounting,
 * and monthly aggregates.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { calculateAiCost } from "@/lib/ai/pricing";

export interface MerchantQuotaCheck {
  allowed: boolean;
  code?: string;
  error?: string;
  planId?: string;
  planName?: string;
  used?: number;
  limit?: number;
  remaining?: number;
}

export interface RecordUsageParams {
  profileId: string;
  conversationId?: number | string | null;
  billingPeriod: string;
  eventType: "message" | "embedding" | "chat_completion" | "vision_analysis";
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  success?: boolean;
  errorMessage?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Derives standard billing period string (e.g. "2026-09")
 */
export function getCurrentBillingPeriod(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Resolves the merchant's current plan and message quota.
 */
export async function getMerchantPlanAndLimit(
  supabaseAdmin: SupabaseClient,
  merchantId: string
): Promise<{
  planId: PlanId;
  planName: string;
  limit: number;
  status: string;
  periodStart: Date;
  periodEnd: Date;
  billingPeriod: string;
}> {
  const now = new Date();
  const defaultPeriod = getCurrentBillingPeriod(now);

  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_id, status, current_period_start, current_period_end")
    .eq("user_id", merchantId)
    .maybeSingle();

  const planId: PlanId =
    subscription?.plan_id && subscription.plan_id in PLANS
      ? (subscription.plan_id as PlanId)
      : "starter";

  const plan = PLANS[planId];
  const limit = plan.limits.conversations;

  let periodStart = subscription?.current_period_start
    ? new Date(subscription.current_period_start)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  let periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Derive billing period from period start
  const billingPeriod = getCurrentBillingPeriod(periodStart);

  return {
    planId,
    planName: plan.name,
    limit,
    status: subscription?.status || "active",
    periodStart,
    periodEnd,
    billingPeriod,
  };
}

/**
 * Atomically checks and reserves quota for an incoming AI request.
 * Uses PostgreSQL row-level locks (FOR UPDATE) to prevent race conditions.
 */
export async function reserveMerchantQuota(
  supabaseAdmin: SupabaseClient,
  params: {
    merchantId: string;
    billingPeriod: string;
    maxLimit: number;
  }
): Promise<MerchantQuotaCheck> {
  const { merchantId, billingPeriod, maxLimit } = params;

  try {
    const { data, error } = await supabaseAdmin.rpc("reserve_merchant_usage", {
      p_profile_id: merchantId,
      p_billing_period: billingPeriod,
      p_max_limit: maxLimit,
    });

    if (error) {
      console.error("RESERVE USAGE RPC ERROR:", error);
      // If error occurs, do not block users if it's transient, but log clearly
      return {
        allowed: true,
        limit: maxLimit,
        used: 0,
        remaining: maxLimit,
      };
    }

    if (data?.allowed === false) {
      return {
        allowed: false,
        code: "USAGE_LIMIT_REACHED",
        error: "This AI assistant has reached its monthly usage limit. Please contact the website owner.",
        used: data.used,
        limit: data.limit,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      used: data?.used ?? 1,
      limit: data?.limit ?? maxLimit,
      remaining: data?.remaining ?? Math.max(0, maxLimit - 1),
    };
  } catch (error) {
    console.error("RESERVE USAGE UNEXPECTED ERROR:", error);
    return { allowed: true, limit: maxLimit, remaining: maxLimit };
  }
}

/**
 * Rolls back reserved quota if the AI request failed before completion.
 */
export async function reconcileMerchantQuota(
  supabaseAdmin: SupabaseClient,
  merchantId: string,
  billingPeriod: string
): Promise<void> {
  try {
    await supabaseAdmin.rpc("reconcile_merchant_usage", {
      p_profile_id: merchantId,
      p_billing_period: billingPeriod,
    });
  } catch (error) {
    console.error("RECONCILE USAGE ERROR:", error);
  }
}

/**
 * Records an AI usage event into `usage_records` and updates `monthly_usage`.
 */
export async function recordAiUsage(
  supabaseAdmin: SupabaseClient,
  params: RecordUsageParams
): Promise<string | null> {
  const {
    profileId,
    conversationId,
    billingPeriod,
    eventType,
    model,
    promptTokens = 0,
    completionTokens = 0,
    success = true,
    errorMessage = null,
    metadata = {},
  } = params;

  const estimatedCost = calculateAiCost({
    model,
    promptTokens,
    completionTokens,
    eventType,
  });

  const parsedConvId =
    conversationId != null && !isNaN(Number(conversationId))
      ? Number(conversationId)
      : null;

  try {
    const { data: recordId, error } = await supabaseAdmin.rpc(
      "record_ai_usage_event",
      {
        p_profile_id: profileId,
        p_conversation_id: parsedConvId,
        p_billing_period: billingPeriod,
        p_event_type: eventType,
        p_model: model || "unknown",
        p_prompt_tokens: promptTokens,
        p_completion_tokens: completionTokens,
        p_estimated_cost: estimatedCost,
        p_success: success,
        p_error_message: errorMessage,
        p_metadata: metadata,
      }
    );

    if (error) {
      console.error("RECORD USAGE EVENT RPC ERROR:", error);
      return null;
    }

    return recordId;
  } catch (error) {
    console.error("RECORD USAGE EVENT UNEXPECTED ERROR:", error);
    return null;
  }
}

/**
 * Retrieves the monthly aggregate usage for a merchant.
 */
export async function getMerchantMonthlyUsage(
  supabase: SupabaseClient,
  merchantId: string,
  billingPeriod?: string
): Promise<{
  aiMessages: number;
  aiResponses: number;
  embeddingRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}> {
  const period = billingPeriod || getCurrentBillingPeriod();

  const { data, error } = await supabase
    .from("monthly_usage")
    .select("*")
    .eq("profile_id", merchantId)
    .eq("billing_period", period)
    .maybeSingle();

  if (error || !data) {
    return {
      aiMessages: 0,
      aiResponses: 0,
      embeddingRequests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    };
  }

  return {
    aiMessages: Number(data.ai_messages || 0),
    aiResponses: Number(data.ai_responses || 0),
    embeddingRequests: Number(data.embedding_requests || 0),
    inputTokens: Number(data.input_tokens || 0),
    outputTokens: Number(data.output_tokens || 0),
    totalTokens: Number(data.total_tokens || 0),
    estimatedCost: Number(data.estimated_cost || 0),
  };
}
