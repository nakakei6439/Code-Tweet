import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscriptionTier } from "@/lib/subscription";
import {
  GUEST_TOTAL_LIMIT,
  USER_FREE_MONTHLY_LIMIT,
  USER_PAID_MONTHLY_LIMIT,
  getMonthWindowStart,
  getNextMonthStart,
} from "@/lib/rateLimit";
import type { UsageInfo, UsageTier } from "@/types/usage";

async function countUserUsage(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("generated_at", getMonthWindowStart());
  if (error) {
    logError("usage", "usage_logs count error", error);
    return 0;
  }
  return count ?? 0;
}

async function countGuestUsage(ipHash: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("ip_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash);
  if (error) {
    logError("usage", "ip_usage_logs count error", error);
    return 0;
  }
  return count ?? 0;
}

export async function getUserUsage(userId: string): Promise<UsageInfo> {
  const tier: UsageTier = (await getSubscriptionTier(userId)) === "paid" ? "paid" : "free";
  const limit = tier === "paid" ? USER_PAID_MONTHLY_LIMIT : USER_FREE_MONTHLY_LIMIT;
  const used = await countUserUsage(userId);
  return {
    tier,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt: getNextMonthStart(),
  };
}

export async function getGuestUsage(ipHash: string): Promise<UsageInfo> {
  const used = await countGuestUsage(ipHash);
  return {
    tier: "guest",
    used,
    limit: GUEST_TOTAL_LIMIT,
    remaining: Math.max(0, GUEST_TOTAL_LIMIT - used),
    resetAt: getNextMonthStart(),
  };
}
