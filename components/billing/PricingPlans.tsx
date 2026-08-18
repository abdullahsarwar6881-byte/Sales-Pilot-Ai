"use client";

import { Check, Sparkles } from "lucide-react";
import {
  BILLING_PLANS,
  type BillingPlanId,
} from "@/lib/billing/plans";

interface PricingPlansProps {
  currentPlan?: BillingPlanId;
  billingCycle?: "monthly" | "annual";
  onSelectPlan?: (planId: BillingPlanId) => void;
}

export default function PricingPlans({
  currentPlan = "starter",
  billingCycle = "monthly",
  onSelectPlan,
}: PricingPlansProps) {
  const plans = Object.values(BILLING_PLANS);

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Choose your plan
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Choose the plan that fits your business and upgrade whenever you
          need more.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;

          const price =
            billingCycle === "annual"
              ? plan.annualPrice
              : plan.monthlyPrice;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200 ${
                plan.popular
                  ? "border-foreground/30 shadow-md"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>

                <p className="mt-2 min-h-[40px] text-sm leading-5 text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mt-6">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    Rs. {price.toLocaleString()}
                  </span>

                  <span className="mb-1 text-sm text-muted-foreground">
                    / {billingCycle === "annual" ? "year" : "month"}
                  </span>
                </div>

                {billingCycle === "annual" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Save 2 months with annual billing
                  </p>
                )}
              </div>

              <div className="my-6 h-px bg-border" />

              <ul className="flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-foreground"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={isCurrent}
                onClick={() => onSelectPlan?.(plan.id)}
                className={`mt-7 flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? "cursor-default border border-border bg-muted text-muted-foreground"
                    : plan.popular
                      ? "bg-foreground text-background hover:opacity-90"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {isCurrent ? "Current Plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}