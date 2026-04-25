import { generateTweets } from "@/lib/gemini";
import type { GenerateRequest, GenerateResponse, GenerateErrorResponse } from "@/types/tweet";

export async function POST(request: Request): Promise<Response> {
  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストが不正です。" } satisfies GenerateErrorResponse, { status: 400 });
  }

  if (!body.projectText?.trim()) {
    return Response.json({ error: "プロジェクト説明を入力してください。" } satisfies GenerateErrorResponse, { status: 400 });
  }
  if (!body.apiKey?.trim()) {
    return Response.json({ error: "Gemini APIキーを入力してください。" } satisfies GenerateErrorResponse, { status: 400 });
  }

  try {
    const tweets = await generateTweets(body.projectText, body.toneMemo ?? "", body.apiKey);
    return Response.json({ tweets } satisfies GenerateResponse, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "予期しないエラーが発生しました。";
    const isAuthError = message.includes("API key") || message.includes("401") || message.includes("403");
    return Response.json(
      { error: isAuthError ? "APIキーが無効です。Gemini APIキーを確認してください。" : message } satisfies GenerateErrorResponse,
      { status: isAuthError ? 401 : 500 }
    );
  }
}
