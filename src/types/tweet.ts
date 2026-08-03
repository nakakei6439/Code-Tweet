import type { ApiErrorCode } from "@/lib/apiErrors";
import type { LocaleId as ApiLocale } from "@/lib/locales";

export interface RecommendedTime {
  label: string;
  reason: string;
}

export interface Tweet {
  id: number;
  text: string;
  weightedLength: number;
  isOverLimit: boolean;
  recommendedTime: RecommendedTime;
}

export interface GenerateRequest {
  projectText: string;
  toneMemo: string;
  url?: string;
  hashtags?: string;
  /** 生成するポストの言語。省略時は日本語（サーバー側で検証する） */
  locale?: string;
}

export interface GenerateResponse {
  tweets: Tweet[];
  /** 実際に生成に使われた言語。結果カードの言語表示に使う */
  locale: ApiLocale;
}

// エラー文言はサーバーでは組み立てず、code をクライアントで訳す（src/lib/apiErrors.ts 参照）。
export type GenerateErrorCode = ApiErrorCode;
export type GenerateErrorField = "projectText" | "toneMemo" | "url" | "hashtags";

export interface GenerateErrorResponse {
  code: ApiErrorCode;
  field?: string;
  params?: Record<string, string | number>;
}
