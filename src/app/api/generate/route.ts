import { generateTweets } from "@/lib/gemini";
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
import type { GenerateRequest, GenerateResponse, GenerateErrorResponse } from "@/types/tweet";

function mapGeminiError(err: unknown): { message: string; status: number } {
  const raw = err instanceof Error ? err.message : "";
  console.error("[generate] Gemini API error:", err);

  if (/5件のポストを生成できませんでした/.test(raw)) {
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
  return { message: "ポスト生成に失敗しました。少し時間をおいて再試行してください。", status: 500 };
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "現在サービスが利用できません。しばらくお待ちください。" } satisfies GenerateErrorResponse, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let ipHash: string | null = null;
  if (user) {
    const tier = await getSubscriptionTier(user.id);
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

  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストが不正です。" } satisfies GenerateErrorResponse, { status: 400 });
  }

  if (!body.projectText?.trim()) {
    return Response.json({ error: "プロジェクト説明を入力してください。" } satisfies GenerateErrorResponse, { status: 400 });
  }

  try {
    const tweets = await generateTweets(body.projectText, body.toneMemo ?? "", body.url ?? "", body.hashtags ?? "");
    if (user) {
      await recordUserUsage(supabase, user.id);
    } else if (ipHash) {
      await recordGuestUsage(ipHash);
    }
    return Response.json({ tweets } satisfies GenerateResponse, { status: 200 });
  } catch (err) {
    const { message, status } = mapGeminiError(err);
    return Response.json({ error: message } satisfies GenerateErrorResponse, { status });
  }
}
