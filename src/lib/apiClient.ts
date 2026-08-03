import { isApiErrorCode } from "@/lib/apiErrors";
import type { GenerateErrorResponse } from "@/types/tweet";

export type PostJsonOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; error: GenerateErrorResponse };

type PostJsonOptions = {
  /** リクエスト全体のタイムアウト（ミリ秒）。サーバの 60 秒上限より少し長く取る。 */
  timeoutMs?: number;
  /** 429 / 503 のときに自動リトライする最大回数。 */
  maxRetries?: number;
};

const DEFAULT_TIMEOUT_MS = 65_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 503]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 504 / 502 などはサーバが JSON ではなく HTML を返すため、res.json() が throw する。
// text() で受けてから安全に JSON 解釈し、失敗時はステータスに応じた既定メッセージを返す。
async function parseErrorBody(res: Response): Promise<GenerateErrorResponse> {
  // サーバーが JSON を返せなかったとき用。ステータスから素性を推測してコードに畳む。
  const fallback = (): GenerateErrorResponse => {
    if (res.status === 504 || res.status === 502) return { code: "timeout" };
    if (res.status === 503) return { code: "server_busy" };
    if (res.status === 429) return { code: "rate_limited" };
    return { code: "unknown" };
  };
  try {
    const text = await res.text();
    if (!text) return fallback();
    const data = JSON.parse(text) as GenerateErrorResponse;
    return isApiErrorCode(data.code) ? data : fallback();
  } catch {
    return fallback();
  }
}

/**
 * 同一オリジンの API Route に JSON を POST する。
 * - AbortController でタイムアウトを設ける（無限待機を防ぐ）
 * - 429 / 503 は指数バックオフで自動リトライ
 * - 504 等の非 JSON 応答も安全に解釈し、適切なエラーメッセージを返す
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  options: PostJsonOptions = {},
): Promise<PostJsonOutcome<T>> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES } = options;

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = (await res.json()) as T;
        return { ok: true, data };
      }

      // 一時的なエラーはバックオフして再試行
      if (RETRYABLE_STATUS.has(res.status) && attempt < maxRetries) {
        await sleep(1_000 * 2 ** attempt);
        continue;
      }

      return { ok: false, error: await parseErrorBody(res) };
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (isAbort) {
        return {
          ok: false,
          error: { code: "timeout" },
        };
      }
      // ネットワーク断などはリトライ余地があれば再試行
      if (attempt < maxRetries) {
        await sleep(1_000 * 2 ** attempt);
        continue;
      }
      return {
        ok: false,
        error: { code: "network" },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
