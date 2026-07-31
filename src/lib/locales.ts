// 対応ロケールの単一の source of truth。
// UI 翻訳（Phase 1）・App SS の多言語スクショ（Phase 2）・X ポストの多言語生成（Phase 3）が
// すべてこの定義を参照する。言語を足すときはここだけを直せばよい状態を保つこと。

export const LOCALE_IDS = ["ja", "en", "es", "zh-Hans", "zh-Hant", "fr", "de", "ko"] as const;

export type LocaleId = (typeof LOCALE_IDS)[number];

// 日本語は既存 URL を変えない（localePrefix: "as-needed" の既定ロケール）。
export const DEFAULT_LOCALE: LocaleId = "ja";

// 文字体系。App SS のフォント選択と、生成コピーの文字数見積もりに使う。
// latin 以外は専用フォントを当てないと豆腐（□）になる。
export type LocaleScript = "jp" | "sc" | "tc" | "kr" | "latin";

export type LocaleDef = {
  id: LocaleId;
  /** <html lang> と hreflang に入れる BCP47 タグ */
  bcp47: string;
  /** OGP の og:locale */
  ogpLocale: string;
  /** 言語スイッチャーに出す自言語表記 */
  nativeName: string;
  /** ログ・管理画面用の英語表記 */
  englishName: string;
  script: LocaleScript;
  /** Gemini プロンプトに埋める言語名（英語表記のほうが指示が安定する） */
  promptName: string;
  /**
   * X（旧 Twitter）が主要市場で遮断されているか。
   * 簡体字中国語のみ true（中国本土は 2009 年から遮断）。生成自体は許可し、
   * 投稿先が限られることを UI で注記する用途に使う。
   */
  xBlockedInPrimaryMarket: boolean;
  /**
   * /terms・/privacy をこのロケールで用意しているか。
   * false のロケールは英語版を表示して注記を出す（法務文書の 8 言語維持は
   * 保守コストと誤訳リスクに見合わないという判断）。
   */
  hasLegalTranslation: boolean;
};

export const LOCALES: Record<LocaleId, LocaleDef> = {
  ja: {
    id: "ja",
    bcp47: "ja",
    ogpLocale: "ja_JP",
    nativeName: "日本語",
    englishName: "Japanese",
    script: "jp",
    promptName: "Japanese",
    xBlockedInPrimaryMarket: false,
    hasLegalTranslation: true,
  },
  en: {
    id: "en",
    bcp47: "en",
    ogpLocale: "en_US",
    nativeName: "English",
    englishName: "English",
    script: "latin",
    promptName: "English",
    xBlockedInPrimaryMarket: false,
    hasLegalTranslation: true,
  },
  es: {
    id: "es",
    bcp47: "es",
    ogpLocale: "es_ES",
    nativeName: "Español",
    englishName: "Spanish",
    script: "latin",
    promptName: "Spanish",
    xBlockedInPrimaryMarket: false,
    hasLegalTranslation: false,
  },
  "zh-Hans": {
    id: "zh-Hans",
    bcp47: "zh-Hans",
    ogpLocale: "zh_CN",
    nativeName: "简体中文",
    englishName: "Simplified Chinese",
    script: "sc",
    promptName: "Simplified Chinese",
    // 中国本土では X が遮断されている。App Store は利用可能なため App SS では主要言語。
    xBlockedInPrimaryMarket: true,
    hasLegalTranslation: false,
  },
  "zh-Hant": {
    id: "zh-Hant",
    bcp47: "zh-Hant",
    ogpLocale: "zh_TW",
    nativeName: "繁體中文",
    englishName: "Traditional Chinese",
    script: "tc",
    promptName: "Traditional Chinese",
    xBlockedInPrimaryMarket: false,
    hasLegalTranslation: false,
  },
  fr: {
    id: "fr",
    bcp47: "fr",
    ogpLocale: "fr_FR",
    nativeName: "Français",
    englishName: "French",
    script: "latin",
    promptName: "French",
    xBlockedInPrimaryMarket: false,
    hasLegalTranslation: false,
  },
  de: {
    id: "de",
    bcp47: "de",
    ogpLocale: "de_DE",
    nativeName: "Deutsch",
    englishName: "German",
    script: "latin",
    promptName: "German",
    xBlockedInPrimaryMarket: false,
    hasLegalTranslation: false,
  },
  ko: {
    id: "ko",
    bcp47: "ko",
    ogpLocale: "ko_KR",
    nativeName: "한국어",
    englishName: "Korean",
    script: "kr",
    promptName: "Korean",
    xBlockedInPrimaryMarket: false,
    hasLegalTranslation: false,
  },
};

export const LOCALE_LIST: LocaleDef[] = LOCALE_IDS.map((id) => LOCALES[id]);

export function isLocaleId(value: unknown): value is LocaleId {
  return typeof value === "string" && (LOCALE_IDS as readonly string[]).includes(value);
}

/** 未知の値を既定ロケールに丸める。ルーティングやハンドオフの入口で使う。 */
export function toLocaleId(value: unknown): LocaleId {
  return isLocaleId(value) ? value : DEFAULT_LOCALE;
}

/** 法務ページを表示するロケール。翻訳が無ければ英語版にフォールバックする。 */
export function legalLocaleFor(locale: LocaleId): LocaleId {
  return LOCALES[locale].hasLegalTranslation ? locale : "en";
}

/**
 * パスにロケール接頭辞を付ける（既定ロケールは接頭辞なし = localePrefix: "as-needed"）。
 * next-intl の Link/redirect が使えない場所（OAuth の redirectTo、form の action など）で使う。
 */
export function localePath(locale: LocaleId, pathname = "/"): string {
  if (locale === DEFAULT_LOCALE) return pathname;
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}

const LOCALE_PREFIX_RE = new RegExp(`^/(?:${LOCALE_IDS.join("|")})(?=/|$)`);

/**
 * ロケール接頭辞を取り除いたパス。/en/admin → /admin、/admin → /admin。
 * proxy が管理画面ゲートと OAuth 救済を判定するのに使う。ここが崩れると
 * /en/admin が認証を素通りするため、境界はテストで固定している。
 */
export function stripLocale(pathname: string): string {
  const stripped = pathname.replace(LOCALE_PREFIX_RE, "");
  return stripped === "" ? "/" : stripped;
}
