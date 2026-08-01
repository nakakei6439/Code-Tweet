// AppSS — トップページ「READMEからスクショを作る」フォーム用の軽量アプリ情報推定エンドポイント。
// README読み込み直後に自動で呼ばれ、「アプリ名」欄を仮入力するほか、アプリの説明・主な機能を
// 推定して返す（/appss エディタの「AIコピー＆デザイン生成」パネルの初期値としてハンドオフ経由で使う）。
// /api/appss/copy（スライド生成・1回消費）とは完全に別で、利用回数制限・クレジット消費は無い
// （README取得の /api/github と同じ「無制限・無料」の扱いに合わせている）。
// 補助機能のため、失敗しても例外を投げず null/空配列で返し、フォームを止めない。
import { apiError } from "@/lib/apiErrors";
import { extractAppSSInfo } from "@/lib/geminiAppSS";
import { MAX_README_BYTES } from "@/lib/githubReadme";
import { logError } from "@/lib/logger";
import { isSameOriginRequest } from "@/lib/origin";
import { allowFreeEndpointHit, getClientIp, hashIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 15;

function emptyResponse(): Response {
  return Response.json({ appName: null, appDescription: null, features: [] }, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return apiError("forbidden_origin", 403);
  }

  if (!process.env.GEMINI_API_KEY) {
    return emptyResponse();
  }

  // 回数消費のない補助 API なので、無料 Gemini 呼び出しの踏み台にされないよう
  // IP 単位の粗いスロットルだけかける（ゲストの生成枠は消費しない）。
  const ip = getClientIp(request);
  if (!allowFreeEndpointHit(ip ? hashIp(ip) : null)) {
    return apiError("too_many_requests", 429);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = Number(contentLength);
    if (Number.isFinite(bytes) && bytes > MAX_README_BYTES) {
      return emptyResponse();
    }
  }

  let body: { readme?: string };
  try {
    body = await request.json();
  } catch {
    return emptyResponse();
  }

  const readme = (body.readme ?? "").trim();
  if (!readme) {
    return emptyResponse();
  }

  try {
    const info = await extractAppSSInfo(readme);
    return Response.json(
      {
        appName: info.appName ?? null,
        appDescription: info.appDescription ?? null,
        features: info.features,
      },
      { status: 200 },
    );
  } catch (err) {
    logError("appss-extract-info", "info extraction failed", err);
    // 補助機能なので失敗してもフォームを止めない（ユーザーが手入力すればよい）
    return emptyResponse();
  }
}
