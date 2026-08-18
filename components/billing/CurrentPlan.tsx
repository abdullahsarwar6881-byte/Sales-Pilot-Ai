import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  AlertCircle,
  XCircle,
} from "lucide-react";

import {
  getBillingPlan,
  type BillingPlanId,
} from "@/lib/billing/plans";

interface CurrentPlanProps {
  planId: BillingPlanId;
  status: string;
  billingCycle: "monthly" | "annual";
  currentPeriodEnd: string | null;
}

export default function CurrentPlan({
  planId,
  status,
  billingCycle,
  currentPeriodEnd,
}: CurrentPlanProps) {
  const plan = getBillingPlan(planId);

  const price =
    billingCycle === "annual"
      ? plan.annualPrice
      : plan.monthlyPrice;

  /*
   * =========================================================
   * STATUS
   * =========================================================
   */

  const normalizedStatus = status?.toLowerCase() || "active";

  const statusConfig = {
    active: {
      label: "Active",
      icon: CheckCircle2,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    },

    trialing: {
      label: "Trial",
      icon: Clock3,
      className:
        "border-blue-200 bg-blue-50 text-blue-700",
    },

    past_due: {
      label: "Payment Due",
      icon: AlertCircle,
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    },

    canceled: {
      label: "Canceled",
      icon: XCircle,
      className:
        "border-red-200 bg-red-50 text-red-700",
    },

    incomplete: {
      label: "Incomplete",
      icon: AlertCircle,
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    },

    default: {
      label: "No Subscription",
      icon: CreditCard,
      className:
        "border-border bg-muted text-muted-foreground",
    },
  } as const;

  const config =
    statusConfig[
      normalizedStatus as keyof typeof statusConfig
    ] ?? statusConfig.default;

  const StatusIcon = config.icon;

  /*
   * =========================================================
   * RENEWAL DATE
   * =========================================================
   */

  const renewalDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(
        "en-PK",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      )
    : null;

  /*
   * =========================================================
   * BILLING CYCLE LABEL
   * =========================================================
   */

  const billingCycleLabel =
    billingCycle === "annual"
      ? "Annual billing"
      : "Monthly billing";

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

        {/* ===================================================
            LEFT SIDE
        =================================================== */}

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">

            <h2 className="text-lg font-semibold text-foreground">
              Current Plan
            </h2>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />

              {config.label}
            </span>
          </div>

          <h3 className="text-3xl font-bold tracking-tight text-foreground">
            {plan.name}
          </h3>

          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {plan.description}
          </p>

          {/* Plan quick information */}

          <div className="mt-4 flex flex-wrap gap-2">

            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
              {plan.websites}{" "}
              {plan.websites === 1
                ? "website"
                : "websites"}
            </span>

            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
              {plan.conversations.toLocaleString()}{" "}
              AI conversations/month
            </span>

            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
              {plan.knowledgePages.toLocaleString()}{" "}
              knowledge pages
            </span>

          </div>
        </div>

        {/* ===================================================
            RIGHT SIDE
        =================================================== */}

        <div className="shrink-0 md:text-right">

          {/* Price */}

          <div className="text-2xl font-bold text-foreground">
            Rs. {price.toLocaleString()}

            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {billingCycle === "annual"
                ? "year"
                : "month"}
            </span>
          </div>

          {/* Billing cycle */}

          <div className="mt-1 text-xs font-medium text-muted-foreground">
            {billingCycleLabel}
          </div>

          {/* Renewal */}

          {renewalDate ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground md:justify-end">
              <CalendarDays className="h-4 w-4 shrink-0" />

              <span>
                {normalizedStatus === "trialing"
                  ? `Trial ends ${renewalDate}`
                  : `Renews ${renewalDate}`}
              </span>
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">
              No active billing period yet
            </div>
          )}

        </div>
      </div>
    </section>
  );
}