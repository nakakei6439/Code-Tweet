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

// ---------- 無料エンドポイント向けの粗いスロットル ----------
// 生成回数を消費しない補助 API（/api/appss/extract-info 等）が、無料の Gemini 呼び出しの
// 踏み台にされるのを防ぐための緩い上限。`ip_usage_logs` は使わない（そちらに記録すると
// ゲストの無料生成枠3回を補助機能が食い潰してしまうため）。
//
// プロセス内メモリで持つベストエフォート実装で、githubApp.ts の token キャッシュと同じ方針。
// Fluid Compute はインスタンスを再利用するが複数並走するため、実効上限は台数倍に緩む。
// 悪意ある無限ループを止めるのが目的で、厳密な課金ゲートではない。
export const FREE_ENDPOINT_WINDOW_MS = 60 * 1000;
export const FREE_ENDPOINT_MAX_HITS = 20;
// メモリ肥大を防ぐ上限。超えたら期限切れを掃除し、それでも溢れるなら最古から捨てる。
const FREE_ENDPOINT_MAX_KEYS = 10_000;

const freeEndpointHits = new Map<string, number[]>();

function pruneFreeEndpointHits(now: number): void {
  for (const [key, stamps] of freeEndpointHits) {
    const alive = stamps.filter((t) => now - t < FREE_ENDPOINT_WINDOW_MS);
    if (alive.length === 0) freeEndpointHits.delete(key);
    else freeEndpointHits.set(key, alive);
  }
  // 掃除しても上限を超える場合は、挿入順（= 古い順）に捨てる。
  while (freeEndpointHits.size > FREE_ENDPOINT_MAX_KEYS) {
    const oldest = freeEndpointHits.keys().next();
    if (oldest.done) break;
    freeEndpointHits.delete(oldest.value);
  }
}

/**
 * 無料エンドポイントの呼び出しを記録し、直近ウィンドウ内の上限に収まっていれば true を返す。
 * ipHash が取れない場合（ローカル実行など）は素通しする。
 */
export function allowFreeEndpointHit(ipHash: string | null): boolean {
  if (!ipHash) return true;
  const now = Date.now();

  if (freeEndpointHits.size >= FREE_ENDPOINT_MAX_KEYS) pruneFreeEndpointHits(now);

  const stamps = (freeEndpointHits.get(ipHash) ?? []).filter(
    (t) => now - t < FREE_ENDPOINT_WINDOW_MS,
  );
  if (stamps.length >= FREE_ENDPOINT_MAX_HITS) {
    freeEndpointHits.set(ipHash, stamps);
    return false;
  }
  stamps.push(now);
  freeEndpointHits.set(ipHash, stamps);
  return true;
}

// テスト用。プロセス内状態を初期化する。
export function resetFreeEndpointHits(): void {
  freeEndpointHits.clear();
}
