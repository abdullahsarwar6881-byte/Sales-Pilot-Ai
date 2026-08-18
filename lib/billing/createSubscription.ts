import { createClient } from "@/lib/supabase/server";

export async function createStarterSubscription(userId: string) {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing;
  }

  const start = new Date();

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan_id: "starter",
      status: "active",
      billing_cycle: "monthly",
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}