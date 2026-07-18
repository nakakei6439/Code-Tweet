import type { GenerateErrorCode } from "./tweet";
import type { SlideLayout } from "@/lib/appss/types";

export interface AppSSCopyRequest {
  appName: string;
  appDescription: string;
  features: string[];
  tone?: string;
  slideCount?: number;
}

export interface AppSSCopySlideIdea {
  label: string;
  headline: string;
  layoutHint: SlideLayout;
  // 見出し内で強調する語句（headline の部分文字列）
  emphasis?: string;
}

// AI がアプリ専用に生成した配色パレット（プリセットから選ぶのではなく都度生成）。
// bg/fg/accent は #rrggbb。muted は任意（欠けても自動導出）。
export interface GeneratedPalette {
  bg: string;
  fg: string;
  accent: string;
  muted?: string;
}

export interface AppSSCopyResponse {
  slides: AppSSCopySlideIdea[];
  // AI が選んだ推奨テーマ id（パレット生成が無効だった場合のフォールバック / フォント選択に使用）
  recommendedThemeId?: string;
  // AI が選んだ推奨背景スタイル
  recommendedBackgroundStyle?: string;
  // AI が都度生成したアプリ専用パレット（採用時は recommendedThemeId より優先）
  generatedPalette?: GeneratedPalette;
}

export type AppSSCopyErrorField = "appName" | "appDescription" | "features" | "tone";

export interface AppSSCopyErrorResponse {
  error: string;
  code?: GenerateErrorCode;
  field?: AppSSCopyErrorField;
}

// 透かし解除書き出し（/api/appss/export-unlock）。画像データはやり取りしない、
// 許可チェック＋クレジット消費専用のレスポンス。
export interface AppSSExportUnlockResponse {
  ok: true;
}

export interface AppSSExportUnlockErrorResponse {
  error: string;
  code?: GenerateErrorCode;
}
