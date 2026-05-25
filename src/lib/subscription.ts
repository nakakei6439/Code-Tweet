import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubscriptionTier = "free" | "paid";

export async function getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logError("subscription", "tier fetch error", error, { userId });
    return "free";
  }

  return data?.tier === "paid" ? "paid" : "free";
}

export async function isEligibleForTrial(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("stripe_customer_id, tier")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logError("subscription", "trial eligibility fetch error", error, { userId });
    return false;
  }

  if (data?.tier === "paid") return false;
  if (data?.stripe_customer_id) return false;
  return true;
}
