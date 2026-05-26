export type NoteLengthPreset = "short" | "standard" | "long";

export interface NoteDraft {
  title: string;
  markdown: string;
  charCount: number;
}

export interface GenerateNoteRequest {
  projectText: string;
  toneMemo?: string;
  url?: string;
  hashtags?: string;
  lengthPreset?: NoteLengthPreset;
}

export interface GenerateNoteResponse {
  note: NoteDraft;
}
