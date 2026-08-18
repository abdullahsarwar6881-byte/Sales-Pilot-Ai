import { BILLING_PLANS, type BillingPlanId } from "@/lib/billing/plans";

export function canStartConversation(
  planId: BillingPlanId,
  conversationsUsed: number
) {
  const plan = BILLING_PLANS[planId];

  return conversationsUsed < plan.conversations;
}

export function getConversationLimit(planId: BillingPlanId) {
  return BILLING_PLANS[planId].conversations;
}