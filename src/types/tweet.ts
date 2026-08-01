import type { ApiErrorCode } from "@/lib/apiErrors";

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
}

export interface GenerateResponse {
  tweets: Tweet[];
}

// エラー文言はサーバーでは組み立てず、code をクライアントで訳す（src/lib/apiErrors.ts 参照）。
export type GenerateErrorCode = ApiErrorCode;
export type GenerateErrorField = "projectText" | "toneMemo" | "url" | "hashtags";

export interface GenerateErrorResponse {
  code: ApiErrorCode;
  field?: string;
  params?: Record<string, string | number>;
}
