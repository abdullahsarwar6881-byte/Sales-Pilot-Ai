import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "./plans";

export async function getCurrentSubscription() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!subscription) {
    return {
      userId: user.id,
      planId: "starter" as PlanId,
      status: "trialing",
      plan: PLANS.starter,
    };
  }

  const planId =
    subscription.plan_id in PLANS
      ? (subscription.plan_id as PlanId)
      : "starter";

  return {
    userId: user.id,
    planId,
    status: subscription.status,
    plan: PLANS[planId],
    subscription,
  };
}