import {
  APPSS_DEFAULT_SLIDES,
  APPSS_MAX_SLIDES,
  APPSS_MIN_SLIDES,
  generateAppSSCopy,
} from "@/lib/geminiAppSS";
import { logError } from "@/lib/logger";
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
  AppSSCopyErrorResponse,
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

function fieldError(field: AppSSCopyErrorField, error: string, status = 400): Response {
  return Response.json({ error, field } satisfies AppSSCopyErrorResponse, { status });
}

function validateRequest(body: AppSSCopyRequest): Response | null {
  if (!body.appName?.trim()) {
    return fieldError("appName", "アプリ名を入力してください。");
  }
  if (body.appName.length > MAX_APP_NAME_LENGTH) {
    return fieldError("appName", `アプリ名は ${MAX_APP_NAME_LENGTH} 文字以内にしてください。`);
  }
  if (!body.appDescription?.trim()) {
    return fieldError("appDescription", "アプリの説明を入力してください。");
  }
  if (body.appDescription.length > MAX_DESCRIPTION_LENGTH) {
    return fieldError(
      "appDescription",
      `アプリの説明は ${MAX_DESCRIPTION_LENGTH.toLocaleString("ja-JP")} 文字以内にしてください。`,
    );
  }
  if (!Array.isArray(body.features ?? [])) {
    return fieldError("features", "機能リストの形式が不正です。");
  }
  if ((body.features ?? []).length > MAX_FEATURES) {
    return fieldError("features", `機能・特徴は ${MAX_FEATURES} 件以内にしてください。`);
  }
  if ((body.features ?? []).some((f) => typeof f !== "string" || f.length > MAX_FEATURE_LENGTH)) {
    return fieldError("features", `各機能・特徴は ${MAX_FEATURE_LENGTH} 文字以内にしてください。`);
  }
  if ((body.tone ?? "").length > MAX_TONE_LENGTH) {
    return fieldError("tone", `トーン指示は ${MAX_TONE_LENGTH} 文字以内にしてください。`);
  }
  return null;
}

function mapGeminiError(err: unknown): { message: string; status: number } {
  const raw = err instanceof Error ? err.message : "";
  logError("appss-copy", "Gemini API error", err);

  if (/スライド案を生成できませんでした/.test(raw)) {
    return { message: raw, status: 500 };
  }
  if (/API key|API_KEY_INVALID|\b401\b|\b403\b/i.test(raw)) {
    return { message: "APIキーが無効です。Gemini APIキーを確認してください。", status: 401 };
  }
  if (/\b503\b|Service Unavailable|overloaded|high demand|UNAVAILABLE/i.test(raw)) {
    return { message: "Gemini API が混雑しています。少し時間をおいて再試行してください。", status: 503 };
  }
  if (/\b429\b|quota|rate limit|RESOURCE_EXHAUSTED/i.test(raw)) {
    return { message: "Gemini API の利用上限に達しました。少し時間をおいて再試行してください。", status: 429 };
  }
  if (/\b400\b|INVALID_ARGUMENT|safety/i.test(raw)) {
    return { message: "リクエスト内容に問題があります。アプリの説明を見直してください。", status: 400 };
  }
  if (/fetch failed|ENOTFOUND|ECONNRESET|timeout|network/i.test(raw)) {
    return { message: "Gemini API への接続に失敗しました。ネットワークを確認してください。", status: 502 };
  }
  return { message: "コピー生成に失敗しました。少し時間をおいて再試行してください。", status: 500 };
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "許可されていないリクエスト元です。" } satisfies AppSSCopyErrorResponse,
      { status: 403 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "現在サービスが利用できません。しばらくお待ちください。" } satisfies AppSSCopyErrorResponse,
      { status: 503 },
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = Number(contentLength);
    if (Number.isFinite(bytes) && bytes > MAX_REQUEST_BYTES) {
      return Response.json(
        { error: "リクエストが大きすぎます。入力内容を短くしてください。" } satisfies AppSSCopyErrorResponse,
        { status: 413 },
      );
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
      return Response.json(
        { error: limit.message, code: limit.code } satisfies AppSSCopyErrorResponse,
        { status: limit.status },
      );
    }
    useCredit = limit.useCredit;
  } else {
    const ip = getClientIp(request);
    if (!ip) {
      return Response.json(
        { error: "IP アドレスを特定できませんでした。" } satisfies AppSSCopyErrorResponse,
        { status: 400 },
      );
    }
    ipHash = hashIp(ip);
    const limit = await checkGuestLimit(ipHash);
    if (!limit.ok) {
      return Response.json(
        { error: limit.message, code: limit.code } satisfies AppSSCopyErrorResponse,
        { status: limit.status },
      );
    }
  }

  let body: AppSSCopyRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストが不正です。" } satisfies AppSSCopyErrorResponse, { status: 400 });
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
    const { message, status } = mapGeminiError(err);
    return Response.json({ error: message } satisfies AppSSCopyErrorResponse, { status });
  }
}
