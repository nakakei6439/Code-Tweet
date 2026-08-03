// API が返すエラーの識別子。
//
// Route Handler は [locale] の外にあり、リクエストからユーザーの表示言語を
// 確実に決められない。そこでサーバーは「何が起きたか」をコードで返すだけにし、
// 文言の解決はクライアント側（messages の apiErrors 名前空間）に一本化する。
// 既存の guest_limit / free_limit / paid_limit と同じ仕組みを全エラーに広げたもの。

export const API_ERROR_CODES = [
  // 共通
  "forbidden_origin",
  "service_unavailable",
  "payload_too_large",
  "invalid_request",
  "ip_unavailable",
  "login_required",
  "too_many_requests",
  "unknown",
  // 通信（クライアント側で付ける）
  "timeout",
  "server_busy",
  "rate_limited",
  "network",
  // 利用上限
  "guest_limit",
  "free_limit",
  "paid_limit",
  // 入力検証
  "field_required",
  "field_too_long",
  "features_invalid",
  "features_too_many",
  "feature_too_long",
  // Gemini
  "gemini_key_invalid",
  "gemini_busy",
  "gemini_quota",
  "gemini_bad_request",
  "gemini_network",
  "generation_failed",
  // GitHub
  "repo_url_required",
  "readme_fetch_failed",
  "readme_not_found",
  "readme_too_large",
  "github_app_not_connected",
  "github_app_invalid",
  "private_repo_paid_only",
  "repo_not_accessible",
  "github_connect_failed",
  "repos_fetch_failed",
  // Stripe
  "stripe_not_configured",
  "pack_not_found",
  "plan_fetch_failed",
  "checkout_failed",
  "portal_failed",
  "billing_not_found",
  // アカウント削除
  "confirm_required",
  "confirm_mismatch",
  "subscription_active",
  "delete_failed",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** 文言に埋め込む値（文字数上限など）。翻訳側で {limit} などとして参照する。 */
export type ApiErrorParams = Record<string, string | number>;

export type ApiErrorBody = {
  code: ApiErrorCode;
  /** 入力検証エラーのとき、どのフィールドが原因か */
  field?: string;
  params?: ApiErrorParams;
};

/** Route Handler から返すエラーレスポンスを組み立てる。 */
export function apiError(
  code: ApiErrorCode,
  status: number,
  options: { field?: string; params?: ApiErrorParams } = {},
): Response {
  const body: ApiErrorBody = { code };
  if (options.field) body.field = options.field;
  if (options.params) body.params = options.params;
  return Response.json(body, { status });
}

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && (API_ERROR_CODES as readonly string[]).includes(value);
}
