import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const GUEST_DAILY_LIMIT = 5;
export const USER_DAILY_LIMIT = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; status: 429; message: string };

function getDayWindowStart(): string {
  return new Date(Date.now() - DAY_MS).toISOString();
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
): Promise<RateLimitResult> {
  const { count, error } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("generated_at", getDayWindowStart());

  if (error) {
    console.error("[rateLimit] usage_logs count error:", error);
    return { ok: true };
  }

  if ((count ?? 0) >= USER_DAILY_LIMIT) {
    return {
      ok: false,
      status: 429,
      message: `1日の生成上限（${USER_DAILY_LIMIT}回）に達しました。明日また試してください。`,
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
    .gte("generated_at", getDayWindowStart());

  if (error) {
    console.error("[rateLimit] ip_usage_logs count error:", error);
    return { ok: true };
  }

  if ((count ?? 0) >= GUEST_DAILY_LIMIT) {
    return {
      ok: false,
      status: 429,
      message: `1日の生成上限（${GUEST_DAILY_LIMIT}回）に達しました。Google ログインで上限が ${USER_DAILY_LIMIT} 回まで拡張されます。`,
    };
  }
  return { ok: true };
}

export async function recordGuestUsage(ipHash: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("ip_usage_logs").insert({ ip_hash: ipHash });
  if (error) console.error("[rateLimit] ip_usage_logs insert error:", error);
}
