import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALE_IDS } from "@/lib/locales";

// localePrefix: "as-needed" — 既定ロケール（日本語）は現行 URL のまま（/, /about, /pricing …）で、
// 他言語だけ /en/... のようにパスが生える。既存の日本語 URL の SEO を壊さないための選択。
// cookie / accept-language だけの出し分けは検索エンジンにインデックスされないため使わない。
export const routing = defineRouting({
  locales: LOCALE_IDS,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  // hreflang を Link ヘッダで出す（多言語ページを検索エンジンに紐付ける）
  alternateLinks: true,
});
