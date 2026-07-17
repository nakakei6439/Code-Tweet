export type UsageTier = "guest" | "free" | "paid";

export interface UsageInfo {
  tier: UsageTier;
  used: number;
  limit: number;
  remaining: number;
  /** 購入クレジットの残数（無期限）。ゲストは常に 0。 */
  credits: number;
  resetAt: string;
}
