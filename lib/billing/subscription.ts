import {
  BILLING_PLANS,
  type BillingPlanId,
} from "@/lib/billing/plans";

export function isValidBillingPlan(
  planId: string
): planId is BillingPlanId {
  return planId in BILLING_PLANS;
}

export function getDefaultBillingPlan(): BillingPlanId {
  return "starter";
}