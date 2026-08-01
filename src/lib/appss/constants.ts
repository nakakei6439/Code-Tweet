// AppSS — キャンバス寸法・書き出しサイズ・ベゼル座標・テーマ定義。
// Based on MIT-licensed https://github.com/ParthJadhav/app-store-screenshots

import type { BackgroundStyle, FontId, SlideLayout, Theme } from "./types";

// 設計キャンバス = App Store 最大要求解像度（iPhone 6.9インチ）
export const CANVAS = { w: 1320, h: 2868 };

// App Store 提出に必要な iPhone スクリーンショットサイズ
// label は持たず inches だけ持つ。表示は messages の appssEditor.inchLabel で組み立てる。
export type ExportSize = { inches: string; w: number; h: number };
export const EXPORT_SIZES: ExportSize[] = [
  { inches: "6.9", w: 1320, h: 2868 },
  { inches: "6.5", w: 1284, h: 2778 },
  { inches: "6.3", w: 1206, h: 2622 },
  { inches: "6.1", w: 1125, h: 2436 },
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
  rounded: { name: "M PLUS Rounded 1c", cssVar: "var(--font-appss-rounded)" },
  dela: { name: "Dela Gothic One", cssVar: "var(--font-appss-dela)" },
  shippori: { name: "Shippori Mincho", cssVar: "var(--font-appss-shippori)" },
  klee: { name: "Klee One", cssVar: "var(--font-appss-klee)" },
  rocknroll: { name: "RocknRoll One", cssVar: "var(--font-appss-rocknroll)" },
  kaku: { name: "Zen Kaku Gothic New", cssVar: "var(--font-appss-kaku)" },
};
export const DEFAULT_FONT_ID: FontId = "gothic";

// ---------- 日本語アプリ向けテーマ ----------
export const DEFAULT_THEME_ID = "simple-white";

export const THEMES: Record<string, Theme> = {
  "simple-white": {
    id: "simple-white",
    nameKey: "simpleWhite",
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
    nameKey: "pastel",
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
    nameKey: "darkNeon",
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
    nameKey: "washi",
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
    nameKey: "pop",
    bg: "#FEF3C7",
    bgAlt: "#1E3A8A",
    fg: "#1F2937",
    fgAlt: "#FEF9C3",
    accent: "#F97316",
    muted: "#92742A",
    fontId: "maru",
  },
  ocean: {
    id: "ocean",
    nameKey: "ocean",
    bg: "#F0F9FF",
    bgAlt: "#0C4A6E",
    fg: "#0C4A6E",
    fgAlt: "#F0F9FF",
    accent: "#0EA5E9",
    muted: "#64A0BE",
    fontId: "kaku",
  },
  forest: {
    id: "forest",
    nameKey: "forest",
    bg: "#F0FDF4",
    bgAlt: "#14532D",
    fg: "#14532D",
    fgAlt: "#F0FDF4",
    accent: "#16A34A",
    muted: "#6B9080",
    fontId: "rounded",
  },
  sunset: {
    id: "sunset",
    nameKey: "sunset",
    bg: "#FFF1F2",
    bgAlt: "#7C2D12",
    fg: "#7C2D12",
    fgAlt: "#FFF1F2",
    accent: "#FB7185",
    muted: "#C08776",
    fontId: "rounded",
  },
  mono: {
    id: "mono",
    nameKey: "mono",
    bg: "#FAFAFA",
    bgAlt: "#171717",
    fg: "#171717",
    fgAlt: "#FAFAFA",
    accent: "#404040",
    muted: "#8A8A8A",
    fontId: "gothic",
  },
  midnight: {
    id: "midnight",
    nameKey: "midnight",
    bg: "#0B1120",
    bgAlt: "#E0E7FF",
    fg: "#E0E7FF",
    fgAlt: "#0B1120",
    accent: "#818CF8",
    muted: "#94A3B8",
    fontId: "shippori",
  },
  mocha: {
    id: "mocha",
    nameKey: "mocha",
    bg: "#FAF3EB",
    bgAlt: "#3F2E22",
    fg: "#3F2E22",
    fgAlt: "#FAF3EB",
    accent: "#B45309",
    muted: "#9C8371",
    fontId: "klee",
  },
};

