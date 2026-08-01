// AppSS — 透かし解除書き出しの許可チェック＋クレジット消費専用エンドポイント。
// 画像データは一切やり取りしない（実際のPNG合成・zip化は引き続きクライアント側で行う）。
// gating ロジックは /api/appss/copy/route.ts と同じパターンを踏襲し、tweet生成・
// AppSSコピー生成と同じ月次無料枠＋クレジット残高の共有プールを消費する。
import { apiError } from "@/lib/apiErrors";
import { isSameOriginRequest } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import {
  checkGuestLimit,
  checkUserLimit,
  getClientIp,
  hashIp,
  recordGuestUsage,
  recordUserUsage,
} from "@/lib/rateLimit";
import { consumeCredit } from "@/lib/credits";
import { getEntitlements } from "@/lib/entitlements";
import type { AppSSExportUnlockResponse } from "@/types/appss";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return apiError("forbidden_origin", 403);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const entitlements = await getEntitlements(user.id, user.email);
    const limit = await checkUserLimit(supabase, user.id, entitlements);
    if (!limit.ok) {
      return apiError(limit.code, limit.status, { params: limit.params });
    }
    // 生成AI呼び出しが無いため成功は確定。無料枠超過分のみ購入クレジットを消費する。
    await recordUserUsage(supabase, user.id);
    if (limit.useCredit) {
      await consumeCredit(user.id);
    }
    return Response.json({ ok: true } satisfies AppSSExportUnlockResponse, { status: 200 });
  }

  const ip = getClientIp(request);
  if (!ip) {
    return apiError("ip_unavailable", 400);
  }
  const ipHash = hashIp(ip);
  const limit = await checkGuestLimit(ipHash);
  if (!limit.ok) {
    return apiError(limit.code, limit.status, { params: limit.params });
  }
  await recordGuestUsage(ipHash);
  return Response.json({ ok: true } satisfies AppSSExportUnlockResponse, { status: 200 });
}
