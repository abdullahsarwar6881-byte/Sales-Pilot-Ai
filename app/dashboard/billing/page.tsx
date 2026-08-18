import BillingHeader from "@/components/billing/BillingHeader";
import CurrentPlan from "@/components/billing/CurrentPlan";
import UsageCard from "@/components/billing/UsageCard";
import PricingPlans from "@/components/billing/PricingPlans";
import BillingHistory from "@/components/billing/BillingHistory";
import { getBillingData } from "@/lib/billing/getBillingData";

export default async function BillingPage() {
  const billing = await getBillingData();

  const subscription = billing.subscription;

  const planId = subscription?.planId ?? "starter";

  const billingCycle = subscription?.billingCycle ?? "monthly";

  const status = subscription?.status ?? "active";

  /*
   * If there is no subscription yet, we don't want to
   * pretend that the user has a real renewal date.
   *
   * CurrentPlan handles the display safely.
   */
  const currentPeriodEnd =
    subscription?.currentPeriodEnd ?? null;

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
              Track your Sales Pilot usage for the current billing period.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            <UsageCard
              title="AI Conversations"
              used={billing.usage.conversations}
              limit={billing.usage.conversationLimit}
              description="Your AI conversation usage for the current billing period."
            />

            <UsageCard
              title="Websites"
              used={billing.usage.websites}
              limit={billing.usage.websiteLimit}
              description="Websites connected to your Sales Pilot account."
            />

            <UsageCard
              title="Knowledge Pages"
              used={billing.usage.knowledgePages}
              limit={billing.usage.knowledgePageLimit}
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

          <PricingPlans
            currentPlan={planId}
            billingCycle={billingCycle}
          />
        </section>

        {/* =====================================================
            BILLING HISTORY
        ===================================================== */}

        <BillingHistory
          transactions={billing.transactions}
        />

      </div>
    </main>
  );
}