"use client";

import { X } from "lucide-react";
import { getBillingPlan, type BillingPlanId } from "@/lib/billing/plans";

interface UpgradeModalProps {
  open: boolean;
  planId: BillingPlanId | null;
  onClose: () => void;
}

export default function UpgradeModal({
  open,
  planId,
  onClose,
}: UpgradeModalProps) {
  if (!open || !planId) return null;

  const plan = getBillingPlan(planId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Upgrade to {plan.name}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              You are about to upgrade your Sales Pilot plan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {plan.name}
            </span>

            <span className="font-semibold text-foreground">
              Rs. {plan.monthlyPrice.toLocaleString()} / month
            </span>
          </div>

          <div className="mt-3 text-sm text-muted-foreground">
            {plan.conversations.toLocaleString()} AI conversations/month
          </div>

          <div className="mt-1 text-sm text-muted-foreground">
            {plan.websites} website{plan.websites !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Cancel
          </button>

          <button
            type="button"
            className="h-11 flex-1 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
          >
            Continue
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Payment integration will be connected in the next billing step.
        </p>
      </div>
    </div>
  );
}