import type { NoteLengthPreset } from "@/types/note";

// 表示名（短め/標準/長め・所要時間）は messages/*.json の notePresets 名前空間に持つ。
// ここは Gemini のプロンプト生成（geminiNote.ts）からも参照される純粋なロジック定義なので、
// next-intl を import せず、文字数の範囲だけを持たせる。
export const NOTE_LENGTH_PRESETS: Record<NoteLengthPreset, { min: number; max: number }> = {
  short: { min: 600, max: 1200 },
  standard: { min: 1500, max: 2200 },
  long: { min: 2500, max: 3500 },
};

export const DEFAULT_NOTE_LENGTH_PRESET: NoteLengthPreset = "standard";

export function isNoteLengthPreset(value: unknown): value is NoteLengthPreset {
  return value === "short" || value === "standard" || value === "long";
}
