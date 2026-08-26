"use client";

import { useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";

import {
  PLANS,
  type PlanId,
} from "@/lib/billing/plans";

interface PricingPlansProps {
  currentPlan?: PlanId;
  billingCycle?: "monthly" | "annual";
  onSelectPlan?: (planId: PlanId) => void;
}

const FEATURE_LABELS: Record<
  keyof (typeof PLANS)[PlanId]["features"],
  string
> = {
  aiCustomerSupport: "AI customer support",
  websiteCrawler: "Website crawler",
  knowledgeBase: "Knowledge Base",
  documentTraining: "PDF, DOCX & TXT training",
  basicWidget: "Basic widget customization",
  basicAnalytics: "Basic analytics",

  shopifyIntegration: "Shopify integration",
  productInventoryKnowledge: "Product & inventory knowledge",
  orderTracking: "Order tracking",
  aiCustomerActions: "AI customer actions",
  advancedWidget: "Advanced widget customization",
  advancedAnalytics: "Advanced analytics",

  advancedShopify: "Advanced Shopify automation",
  productRecommendations: "Product recommendations",
  returnRefundInfo: "Return & refund information",
  multipleKnowledgeSources: "Multiple knowledge sources",
};

const PLAN_DESCRIPTIONS: Record<PlanId, string> = {
  starter:
    "For small businesses getting started with AI support.",

  growth:
    "For growing businesses that need more automation.",

  business:
    "For businesses with higher support volume and automation needs.",
};

const POPULAR_PLAN: PlanId = "growth";

export default function PricingPlans({
  currentPlan = "starter",
  billingCycle = "monthly",
  onSelectPlan,
}: PricingPlansProps) {
  const plans = Object.values(PLANS);

  const [loadingPlan, setLoadingPlan] =
    useState<PlanId | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function handleUpgrade(planId: PlanId) {
    if (planId === currentPlan) return;

    setError(null);
    setLoadingPlan(planId);

    try {
      /*
       * If parent supplied its own handler,
       * use it.
       */
      if (onSelectPlan) {
        onSelectPlan(planId);
        return;
      }

      /*
       * Create Safepay checkout.
       */
      const response = await fetch(
        "/api/billing/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId,
            billingCycle,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to create checkout."
        );
      }

      if (!data.checkoutUrl) {
        throw new Error(
          "Safepay checkout URL was not returned."
        );
      }

      /*
       * Redirect directly to Safepay.
       */
      window.location.href =
        data.checkoutUrl;
    } catch (err) {
      console.error(
        "Upgrade error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout."
      );

      setLoadingPlan(null);
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Choose your plan
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Choose the plan that fits your business and upgrade
          whenever you need more.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent =
            plan.id === currentPlan;

          const isPopular =
            plan.id === POPULAR_PLAN;

          const monthlyPrice =
            plan.price;

          const annualPrice =
            monthlyPrice * 10;

          const price =
            billingCycle === "annual"
              ? annualPrice
              : monthlyPrice;

          const enabledFeatures =
            (
              Object.entries(
                plan.features
              ) as [
                keyof typeof plan.features,
                boolean,
              ][]
            ).filter(
              ([, enabled]) =>
                enabled
            );

          const isLoading =
            loadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200 ${
                isPopular
                  ? "border-foreground/30 shadow-md"
                  : "border-border"
              }`}
            >
              {isPopular && (
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
                  {PLAN_DESCRIPTIONS[
                    plan.id
                  ]}
                </p>
              </div>

              <div className="mt-6">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    Rs.{" "}
                    {price.toLocaleString()}
                  </span>

                  <span className="mb-1 text-sm text-muted-foreground">
                    /
                    {billingCycle ===
                    "annual"
                      ? "year"
                      : "month"}
                  </span>
                </div>

                {billingCycle ===
                  "annual" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Save 2 months with
                    annual billing
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
                  {plan.limits.websites}{" "}
                  {plan.limits.websites ===
                  1
                    ? "website"
                    : "websites"}
                </span>

                <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
                  {plan.limits.conversations.toLocaleString()}{" "}
                  AI conversations/month
                </span>

                <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
                  {plan.limits.knowledgePages.toLocaleString()}{" "}
                  knowledge pages
                </span>
              </div>

              <div className="my-6 h-px bg-border" />

              <ul className="flex flex-1 flex-col gap-3">
                {enabledFeatures.map(
                  ([feature]) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />

                      <span>
                        {
                          FEATURE_LABELS[
                            feature
                          ]
                        }
                      </span>
                    </li>
                  )
                )}
              </ul>

              <button
                type="button"
                disabled={
                  isCurrent ||
                  loadingPlan !== null
                }
                onClick={() =>
                  handleUpgrade(
                    plan.id
                  )
                }
                className={`mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? "cursor-default border border-border bg-muted text-muted-foreground"
                    : isPopular
                      ? "bg-foreground text-background hover:opacity-90"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening checkout...
                  </>
                ) : isCurrent ? (
                  "Current Plan"
                ) : (
                  "Upgrade"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}