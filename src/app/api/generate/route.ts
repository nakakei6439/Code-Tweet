import { generateTweets } from "@/lib/gemini";
import { apiError } from "@/lib/apiErrors";
import { mapGeminiError } from "@/lib/geminiErrors";
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
import { normalizeUrl } from "@/lib/urlCategory";
import { recordTweetGeneration } from "@/lib/generationHistory";
import {
  MAX_HASHTAGS_LENGTH,
  MAX_TONE_MEMO_LENGTH,
  MAX_URL_LENGTH,
  getProjectTextLimit,
} from "@/lib/generateLimits";
import type { GenerateRequest, GenerateResponse, GenerateErrorField } from "@/types/tweet";
import type { UsageTier } from "@/types/usage";

export const runtime = "nodejs";
export const maxDuration = 60; // Hobby プランの関数実行上限（60 秒）をフルに使う

const MAX_REQUEST_BYTES = 256 * 1024;

function validateRequestSize(request: Request): Response | null {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return null;

  const bytes = Number(contentLength);
  if (Number.isFinite(bytes) && bytes > MAX_REQUEST_BYTES) {
    return apiError("payload_too_large", 413);
  }

  return null;
}

function tooLong(field: GenerateErrorField, limit: number): Response {
  return apiError("field_too_long", 400, { field, params: { limit } });
}

function validateGenerateRequest(body: GenerateRequest, tier: UsageTier): Response | null {
  const projectTextLimit = getProjectTextLimit(tier);

  if (!body.projectText?.trim()) {
    return apiError("field_required", 400, { field: "projectText" });
  }

  if (body.projectText.length > projectTextLimit) {
    return tooLong("projectText", projectTextLimit);
  }
  if ((body.toneMemo ?? "").length > MAX_TONE_MEMO_LENGTH) {
    return tooLong("toneMemo", MAX_TONE_MEMO_LENGTH);
  }
  if ((body.url ?? "").length > MAX_URL_LENGTH) {
    return tooLong("url", MAX_URL_LENGTH);
  }
  if ((body.hashtags ?? "").length > MAX_HASHTAGS_LENGTH) {
    return tooLong("hashtags", MAX_HASHTAGS_LENGTH);
  }

  return null;
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return apiError("forbidden_origin", 403);
  }

  if (!process.env.GEMINI_API_KEY) {
    return apiError("service_unavailable", 503);
  }

  const sizeError = validateRequestSize(request);
  if (sizeError) return sizeError;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let ipHash: string | null = null;
  let usageTier: UsageTier = "guest";
  let useCredit = false;
  if (user) {
    const entitlements = await getEntitlements(user.id, user.email);
    // 文字数上限・履歴保存は perk 判定（サブスク / 管理者 / クレジット残高あり）に従う。
    usageTier = entitlements.perkTier;
    const limit = await checkUserLimit(supabase, user.id, entitlements);
    if (!limit.ok) {
      return apiError(limit.code, limit.status, { params: limit.params });
    }
    useCredit = limit.useCredit;
  } else {
    const ip = getClientIp(request);
    if (!ip) {
      return apiError("ip_unavailable", 400);
    }
    ipHash = hashIp(ip);
    const limit = await checkGuestLimit(ipHash);
    if (!limit.ok) {
      return apiError(limit.code, limit.status, { params: limit.params });
    }
  }

  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_request", 400);
  }

  const validationError = validateGenerateRequest(body, usageTier);
  if (validationError) return validationError;

  const url = normalizeUrl(body.url ?? "");

  try {
    const tweets = await generateTweets(body.projectText, body.toneMemo ?? "", url, body.hashtags ?? "");
    if (user) {
      await recordUserUsage(supabase, user.id);
      // 無料枠超過分のみ購入クレジットを消費（生成成功時のみ）。
      // 失敗しても生成結果は返す（既存の fail-open 方針に合わせる）。
      if (useCredit) {
        await consumeCredit(user.id);
      }
      if (usageTier === "paid") {
        await recordTweetGeneration(user.id, tweets, url, body.hashtags ?? "");
      }
    } else if (ipHash) {
      await recordGuestUsage(ipHash);
    }
    return Response.json({ tweets } satisfies GenerateResponse, { status: 200 });
  } catch (err) {
    const { code, status } = mapGeminiError("generate", err);
    return apiError(code, status);
  }
}
