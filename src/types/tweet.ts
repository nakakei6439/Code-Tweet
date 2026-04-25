export interface Tweet {
  id: number;
  text: string;
  weightedLength: number;
  isOverLimit: boolean;
}

export interface GenerateRequest {
  projectText: string;
  toneMemo: string;
  apiKey: string;
}

export interface GenerateResponse {
  tweets: Tweet[];
}

export interface GenerateErrorResponse {
  error: string;
}
