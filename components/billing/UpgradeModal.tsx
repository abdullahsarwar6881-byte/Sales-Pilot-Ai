"use client";

import { X } from "lucide-react";

import {
  PLANS,
  type PlanId,
} from "@/lib/billing/plans";

interface UpgradeModalProps {
  open: boolean;
  planId: PlanId | null;
  onClose: () => void;
  billingCycle?: "monthly" | "annual";
  onContinue?: () => void;
  loading?: boolean;
}

export default function UpgradeModal({
  open,
  planId,
  onClose,
  billingCycle = "monthly",
  onContinue,
  loading = false,
}: UpgradeModalProps) {
  if (!open || !planId) {
    return null;
  }

  const plan = PLANS[planId];

  const monthlyPrice = plan.price;

  const annualPrice = monthlyPrice * 10;

  const price =
    billingCycle === "annual"
      ? annualPrice
      : monthlyPrice;

  const billingLabel =
    billingCycle === "annual"
      ? "/ year"
      : "/ month";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="upgrade-modal-title"
              className="text-lg font-semibold text-foreground"
            >
              Upgrade to {plan.name}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              You are about to upgrade your Sales Pilot
              plan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* =================================================
            PLAN SUMMARY
        ================================================= */}

        <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4">
          {/* Plan + price */}

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Selected plan
              </p>

              <p className="mt-1 font-semibold text-foreground">
                {plan.name}
              </p>
            </div>

            <div className="text-right">
              <p className="font-semibold text-foreground">
                Rs. {price.toLocaleString()}
              </p>

              <p className="text-xs text-muted-foreground">
                {billingLabel}
              </p>
            </div>
          </div>

          {/* Billing cycle */}

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Billing
            </p>

            <p className="mt-1 text-sm text-foreground">
              {billingCycle === "annual"
                ? "Annual billing"
                : "Monthly billing"}
            </p>
          </div>

          {/* Limits */}

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Included limits
            </p>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  Websites
                </span>

                <span className="font-medium text-foreground">
                  {plan.limits.websites}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  AI conversations
                </span>

                <span className="font-medium text-foreground">
                  {plan.limits.conversations.toLocaleString()}
                  /month
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  Knowledge pages
                </span>

                <span className="font-medium text-foreground">
                  {plan.limits.knowledgePages.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onContinue}
            disabled={loading}
            className="h-11 flex-1 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : "Continue to Payment"}
          </button>
        </div>

        {/* =================================================
            PAYMENT MESSAGE
        ================================================= */}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You will be redirected to secure payment to
          complete your subscription.
        </p>
      </div>
    </div>
  );
}