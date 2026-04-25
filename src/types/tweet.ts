export interface Tweet {
  id: number;
  text: string;
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
