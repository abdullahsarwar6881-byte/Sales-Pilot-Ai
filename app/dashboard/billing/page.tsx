"use client";

import { useEffect, useState } from "react";
import BillingHeader from "@/components/billing/BillingHeader";
import CurrentPlan from "@/components/billing/CurrentPlan";
import UsageCard from "@/components/billing/UsageCard";
import BillingPlans from "@/components/billing/BillingPlans";
import BillingHistory from "@/components/billing/BillingHistory";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type PlanId } from "@/lib/billing/plans";

export default function BillingPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<PlanId>("starter");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [status, setStatus] = useState("active");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    websites: number;
    websiteLimit: number;
    knowledgePages: number;
    knowledgePageLimit: number;
  }>({
    websites: 0,
    websiteLimit: PLANS.starter.limits.websites,
    knowledgePages: 0,
    knowledgePageLimit: PLANS.starter.limits.knowledgePages,
  });
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    async function loadBilling() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Fetch subscription, website count, knowledge pages count, and transactions in parallel
        const [
          { data: subscription },
          { count: websiteCount },
          { count: pageCount },
          { data: txData },
        ] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("knowledge_urls")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("knowledge_pages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("billing_transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        const currentPlanId: PlanId =
          subscription?.plan_id && subscription.plan_id in PLANS
            ? (subscription.plan_id as PlanId)
            : "starter";

        const plan = PLANS[currentPlanId] || PLANS.starter;

        setPlanId(currentPlanId);
        setBillingCycle(subscription?.billing_cycle ?? "monthly");
        setStatus(subscription?.status ?? "active");
        setCurrentPeriodEnd(subscription?.current_period_end ?? null);

        setUsage({
          websites: websiteCount ?? 0,
          websiteLimit: plan.limits.websites,
          knowledgePages: pageCount ?? 0,
          knowledgePageLimit: plan.limits.knowledgePages,
        });

        setTransactions(txData ?? []);
      } catch (err) {
        console.error("Failed to load billing data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBilling();
  }, [supabase]);

  if (loading) {
    return (
      <main className="min-h-full bg-background">
        <div className="mx-auto w-full max-w-7xl space-y-8 p-6 lg:p-8">
          <BillingHeader />
          <div className="h-48 rounded-2xl border border-theme bg-card animate-pulse" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-32 rounded-2xl border border-theme bg-card animate-pulse" />
            <div className="h-32 rounded-2xl border border-theme bg-card animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-8 p-6 lg:p-8">
        {/* =====================================================
            BILLING HEADER
        ===================================================== */}
        <BillingHeader />

        {/* =====================================================
            CURRENT PLAN
        ===================================================== */}
        <CurrentPlan
          planId={planId}
          status={status}
          billingCycle={billingCycle}
          currentPeriodEnd={currentPeriodEnd}
        />

        {/* =====================================================
            USAGE
        ===================================================== */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Usage
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Track your Sales Pilot resource usage for the current billing period.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <UsageCard
              title="Websites"
              used={usage.websites}
              limit={usage.websiteLimit}
              description="Websites connected to your Sales Pilot account."
            />

            <UsageCard
              title="Knowledge Pages"
              used={usage.knowledgePages}
              limit={usage.knowledgePageLimit}
              description="Pages currently indexed in your knowledge base."
            />
          </div>
        </section>

        {/* =====================================================
            PLANS
        ===================================================== */}
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Plans
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Upgrade your Sales Pilot plan whenever your business grows.
            </p>
          </div>

          <BillingPlans
            currentPlan={planId}
            billingCycle={billingCycle}
          />
        </section>

        {/* =====================================================
            BILLING HISTORY
        ===================================================== */}
        <BillingHistory
          transactions={transactions}
        />
      </div>
    </main>
  );
}