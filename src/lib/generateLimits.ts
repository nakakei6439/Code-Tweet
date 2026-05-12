import type { UsageTier } from "@/types/usage";

export const PROJECT_TEXT_LIMITS: Record<UsageTier, number> = {
  guest: 1_500,
  free: 1_500,
  paid: 5_000,
};

export const MAX_TONE_MEMO_LENGTH = 100;
export const MAX_URL_LENGTH = 500;
export const MAX_HASHTAGS_LENGTH = 100;

export function getProjectTextLimit(tier: UsageTier): number {
  return PROJECT_TEXT_LIMITS[tier];
}

export function getProjectTextLimitLabel(tier: UsageTier): string {
  return getProjectTextLimit(tier).toLocaleString("ja-JP");
}
