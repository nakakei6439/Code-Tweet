import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionTier } from "@/lib/subscription";

export const GUEST_MONTHLY_LIMIT = 3;
export const USER_FREE_MONTHLY_LIMIT = 10;
export const USER_PAID_MONTHLY_LIMIT = 100;

import type { GenerateErrorCode } from "@/types/tweet";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; status: 429; message: string; code: GenerateErrorCode };

export function getMonthWindowStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function getNextMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip");
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function checkUserLimit(
  supabase: SupabaseClient,
  userId: string,
  tier: SubscriptionTier,
): Promise<RateLimitResult> {
  const limit = tier === "paid" ? USER_PAID_MONTHLY_LIMIT : USER_FREE_MONTHLY_LIMIT;

  const { count, error } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("generated_at", getMonthWindowStart());

  if (error) {
    console.error("[rateLimit] usage_logs count error:", error);
    return { ok: true };
  }

  if ((count ?? 0) >= limit) {
    if (tier === "paid") {
      return {
        ok: false,
        status: 429,
        message: `今月の生成上限（${limit}回）に達しました。来月 1 日にリセットされます。`,
        code: "paid_limit",
      };
    }
    return {
      ok: false,
      status: 429,
      message: `今月の生成上限（${limit}回）に達しました。Pro プラン（月 980 円）で月 ${USER_PAID_MONTHLY_LIMIT} 回まで拡張されます。`,
      code: "free_limit",
    };
  }
  return { ok: true };
}

export async function recordUserUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("usage_logs").insert({ user_id: userId });
  if (error) console.error("[rateLimit] usage_logs insert error:", error);
}

export async function checkGuestLimit(ipHash: string): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("ip_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("generated_at", getMonthWindowStart());

  if (error) {
    console.error("[rateLimit] ip_usage_logs count error:", error);
    return { ok: true };
  }

  if ((count ?? 0) >= GUEST_MONTHLY_LIMIT) {
    return {
      ok: false,
      status: 429,
      message: `今月の生成上限（${GUEST_MONTHLY_LIMIT}回）に達しました。GitHub ログインで月 ${USER_FREE_MONTHLY_LIMIT} 回まで拡張されます。`,
      code: "guest_limit",
    };
  }
  return { ok: true };
}

export async function recordGuestUsage(ipHash: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("ip_usage_logs").insert({ ip_hash: ipHash });
  if (error) console.error("[rateLimit] ip_usage_logs insert error:", error);
}