export function themeById(themeId: string | undefined): Theme {
  return THEMES[themeId || ""] || THEMES[DEFAULT_THEME_ID];
}

// ---------- AI 生成パレット（プリセットから選ぶのではなく都度生成） ----------
// AI がアプリ専用の配色を生成した場合の「疑似テーマ」id。プリセット THEMES には含めない。
export const AI_CUSTOM_THEME_ID = "ai-custom";

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// #rgb / #rrggbb のみ許可し #rrggbb 小文字へ正規化する。それ以外は undefined。
// AI 出力・保存データの両方をここに通し、CSS へ渡る色を安全な値だけに限定する。
export function sanitizeHex(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!HEX_RE.test(v)) return undefined;
  if (v.length === 4) {
    const [, r, g, b] = v;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return v.toLowerCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

// 2色を t(0..1) で線形補間。muted 色の自動導出などに使う。
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

// AI が返した配色(bg/fg/accent[/muted]) から完全な Theme を構築する。
// 反転背景 bgAlt / 反転前景 fgAlt は前景・背景を入れ替えて導出（既存プリセットと同じ関係）。
// 必須3色(bg/fg/accent)が有効な hex で揃わなければ undefined（＝プリセットへフォールバック）。
export function buildCustomTheme(
  palette: { bg?: unknown; fg?: unknown; accent?: unknown; muted?: unknown },
  fontId?: FontId,
): Theme | undefined {
  const bg = sanitizeHex(palette.bg);
  const fg = sanitizeHex(palette.fg);
  const accent = sanitizeHex(palette.accent);
  if (!bg || !fg || !accent) return undefined;
  const muted = sanitizeHex(palette.muted) ?? mixHex(fg, bg, 0.5);
  return {
    id: AI_CUSTOM_THEME_ID,
    nameKey: "aiCustom",
    bg,
    bgAlt: fg,
    fg,
    fgAlt: bg,
    accent,
    muted,
    ...(fontId ? { fontId } : {}),
  };
}

// 保存データ(localStorage / import zip)内の customTheme を検証・正規化する。
// 全色を sanitizeHex に通し、欠けた派生色は導出。必須3色が無ければ undefined。
export function sanitizeTheme(value: unknown): Theme | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<Theme>;
  const bg = sanitizeHex(raw.bg);
  const fg = sanitizeHex(raw.fg);
  const accent = sanitizeHex(raw.accent);
  if (!bg || !fg || !accent) return undefined;
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : AI_CUSTOM_THEME_ID,
    nameKey: typeof raw.nameKey === "string" && raw.nameKey.trim() ? raw.nameKey : "aiCustom",
    bg,
    bgAlt: sanitizeHex(raw.bgAlt) ?? fg,
    fg,
    fgAlt: sanitizeHex(raw.fgAlt) ?? bg,
    accent,
    muted: sanitizeHex(raw.muted) ?? mixHex(fg, bg, 0.5),
    ...(raw.fontId && raw.fontId in FONTS ? { fontId: raw.fontId } : {}),
  };
}

export const STORAGE_KEY = "code-tweet:appss:project:v1";
export const PROJECT_SCHEMA_VERSION = 1;

// スライド（＝スクリーンショット）の最大枚数。
// App Store の1機種あたり上限（10枚）より絞り、事前登録・スライド追加の両方に適用する。
// サーバ側の生成上限は geminiAppSS.ts の APPSS_MAX_SLIDES（同値）で別管理。
export const MAX_SLIDES = 6;

// ---------- 背景スタイル ----------
export const DEFAULT_BACKGROUND_STYLE: BackgroundStyle = "soft";

// vibe（Gemini に渡す雰囲気の説明）はプロンプト側の関心事なので geminiAppSS.ts に置いた。
export const BACKGROUND_STYLES: { id: BackgroundStyle; nameKey: string }[] = [
  { id: "soft", nameKey: "soft" },
  { id: "plain", nameKey: "plain" },
  { id: "grid", nameKey: "grid" },
  { id: "spotlight", nameKey: "spotlight" },
  { id: "stripes", nameKey: "stripes" },
];

export function isBackgroundStyle(v: unknown): v is BackgroundStyle {
  return BACKGROUND_STYLES.some((s) => s.id === v);
}

