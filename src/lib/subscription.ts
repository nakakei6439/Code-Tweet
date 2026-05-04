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
    console.error("[subscription] tier fetch error:", error);
    return "free";
  }

  return data?.tier === "paid" ? "paid" : "free";
}
