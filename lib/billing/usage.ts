import {
  BILLING_PLANS,
  type BillingPlanId,
} from "@/lib/billing/plans";

export function getConversationPercentage(
  planId: BillingPlanId,
  conversationsUsed: number
) {
  const limit = BILLING_PLANS[planId].conversations;

  if (limit <= 0) return 0;

  return Math.min(Math.round((conversationsUsed / limit) * 100), 100);
}

export function hasConversationCapacity(
  planId: BillingPlanId,
  conversationsUsed: number
) {
  const limit = BILLING_PLANS[planId].conversations;

  return conversationsUsed < limit;
}

export function getRemainingConversations(
  planId: BillingPlanId,
  conversationsUsed: number
) {
  const limit = BILLING_PLANS[planId].conversations;

  return Math.max(limit - conversationsUsed, 0);
}