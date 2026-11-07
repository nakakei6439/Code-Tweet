import { logError } from "@/lib/logger";
import type { ApiErrorCode } from "@/lib/apiErrors";

/** Gemini の応答待ちが時間予算・タイムアウトで打ち切られたことを表す。混雑扱い（gemini_busy）で返す。 */
export class GeminiTimeoutError extends Error {
  constructor() {
    super("Gemini API の応答待ち時間が上限に達しました。もう一度お試しください。");
    this.name = "GeminiTimeoutError";
  }
}

// Gemini から返る雑多なエラーを、クライアントで訳せるコードに畳む。
// 以前は generate / generate-note / appss-copy の 3 ルートに同じ分岐が
// コピーされていたので、ここに集約した。
export function mapGeminiError(scope: string, err: unknown): { code: ApiErrorCode; status: number } {
  const raw = err instanceof Error ? err.message : "";
  logError(scope, "Gemini API error", err);

  if (err instanceof GeminiTimeoutError) {
    return { code: "gemini_busy", status: 503 };
  }
  if (/API key|API_KEY_INVALID|\b401\b|\b403\b/i.test(raw)) {
    return { code: "gemini_key_invalid", status: 401 };
  }
  if (/\b503\b|Service Unavailable|overloaded|high demand|UNAVAILABLE/i.test(raw)) {
    return { code: "gemini_busy", status: 503 };
  }
  if (/\b429\b|quota|rate limit|RESOURCE_EXHAUSTED/i.test(raw)) {
    return { code: "gemini_quota", status: 429 };
  }
  if (/\b400\b|INVALID_ARGUMENT|safety/i.test(raw)) {
    return { code: "gemini_bad_request", status: 400 };
  }
  if (/fetch failed|ENOTFOUND|ECONNRESET|timeout|network/i.test(raw)) {
    return { code: "gemini_network", status: 502 };
  }
  // 「5件のポストを生成できませんでした」等、パース段階で落ちたケースも含む。
  return { code: "generation_failed", status: 500 };
}
