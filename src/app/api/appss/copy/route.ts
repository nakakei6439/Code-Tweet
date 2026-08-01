import {
  APPSS_DEFAULT_SLIDES,
  APPSS_MAX_SLIDES,
  APPSS_MIN_SLIDES,
  generateAppSSCopy,
} from "@/lib/geminiAppSS";
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
import type {
  AppSSCopyErrorField,
  AppSSCopyRequest,
  AppSSCopyResponse,
} from "@/types/appss";

export const runtime = "nodejs";
export const maxDuration = 60;

// 入力が小さい機能なので generate(256KB) より絞る
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_APP_NAME_LENGTH = 50;
// 他機能（Pro の README 上限 10,000字）と統一。リクエスト 64KB 上限内に十分収まる。
const MAX_DESCRIPTION_LENGTH = 10000;
const MAX_FEATURES = 8;
const MAX_FEATURE_LENGTH = 100;
const MAX_TONE_LENGTH = 200;

function tooLong(field: AppSSCopyErrorField, limit: number): Response {
  return apiError("field_too_long", 400, { field, params: { limit } });
}

function validateRequest(body: AppSSCopyRequest): Response | null {
  if (!body.appName?.trim()) {
    return apiError("field_required", 400, { field: "appName" });
  }
  if (body.appName.length > MAX_APP_NAME_LENGTH) {
    return tooLong("appName", MAX_APP_NAME_LENGTH);
  }
  if (!body.appDescription?.trim()) {
    return apiError("field_required", 400, { field: "appDescription" });
  }
  if (body.appDescription.length > MAX_DESCRIPTION_LENGTH) {
    return tooLong("appDescription", MAX_DESCRIPTION_LENGTH);
  }
  if (!Array.isArray(body.features ?? [])) {
    return apiError("features_invalid", 400, { field: "features" });
  }
  if ((body.features ?? []).length > MAX_FEATURES) {
    return apiError("features_too_many", 400, { field: "features", params: { limit: MAX_FEATURES } });
  }
  if ((body.features ?? []).some((f) => typeof f !== "string" || f.length > MAX_FEATURE_LENGTH)) {
    return apiError("feature_too_long", 400, { field: "features", params: { limit: MAX_FEATURE_LENGTH } });
  }
  if ((body.tone ?? "").length > MAX_TONE_LENGTH) {
    return tooLong("tone", MAX_TONE_LENGTH);
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

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = Number(contentLength);
    if (Number.isFinite(bytes) && bytes > MAX_REQUEST_BYTES) {
      return apiError("payload_too_large", 413);
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let ipHash: string | null = null;
  let useCredit = false;
  if (user) {
    const entitlements = await getEntitlements(user.id, user.email);
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

  let body: AppSSCopyRequest;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_request", 400);
  }

  const validationError = validateRequest(body);
  if (validationError) return validationError;

  const slideCount = Math.min(
    APPSS_MAX_SLIDES,
    Math.max(APPSS_MIN_SLIDES, Math.trunc(body.slideCount ?? APPSS_DEFAULT_SLIDES)),
  );

  try {
    const { slides, recommendedThemeId, recommendedBackgroundStyle, generatedPalette } = await generateAppSSCopy(
      body.appName.trim(),
      body.appDescription.trim(),
      (body.features ?? []).map((f) => f.trim()).filter(Boolean),
      (body.tone ?? "").trim(),
      slideCount,
    );
    if (user) {
      await recordUserUsage(supabase, user.id);
      // 無料枠超過分のみ購入クレジットを消費（生成成功時のみ・fail-open）
      if (useCredit) {
        await consumeCredit(user.id);
      }
    } else if (ipHash) {
      await recordGuestUsage(ipHash);
    }
    return Response.json(
      { slides, recommendedThemeId, recommendedBackgroundStyle, generatedPalette } satisfies AppSSCopyResponse,
      { status: 200 },
    );
  } catch (err) {
    const { code, status } = mapGeminiError("appss-copy", err);
    return apiError(code, status);
  }
}
