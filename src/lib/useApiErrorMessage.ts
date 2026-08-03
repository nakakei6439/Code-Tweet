"use client";

import { useTranslations } from "next-intl";
import { isApiErrorCode, type ApiErrorBody } from "@/lib/apiErrors";

/**
 * API が返したエラーコードを、現在のロケールの文言に解決する。
 *
 * サーバーはコードとパラメータだけを返し、文言はここで一元的に組み立てる
 * （Route Handler は [locale] の外にあり、表示言語を確実に決められないため）。
 * 未知のコードや code 無しのレスポンスは unknown にフォールバックする。
 */
export function useApiErrorMessage() {
  const t = useTranslations("apiErrors");
  const tField = useTranslations("apiErrorFields");

  return function resolve(body: Partial<ApiErrorBody> | null | undefined): string {
    const code = body?.code;
    if (!isApiErrorCode(code)) return t("unknown");

    const params: Record<string, string | number> = { ...(body?.params ?? {}) };
    // field_required / field_too_long は項目名を文中に埋め込む。
    if (body?.field) {
      params.field = tField.has(body.field) ? tField(body.field) : body.field;
    }
    return t(code, params);
  };
}
