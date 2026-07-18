// AppSS — キャンバス寸法・書き出しサイズ・ベゼル座標・テーマ定義。
// Based on MIT-licensed https://github.com/ParthJadhav/app-store-screenshots

import type { BackgroundStyle, FontId, SlideLayout, Theme } from "./types";

// 設計キャンバス = App Store 最大要求解像度（iPhone 6.9インチ）
export const CANVAS = { w: 1320, h: 2868 };

// App Store 提出に必要な iPhone スクリーンショットサイズ
export type ExportSize = { label: string; w: number; h: number };
export const EXPORT_SIZES: ExportSize[] = [
  { label: "6.9インチ", w: 1320, h: 2868 },
  { label: "6.5インチ", w: 1284, h: 2778 },
  { label: "6.3インチ", w: 1206, h: 2622 },
  { label: "6.1インチ", w: 1125, h: 2436 },
];

// Apple Design Resources 公式 Product Bezel (iPhone 16 Pro Max, Portrait)。
// public/appss/bezel-iphone.png : 1470×3000、画面開口部は実測値。
// 画面領域はネイティブ解像度 1320×2868 と 1:1 で一致する。
export const BEZEL = {
  src: "/appss/bezel-iphone.png",
  w: 1470,
  h: 3000,
  screen: { x: 75, y: 66, w: 1320, h: 2868, radius: 180 },
};
export const BEZEL_RATIO = BEZEL.w / BEZEL.h;

// レイアウト内でのデバイス幅（キャンバス幅比）
export function phoneW(cW: number, cH: number, clamp = 0.84) {
  return Math.min(clamp, 0.72 * (cH / cW) * BEZEL_RATIO);
}
export function phoneWSmall(cW: number, cH: number) {
  return phoneW(cW, cH, 0.66);
}

// ---------- 日本語フォント ----------
export const FONTS: Record<FontId, { name: string; cssVar: string }> = {
  gothic: { name: "Noto Sans JP", cssVar: "var(--font-appss-gothic)" },
  maru: { name: "Zen Maru Gothic", cssVar: "var(--font-appss-maru)" },
  mincho: { name: "Noto Serif JP", cssVar: "var(--font-appss-mincho)" },
};
export const DEFAULT_FONT_ID: FontId = "gothic";

// ---------- 日本語アプリ向けテーマ ----------
export const DEFAULT_THEME_ID = "simple-white";

export const THEMES: Record<string, Theme> = {
  "simple-white": {
    id: "simple-white",
    name: "シンプル白",
    bg: "#F8FAFC",
    bgAlt: "#0F172A",
    fg: "#0F172A",
    fgAlt: "#F8FAFC",
    accent: "#2563EB",
    muted: "#64748B",
    fontId: "gothic",
  },
  pastel: {
    id: "pastel",
    name: "パステル",
    bg: "#FDF2F8",
    bgAlt: "#4C1D4B",
    fg: "#50314C",
    fgAlt: "#FDF2F8",
    accent: "#EC4899",
    muted: "#9D7C99",
    fontId: "maru",
  },
  "dark-neon": {
    id: "dark-neon",
    name: "ダークネオン",
    bg: "#030712",
    bgAlt: "#F9FAFB",
    fg: "#F9FAFB",
    fgAlt: "#030712",
    accent: "#22D3EE",
    muted: "#9CA3AF",
    fontId: "gothic",
  },
  washi: {
    id: "washi",
    name: "和紙",
    bg: "#F5F0E6",
    bgAlt: "#2D2A24",
    fg: "#3B372F",
    fgAlt: "#F5F0E6",
    accent: "#C0392B",
    muted: "#8A8375",
    fontId: "mincho",
  },
  pop: {
    id: "pop",
    name: "ポップ",
    bg: "#FEF3C7",
    bgAlt: "#1E3A8A",
    fg: "#1F2937",
    fgAlt: "#FEF9C3",
    accent: "#F97316",
    muted: "#92742A",
    fontId: "maru",
  },
};

export function themeById(themeId: string | undefined): Theme {
  return THEMES[themeId || ""] || THEMES[DEFAULT_THEME_ID];
}

export const STORAGE_KEY = "code-tweet:appss:project:v1";
export const PROJECT_SCHEMA_VERSION = 1;

// スライド（＝スクリーンショット）の最大枚数。
// App Store の1機種あたり上限（10枚）より絞り、事前登録・スライド追加の両方に適用する。
// サーバ側の生成上限は geminiAppSS.ts の APPSS_MAX_SLIDES（同値）で別管理。
export const MAX_SLIDES = 6;

// ---------- 背景スタイル ----------
export const DEFAULT_BACKGROUND_STYLE: BackgroundStyle = "soft";

export const BACKGROUND_STYLES: { id: BackgroundStyle; name: string; vibe: string }[] = [
  { id: "soft", name: "ソフト光彩", vibe: "やわらかい光のにじみ。万能・親しみ" },
  { id: "plain", name: "無地グラデ", vibe: "装飾なしの上品なグラデ。ミニマル/ビジネス" },
  { id: "grid", name: "ドットグリッド", vibe: "細かなドット格子。テック/ツール/整然" },
  { id: "spotlight", name: "スポットライト", vibe: "上部からの光。プロダクトを主役に演出" },
  { id: "stripes", name: "斜めストライプ", vibe: "動きのある斜め帯。ポップ/エンタメ/元気" },
];

export function isBackgroundStyle(v: unknown): v is BackgroundStyle {
  return BACKGROUND_STYLES.some((s) => s.id === v);
}

export const LAYOUT_LABEL: Record<SlideLayout, string> = {
  hero: "ヒーロー",
  "device-bottom": "デバイス下",
  "device-top": "デバイス上",
  "two-devices": "2台重ね",
  "no-device": "見出しのみ",
};

export const LAYOUT_HINT: Record<SlideLayout, string> = {
  hero: "大見出し + 下部にデバイス",
  "device-bottom": "小さめ見出し + 下部デバイス",
  "device-top": "デバイスを上に（リズム変化用）",
  "two-devices": "前後2画面を重ねて表示",
  "no-device": "デバイス無しの大見出し",
};
