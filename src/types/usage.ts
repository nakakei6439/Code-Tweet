export type UsageTier = "guest" | "free" | "paid";

export interface UsageInfo {
  tier: UsageTier;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}
