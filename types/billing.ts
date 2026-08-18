import type { BillingPlanId } from "@/lib/billing/plans";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export type BillingCycle = "monthly" | "annual";

export interface Subscription {
  id: string;
  userId: string;
  planId: BillingPlanId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingUsage {
  conversations: number;
  conversationLimit: number;
  websites: number;
  websiteLimit: number;
}

export interface BillingTransaction {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  description: string;
  createdAt: string;
}