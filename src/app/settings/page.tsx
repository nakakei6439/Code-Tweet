import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/entitlements";
import { PROJECT_TEXT_LIMITS } from "@/lib/generateLimits";
import { USER_FREE_MONTHLY_LIMIT, USER_PAID_MONTHLY_LIMIT } from "@/lib/rateLimit";
import AuthOverlay from "@/components/AuthOverlay";
import HomeLinkButton from "@/components/HomeLinkButton";
import SettingsForm from "@/components/SettingsForm";
import StripeActionButton from "@/components/StripeActionButton";
import { getMissingStripeCheckoutEnv } from "@/lib/stripe";
import { isGithubAppConfigured } from "@/lib/githubApp";

export const metadata: Metadata = {
  title: "Settings",
  description: "Code Tweet のプランとGitHub連携状態を確認できます。",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <HomeLinkButton className="justify-self-start" />
          <h1 className="text-center text-2xl font-bold text-white">Settings</h1>
          <div aria-hidden="true" />
        </div>

        <p className="text-gray-400 text-sm mb-6">
          プランとGitHub連携状態を確認するにはログインしてください。
        </p>
        <AuthOverlay />
      </main>
    );
  }

  const entitlements = await getEntitlements(user.id, user.email);
  // isSubscriber は Stripe サブスク契約の有無（解約導線・削除ブロック用）。
  // hasProAccess は perk 判定（サブスク / 管理者 / クレジット残高あり）。
  const isSubscriber = entitlements.subscriptionTier === "paid";
  const hasProAccess = entitlements.perkTier === "paid";
  const monthlyLimit =
    entitlements.quotaTier === "paid" ? USER_PAID_MONTHLY_LIMIT : USER_FREE_MONTHLY_LIMIT;
  const stripeReady = getMissingStripeCheckoutEnv().length === 0;

  const admin = createAdminClient();
  const { data } = await admin
    .from("github_app_installations")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const appConfigured = isGithubAppConfigured();

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <HomeLinkButton className="justify-self-start" />
        <h1 className="text-center text-2xl font-bold text-white">Settings</h1>
        <div aria-hidden="true" />
      </div>

      <div className="mb-6 bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-gray-400 text-sm mb-1">現在のプラン</p>
          {isSubscriber ? (
            <p className="text-white text-lg font-bold flex items-center gap-2">
              Pro
              <span className="text-xs font-medium text-fuchsia-400 bg-fuchsia-950/50 border border-fuchsia-800 px-2 py-0.5 rounded-full">
                ¥500 / 月
              </span>
            </p>
          ) : (
            <p className="text-white text-lg font-bold">無料プラン</p>
          )}
          <p className="text-gray-400 text-xs mt-1">
            {`月 ${monthlyLimit} 回まで生成・README上限 ${PROJECT_TEXT_LIMITS[hasProAccess ? "paid" : "free"].toLocaleString("ja-JP")} 文字・${hasProAccess ? "プライベートリポジトリ対応" : "公開リポジトリのみ"}`}
          </p>
        </div>
        {isSubscriber && stripeReady ? (
          <StripeActionButton
            action="portal"
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-medium border border-gray-700 text-gray-100 transition-colors hover:border-gray-600 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            解約・支払い管理
          </StripeActionButton>
        ) : isSubscriber ? (
          <button
            disabled
            title="決済機能は近日公開予定です"
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-medium border border-gray-700 text-gray-500 cursor-not-allowed"
          >
            解約・支払い管理
          </button>
        ) : null}
      </div>

      <div className="mb-6 bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-gray-400 text-sm mb-1">購入クレジット</p>
          <p className="text-white text-lg font-bold">
            残り {entitlements.creditBalance.toLocaleString("ja-JP")} 回
          </p>
          <p className="text-gray-400 text-xs mt-1">
            毎月の無料枠を使い切ったあとに 1 回ずつ消費されます。有効期限はありません。
          </p>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer
            bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
            text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition-opacity"
        >
          クレジットを購入
        </Link>
      </div>

      <SettingsForm
        isConnected={!!data}
        hasProAccess={hasProAccess}
        hasActiveSubscription={isSubscriber}
        appConfigured={appConfigured}
      />
    </main>
  );
}
