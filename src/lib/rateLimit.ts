import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CREDIT_PACKS } from "@/lib/creditPacks";
import type { Entitlements } from "@/lib/entitlements";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const GUEST_TOTAL_LIMIT = 3;
export const USER_FREE_MONTHLY_LIMIT = 3;
export const USER_PAID_MONTHLY_LIMIT = 30;

import type { GenerateErrorCode } from "@/types/tweet";

// useCredit: 月次無料枠を使い切っており、この生成は購入クレジットを消費すべきという印。
export type RateLimitResult =
  | { ok: true; useCredit: boolean }
  | { ok: false; status: 429; message: string; code: GenerateErrorCode };

const SMALLEST_PACK = CREDIT_PACKS[0];
const CREDIT_PACK_HINT = `クレジットパック（${SMALLEST_PACK.credits}回 ¥${SMALLEST_PACK.amountJpy}〜）を購入すると続けて生成できます。`;

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
  entitlements: Pick<Entitlements, "quotaTier" | "creditBalance">,
): Promise<RateLimitResult> {
  const limit =
    entitlements.quotaTier === "paid" ? USER_PAID_MONTHLY_LIMIT : USER_FREE_MONTHLY_LIMIT;

  const { count, error } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("generated_at", getMonthWindowStart());

  if (error) {
    logError("rateLimit", "usage_logs count error", error);
    return { ok: true, useCredit: false };
  }

  if ((count ?? 0) >= limit) {
    // 月次無料枠を使い切っていても、購入クレジットが残っていれば生成できる。
    if (entitlements.creditBalance > 0) {
      return { ok: true, useCredit: true };
    }
    if (entitlements.quotaTier === "paid") {
      return {
        ok: false,
        status: 429,
        message: `今月の生成上限（${limit}回）に達しました。${CREDIT_PACK_HINT}`,
        code: "paid_limit",
      };
    }
    return {
      ok: false,
      status: 429,
      message: `今月の無料枠（${limit}回）を使い切りました。${CREDIT_PACK_HINT}`,
      code: "free_limit",
    };
  }
  return { ok: true, useCredit: false };
}

export async function recordUserUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("usage_logs").insert({ user_id: userId });
  if (error) logError("rateLimit", "usage_logs insert error", error);
}

export async function checkGuestLimit(ipHash: string): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("ip_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash);

  if (error) {
    logError("rateLimit", "ip_usage_logs count error", error);
    return { ok: true, useCredit: false };
  }

  if ((count ?? 0) >= GUEST_TOTAL_LIMIT) {
    return {
      ok: false,
      status: 429,
      message: `ログインなしで使える生成上限（${GUEST_TOTAL_LIMIT}回）に達しました。GitHub ログインで月 ${USER_FREE_MONTHLY_LIMIT} 回まで使えます。`,
      code: "guest_limit",
    };
  }
  return { ok: true, useCredit: false };
}

export async function recordGuestUsage(ipHash: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("ip_usage_logs").insert({ ip_hash: ipHash });
  if (error) logError("rateLimit", "ip_usage_logs insert error", error);
}
