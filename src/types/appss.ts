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
}

export interface AppSSCopyResponse {
  slides: AppSSCopySlideIdea[];
  // AI が選んだ推奨テーマ（「AIにおまかせ」選択時に採用）
  recommendedThemeId?: string;
}

export type AppSSCopyErrorField = "appName" | "appDescription" | "features" | "tone";

export interface AppSSCopyErrorResponse {
  error: string;
  code?: GenerateErrorCode;
  field?: AppSSCopyErrorField;
}
