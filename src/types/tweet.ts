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

export type GenerateErrorCode = "guest_limit" | "free_limit" | "paid_limit";

export interface GenerateErrorResponse {
  error: string;
  code?: GenerateErrorCode;
}
