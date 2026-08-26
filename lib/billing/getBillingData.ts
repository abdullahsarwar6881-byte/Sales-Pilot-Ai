import { createClient } from "@/lib/supabase/server";

import {
  BILLING_PLANS,
  type BillingPlanId,
} from "@/lib/billing/plans";

export async function getBillingData() {
  const supabase = await createClient();

  // =========================================================
  // AUTHENTICATED USER
  // =========================================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  // =========================================================
  // SUBSCRIPTION
  // =========================================================

  const {
    data: subscription,
    error: subscriptionError,
  } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    throw subscriptionError;
  }

  // =========================================================
  // PLAN
  // =========================================================

  const planId: BillingPlanId =
    subscription?.plan_id &&
    subscription.plan_id in BILLING_PLANS
      ? (subscription.plan_id as BillingPlanId)
      : "starter";

  const plan = BILLING_PLANS[planId];

  // =========================================================
  // BILLING PERIOD
  // =========================================================

  const periodStart = subscription?.current_period_start
    ? new Date(subscription.current_period_start)
    : new Date();

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : new Date(
        periodStart.getTime() +
          30 * 24 * 60 * 60 * 1000
      );

  // =========================================================
  // REAL CONVERSATIONS
  // =========================================================

  const {
    count: conversationCount,
    error: conversationsError,
  } = await supabase
    .from("conversations")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id)
    .gte("created_at", periodStart.toISOString())
    .lt("created_at", periodEnd.toISOString());

  if (conversationsError) {
    throw conversationsError;
  }

  // =========================================================
  // REAL WEBSITE SOURCES
  // =========================================================

  const {
    count: websiteCount,
    error: websitesError,
  } = await supabase
    .from("knowledge_urls")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id);

  if (websitesError) {
    throw websitesError;
  }

  // =========================================================
  // REAL KNOWLEDGE PAGES
  // =========================================================

  const {
    count: knowledgePageCount,
    error: pagesError,
  } = await supabase
    .from("knowledge_pages")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id);

  if (pagesError) {
    throw pagesError;
  }

  // =========================================================
  // REAL BILLING TRANSACTIONS
  // =========================================================

  const {
    data: transactions,
    error: transactionsError,
  } = await supabase
    .from("billing_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (transactionsError) {
    throw transactionsError;
  }

  // =========================================================
  // RETURN BILLING DATA
  // =========================================================

  return {
    user,

    subscription: subscription
      ? {
          id: subscription.id,

          planId,

          status: subscription.status,

          billingCycle:
            subscription.billing_cycle,

          currentPeriodStart:
            subscription.current_period_start,

          currentPeriodEnd:
            subscription.current_period_end,
        }
      : null,

    plan,

    // =======================================================
    // USAGE
    //
    // IMPORTANT:
    // Plan limits are now stored under plan.limits
    // =======================================================

    usage: {
      conversations:
        conversationCount ?? 0,

      conversationLimit:
        plan.limits.conversations,

      websites:
        websiteCount ?? 0,

      websiteLimit:
        plan.limits.websites,

      knowledgePages:
        knowledgePageCount ?? 0,

      knowledgePageLimit:
        plan.limits.knowledgePages,
    },

    // =======================================================
    // TRANSACTIONS
    // =======================================================

    transactions:
      transactions ?? [],
  };
}