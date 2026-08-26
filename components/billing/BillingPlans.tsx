"use client";

import { useState } from "react";

import PricingPlans from "@/components/billing/PricingPlans";
import type { PlanId } from "@/lib/billing/plans";

interface BillingPlansProps {
  currentPlan: PlanId;
  billingCycle: "monthly" | "annual";
}

export default function BillingPlans({
  currentPlan,
  billingCycle,
}: BillingPlansProps) {
  const [loadingPlan, setLoadingPlan] =
    useState<PlanId | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function handleSelectPlan(
    planId: PlanId
  ) {
    try {
      setError(null);
      setLoadingPlan(planId);

      // =====================================================
      // STARTER ONLY
      // =====================================================

      if (planId !== "starter") {
        throw new Error(
          "Only the Starter plan is currently available."
        );
      }

      // =====================================================
      // CREATE STARTER SAFEPAY CHECKOUT
      // =====================================================

      const response = await fetch(
        "/api/billing/checkout",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            planId: "starter",
            billingCycle,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to start Starter checkout."
        );
      }

      if (!data.checkoutUrl) {
        throw new Error(
          "Safepay did not return a checkout URL."
        );
      }

      // =====================================================
      // REDIRECT TO SAFEPAY HOSTED CHECKOUT
      // =====================================================

      window.location.href =
        data.checkoutUrl;
    } catch (
      error: unknown
    ) {
      console.error(
        "Starter billing checkout error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to start Starter checkout."
      );

      setLoadingPlan(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loadingPlan && (
        <div className="mb-5 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          Preparing your Starter Safepay checkout...
        </div>
      )}

      <PricingPlans
        currentPlan={currentPlan}
        billingCycle={billingCycle}
        onSelectPlan={
          handleSelectPlan
        }
      />
    </div>
  );
}