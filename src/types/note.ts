export type NoteLengthPreset = "short" | "standard" | "long";

export interface NoteRecommendedTime {
  label: string;
  category: string;
  reason: string;
}

export interface NoteDraft {
  title: string;
  markdown: string;
  charCount: number;
  recommendedTimes: NoteRecommendedTime[];
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
