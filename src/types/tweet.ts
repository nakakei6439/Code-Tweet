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
  apiKey: string;
}

export interface GenerateResponse {
  tweets: Tweet[];
}

export interface GenerateErrorResponse {
  error: string;
}
