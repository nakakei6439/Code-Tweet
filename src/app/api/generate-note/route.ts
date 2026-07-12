import { generateNoteDraft } from "@/lib/geminiNote";
import { logError } from "@/lib/logger";
import {
  DEFAULT_NOTE_LENGTH_PRESET,
  isNoteLengthPreset,
} from "@/lib/noteLengthPresets";
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
import { getSubscriptionTier } from "@/lib/subscription";
import { normalizeUrl } from "@/lib/urlCategory";
import {
  MAX_HASHTAGS_LENGTH,
  MAX_TONE_MEMO_LENGTH,
  MAX_URL_LENGTH,
  getProjectTextLimit,
} from "@/lib/generateLimits";
import type {
  GenerateErrorField,
  GenerateErrorResponse,
} from "@/types/tweet";
import type {
  GenerateNoteRequest,
  GenerateNoteResponse,
} from "@/types/note";
import type { UsageTier } from "@/types/usage";

export const runtime = "nodejs";
export const maxDuration = 60; // Hobby プランの関数実行上限（60 秒）をフルに使う

const MAX_REQUEST_BYTES = 256 * 1024;

function validateRequestSize(request: Request): Response | null {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return null;

  const bytes = Number(contentLength);
  if (Number.isFinite(bytes) && bytes > MAX_REQUEST_BYTES) {
    return Response.json(
      { error: "リクエストが大きすぎます。入力内容を短くしてください。" } satisfies GenerateErrorResponse,
      { status: 413 },
    );
  }

  return null;
}

function fieldError(field: GenerateErrorField, error: string, status = 400): Response {
  return Response.json({ error, field } satisfies GenerateErrorResponse, { status });
}

function validateNoteRequest(body: GenerateNoteRequest, tier: UsageTier): Response | null {
  const projectTextLimit = getProjectTextLimit(tier);

  if (!body.projectText?.trim()) {
    return fieldError("projectText", "プロジェクト説明を入力してください。");
  }

  if (body.projectText.length > projectTextLimit) {
    return fieldError("projectText", `現在のプランでは、プロジェクト説明は ${projectTextLimit.toLocaleString("ja-JP")} 文字以内にしてください。`);
  }
  if ((body.toneMemo ?? "").length > MAX_TONE_MEMO_LENGTH) {
    return fieldError("toneMemo", `追加プロンプトは ${MAX_TONE_MEMO_LENGTH.toLocaleString("ja-JP")} 文字以内にしてください。`);
  }
  if ((body.url ?? "").length > MAX_URL_LENGTH) {
    return fieldError("url", `URL は ${MAX_URL_LENGTH.toLocaleString("ja-JP")} 文字以内にしてください。`);
  }
  if ((body.hashtags ?? "").length > MAX_HASHTAGS_LENGTH) {
    return fieldError("hashtags", `ハッシュタグは ${MAX_HASHTAGS_LENGTH.toLocaleString("ja-JP")} 文字以内にしてください。`);
  }

  return null;
}

function mapGeminiError(err: unknown): { message: string; status: number } {
  const raw = err instanceof Error ? err.message : "";
  logError("generate-note", "Gemini API error", err);

  if (/note Draftを生成できませんでした/.test(raw)) {
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
    return { message: "リクエスト内容に問題があります。プロジェクト説明を見直してください。", status: 400 };
  }
  if (/fetch failed|ENOTFOUND|ECONNRESET|timeout|network/i.test(raw)) {
    return { message: "Gemini API への接続に失敗しました。ネットワークを確認してください。", status: 502 };
  }
  return { message: "note Draftの生成に失敗しました。少し時間をおいて再試行してください。", status: 500 };
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "許可されていないリクエスト元です。" } satisfies GenerateErrorResponse,
      { status: 403 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "現在サービスが利用できません。しばらくお待ちください。" } satisfies GenerateErrorResponse, { status: 503 });
  }

  const sizeError = validateRequestSize(request);
  if (sizeError) return sizeError;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let ipHash: string | null = null;
  let usageTier: UsageTier = "guest";
  if (user) {
    const tier = await getSubscriptionTier(user.id);
    usageTier = tier;
    const limit = await checkUserLimit(supabase, user.id, tier);
    if (!limit.ok) {
      return Response.json(
        { error: limit.message, code: limit.code } satisfies GenerateErrorResponse,
        { status: limit.status },
      );
    }
  } else {
    const ip = getClientIp(request);
    if (!ip) {
      return Response.json({ error: "IP アドレスを特定できませんでした。" } satisfies GenerateErrorResponse, { status: 400 });
    }
    ipHash = hashIp(ip);
    const limit = await checkGuestLimit(ipHash);
    if (!limit.ok) {
      return Response.json(
        { error: limit.message, code: limit.code } satisfies GenerateErrorResponse,
        { status: limit.status },
      );
    }
  }

  let body: GenerateNoteRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストが不正です。" } satisfies GenerateErrorResponse, { status: 400 });
  }

  const validationError = validateNoteRequest(body, usageTier);
  if (validationError) return validationError;

  const lengthPreset = isNoteLengthPreset(body.lengthPreset)
    ? body.lengthPreset
    : DEFAULT_NOTE_LENGTH_PRESET;

  try {
    const note = await generateNoteDraft(
      body.projectText,
      body.toneMemo ?? "",
      normalizeUrl(body.url ?? ""),
      body.hashtags ?? "",
      lengthPreset,
    );
    if (user) {
      await recordUserUsage(supabase, user.id);
    } else if (ipHash) {
      await recordGuestUsage(ipHash);
    }
    return Response.json({ note } satisfies GenerateNoteResponse, { status: 200 });
  } catch (err) {
    const { message, status } = mapGeminiError(err);
    return Response.json({ error: message } satisfies GenerateErrorResponse, { status });
  }
}
