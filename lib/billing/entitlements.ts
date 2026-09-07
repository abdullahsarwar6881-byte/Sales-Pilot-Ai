import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "./plans";

export async function getCurrentSubscription() {
  const supabase = await createClient();

  const {
    data: authData,
    error: userError,
  } = await supabase.auth.getUser();

  const user = authData?.user;

  if (userError || !user) {
    return {
      userId: null,
      planId: "starter" as PlanId,
      status: "trialing",
      plan: PLANS.starter,
      subscription: null,
    };
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