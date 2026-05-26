import type { NoteLengthPreset } from "@/types/note";

export const NOTE_LENGTH_PRESETS: Record<NoteLengthPreset, {
  label: string;
  helper: string;
  minutesLabel: string;
  min: number;
  max: number;
}> = {
  short:    { label: "短め", helper: "2-3分で読める",  minutesLabel: "2-3分",  min: 600,  max: 1200 },
  standard: { label: "標準", helper: "4-6分で読める",  minutesLabel: "4-6分",  min: 1500, max: 2200 },
  long:     { label: "長め", helper: "7-10分で読める", minutesLabel: "7-10分", min: 2500, max: 3500 },
};

export const DEFAULT_NOTE_LENGTH_PRESET: NoteLengthPreset = "standard";

export function isNoteLengthPreset(value: unknown): value is NoteLengthPreset {
  return value === "short" || value === "standard" || value === "long";
}
