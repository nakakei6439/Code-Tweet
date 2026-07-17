import { isAdminEmail } from "@/lib/admin";
import { getCreditBalance } from "@/lib/credits";
import { getSubscriptionTier, type SubscriptionTier } from "@/lib/subscription";
import type { UsageTier } from "@/types/usage";

// 「月次無料枠の大きさ」と「特典（README 1万字・履歴保存）」は判定を分ける。
// - quotaTier: サブスク paid か管理者だけが月 30 回。購入クレジット残高では増えない
//   （残高 > 0 で無料枠まで月 30 回になる事故を防ぐ）。
// - perkTier: サブスク paid / 管理者 / 購入クレジット残高 > 0 のいずれかで paid 扱い。
export type Entitlements = {
  subscriptionTier: SubscriptionTier;
  isAdmin: boolean;
  creditBalance: number;
  quotaTier: UsageTier;
  perkTier: UsageTier;
};

export async function getEntitlements(
  userId: string,
  email: string | null | undefined,
): Promise<Entitlements> {
  const [subscriptionTier, creditBalance] = await Promise.all([
    getSubscriptionTier(userId),
    getCreditBalance(userId),
  ]);
  const isAdmin = isAdminEmail(email);

  const quotaTier: UsageTier = subscriptionTier === "paid" || isAdmin ? "paid" : "free";
  const perkTier: UsageTier =
    subscriptionTier === "paid" || isAdmin || creditBalance > 0 ? "paid" : "free";

  return { subscriptionTier, isAdmin, creditBalance, quotaTier, perkTier };
}

// perk（旧 Pro 特典: README 1万字・履歴・プライベートリポジトリ）の有無だけ欲しい場面用。
export async function hasProAccess(
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  const { perkTier } = await getEntitlements(userId, email);
  return perkTier === "paid";
}
