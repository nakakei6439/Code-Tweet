import type { Metadata } from "next";
import Link from "next/link";
import { CREDIT_PACKS } from "@/lib/creditPacks";
import { PROJECT_TEXT_LIMITS } from "@/lib/generateLimits";
import { TWEET_GENERATION_HISTORY_LIMIT } from "@/lib/generationHistory";
import { USER_FREE_MONTHLY_LIMIT } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionTier } from "@/lib/subscription";
import GitHubLoginButton from "@/components/GitHubLoginButton";
import StripeActionButton from "@/components/StripeActionButton";
import { getMissingStripeCreditsEnv } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "料金プラン",
  description:
    "Code Tweetは毎月の無料枠に加えて、使う分だけクレジットを買い足せる単発課金制です。サブスク不要で、買ったクレジットは無期限で使えます。",
};

// クレジット購入で解放される機能（旧 Pro 特典）。
const CREDIT_PERKS = [
  `README文字数上限 ${PROJECT_TEXT_LIMITS.paid.toLocaleString("ja-JP")}文字（無料は${PROJECT_TEXT_LIMITS.free.toLocaleString("ja-JP")}文字）`,
  `生成履歴の保存・削除（最新${TWEET_GENERATION_HISTORY_LIMIT}件）`,
  "プライベートリポジトリ対応",
  "クレジットは無期限（月をまたいでも消えない）",
];

const FREE_FEATURES = [
  `毎月${USER_FREE_MONTHLY_LIMIT}回まで無料で生成`,
  "READMEの自動取得 + 5件生成",
  "推奨投稿日時 + 理由",
  "280ウェイトの自動チェック",
  "ワンクリックでXに投稿（共有リンク）",
];

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const isSubscriber = user ? (await getSubscriptionTier(user.id)) === "paid" : false;
  const stripeReady = getMissingStripeCreditsEnv().length === 0;

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-16 text-gray-200">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Pricing · Pay as you go
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
            サブスク不要。
            <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
              使う分だけ買い足せる。
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
            毎月{USER_FREE_MONTHLY_LIMIT}回まで無料。足りない月だけクレジットを買い足せます。
            買ったクレジットに有効期限はありません。
          </p>
        </header>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {/* 無料プラン */}
          <div className="flex flex-col rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-base font-bold text-white">無料</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">¥0</span>
            </div>
            <p className="mt-1 text-xs text-emerald-300">月{USER_FREE_MONTHLY_LIMIT}回まで生成</p>
            <ul className="mt-5 flex-1 space-y-2 text-xs leading-5 text-gray-300">
              {FREE_FEATURES.map((label) => (
                <li key={label} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-emerald-300">✓</span>
                  {label}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isAuthenticated ? (
                <button
                  disabled
                  className="w-full cursor-default rounded-lg border border-emerald-800/70 bg-emerald-950/30 px-4 py-2 text-xs font-semibold text-emerald-200"
                >
                  利用中
                </button>
              ) : (
                <GitHubLoginButton
                  next="/"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100"
                >
                  GitHubでログインして使う
                </GitHubLoginButton>
              )}
            </div>
          </div>

          {/* クレジットパック */}
          {CREDIT_PACKS.map((pack, index) => {
            const perUse = Math.round((pack.amountJpy / pack.credits) * 10) / 10;
            const isBestValue = index === CREDIT_PACKS.length - 1;
            return (
              <div
                key={pack.id}
                className={`flex flex-col rounded-2xl border p-6 ${
                  isBestValue
                    ? "border-fuchsia-700/60 bg-gray-900/80 shadow-lg shadow-fuchsia-500/10"
                    : "border-gray-800 bg-gray-900/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{pack.name}</h2>
                  {isBestValue && (
                    <span className="rounded-full border border-fuchsia-700/60 bg-fuchsia-950/40 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-200">
                      おトク
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">
                    ¥{pack.amountJpy.toLocaleString("ja-JP")}
                  </span>
                  <span className="text-xs text-gray-400">/ 買い切り</span>
                </div>
                <p className="mt-1 text-xs text-emerald-300">
                  生成{pack.credits}回分（1回あたり約¥{perUse}）
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-xs leading-5 text-gray-300">
                  {CREDIT_PERKS.map((label) => (
                    <li key={label} className="flex items-start gap-2">
                      <span aria-hidden className="mt-0.5 text-emerald-300">✓</span>
                      {label}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {!stripeReady ? (
                    <button
                      disabled
                      title="決済機能は近日公開予定です"
                      className="w-full cursor-not-allowed rounded-lg border border-gray-800 px-4 py-2 text-xs font-semibold text-gray-500"
                    >
                      準備中
                    </button>
                  ) : isAuthenticated ? (
                    <StripeActionButton
                      action="credits"
                      packId={pack.id}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                    >
                      {`${pack.name}を購入`}
                    </StripeActionButton>
                  ) : (
                    <GitHubLoginButton
                      next="/pricing"
                      className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100"
                    >
                      GitHubでログインして購入
                    </GitHubLoginButton>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <p className="mt-8 text-center text-xs text-gray-500">
          ログインなしでも、ホームから3回まで生成できます。ゲストのREADME文字数上限は{" "}
          {PROJECT_TEXT_LIMITS.guest.toLocaleString("ja-JP")}文字です。
        </p>
        <p className="mt-3 text-center text-[11px] text-gray-500">
          ※ クレジットは生成成功時にのみ1回分を消費します。毎月の無料枠を使い切ったあとに消費されます。
          {isSubscriber && (
            <>
              <br />
              Pro プラン契約中の方は、これまで通り月30回まで利用できます。契約の管理は
              <Link href="/settings" className="mx-1 underline hover:text-gray-300">
                設定ページ
              </Link>
              から行えます。
            </>
          )}
        </p>
      </div>
    </main>
  );
}
