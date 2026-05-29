import type { Metadata } from "next";
import Link from "next/link";
import { PROJECT_TEXT_LIMITS } from "@/lib/generateLimits";
import { TWEET_GENERATION_HISTORY_LIMIT } from "@/lib/generationHistory";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionTier, isEligibleForTrial } from "@/lib/subscription";
import GitHubLoginButton from "@/components/GitHubLoginButton";
import StripeActionButton from "@/components/StripeActionButton";
import { getMissingStripeCheckoutEnv } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "料金プラン",
  description: "Code Tweetの無料プランとProプランの違いを機能比較表で確認できます。",
};

interface PlanFeature {
  label: string;
  included: boolean;
}

interface PlanTier {
  slug: "free" | "pro";
  name: string;
  tagline: string;
  price: string;
  priceUnit?: string;
  monthlyLabel: string;
  readmeLimitLabel: string;
  bestFor: string;
  features: PlanFeature[];
  cta: { label: string; href?: string };
  available: boolean;
  badge?: string;
  trialNote?: string;
}

const PLAN_TIERS: PlanTier[] = [
  {
    slug: "free",
    name: "無料",
    tagline: "GitHubで連携してはじめる",
    price: "¥0",
    monthlyLabel: "月3回",
    readmeLimitLabel: `${PROJECT_TEXT_LIMITS.free.toLocaleString("ja-JP")}文字`,
    bestFor: "公開リポジトリで継続的にXに発信したい個人開発者",
    features: [
      { label: "READMEの自動取得 + 5件生成", included: true },
      { label: "推奨投稿日時 + 理由", included: true },
      { label: "280ウェイトの自動チェック", included: true },
      { label: "公開リポジトリ一覧から選択", included: true },
      { label: `生成履歴の保存・削除（最新${TWEET_GENERATION_HISTORY_LIMIT}件）`, included: false },
      { label: "プライベートリポジトリ対応", included: false },
    ],
    cta: { label: "GitHubでログインして使う", href: "/" },
    available: true,
  },
  {
    slug: "pro",
    name: "Pro",
    tagline: "本格運用するならこれ",
    price: "¥500",
    priceUnit: "/ 月",
    monthlyLabel: "月30回",
    readmeLimitLabel: `${PROJECT_TEXT_LIMITS.paid.toLocaleString("ja-JP")}文字`,
    bestFor: "プライベート開発を公開前から育てたい / 毎日発信したい人",
    features: [
      { label: "READMEの自動取得 + 5件生成", included: true },
      { label: "推奨投稿日時 + 理由", included: true },
      { label: "280ウェイトの自動チェック", included: true },
      { label: "公開リポジトリ一覧から選択", included: true },
      { label: `生成履歴の保存・削除（最新${TWEET_GENERATION_HISTORY_LIMIT}件）`, included: true },
      { label: "プライベートリポジトリ対応", included: true },
    ],
    cta: { label: "Pro にアップグレード" },
    available: true,
    badge: "初月無料",
    trialNote: "30日後から ¥500/月（いつでも解約可）",
  },
];

const ALL_FEATURES = Array.from(
  new Set(PLAN_TIERS.flatMap((p) => p.features.map((f) => f.label))),
);

function planHasFeature(planSlug: string, label: string): boolean {
  const plan = PLAN_TIERS.find((p) => p.slug === planSlug);
  return plan?.features.find((f) => f.label === label)?.included ?? false;
}

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tier = user ? await getSubscriptionTier(user.id) : null;
  const isPaid = tier === "paid";
  const isAuthenticated = !!user;
  const stripeReady = getMissingStripeCheckoutEnv().length === 0;
  const eligibleForTrial = user && !isPaid ? await isEligibleForTrial(user.id) : !user;

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-16 text-gray-200">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Pricing · Feature Comparison
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
            機能で比べる、
            <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
              プランの違い。
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
            無料と Pro の違いを機能単位で並べました。何ができて何ができないか、表で確認してから判断できます。
          </p>
        </header>

        <section className="mt-12 overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900/60">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="px-5 py-5 align-bottom text-xs font-semibold uppercase tracking-wider text-gray-500">
                  比較項目
                </th>
                {PLAN_TIERS.map((plan) => (
                  <th key={plan.slug} className="px-5 py-5 align-bottom">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{plan.name}</span>
                      {plan.badge && eligibleForTrial && (
                        <span className="rounded-full border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">{plan.price}</span>
                      {plan.priceUnit && (
                        <span className="text-xs text-gray-400">{plan.priceUnit}</span>
                      )}
                    </div>
                    {plan.slug === "pro" && plan.trialNote && eligibleForTrial && (
                      <p className="mt-1 text-[11px] font-medium text-amber-200">
                        初月無料・{plan.trialNote}
                      </p>
                    )}
                    <p className="mt-1 text-xs font-normal text-emerald-300">{plan.monthlyLabel}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <th
                  scope="row"
                  className="px-5 py-4 text-left text-xs font-medium text-gray-500"
                >
                  向いている人
                </th>
                {PLAN_TIERS.map((plan) => (
                  <td key={plan.slug} className="px-5 py-4 text-xs leading-5 text-gray-300">
                    {plan.bestFor}
                  </td>
                ))}
              </tr>
              <tr>
                <th
                  scope="row"
                  className="px-5 py-4 text-left text-sm font-normal text-gray-300"
                >
                  README文字数上限
                </th>
                {PLAN_TIERS.map((plan) => (
                  <td key={plan.slug} className="px-5 py-4 text-sm font-medium text-gray-200">
                    {plan.readmeLimitLabel}
                  </td>
                ))}
              </tr>
              {ALL_FEATURES.map((label) => (
                <tr key={label}>
                  <th
                    scope="row"
                    className="px-5 py-4 text-left text-sm font-normal text-gray-300"
                  >
                    {label}
                  </th>
                  {PLAN_TIERS.map((plan) => {
                    const included = planHasFeature(plan.slug, label);
                    return (
                      <td key={plan.slug} className="px-5 py-4">
                        {included ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300">
                            <span aria-hidden>✓</span>
                            <span className="text-xs text-gray-400">含まれます</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                            <span aria-hidden>—</span>
                            <span className="text-xs">対象外</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-gray-900/40">
                <th
                  scope="row"
                  className="px-5 py-5 text-left text-xs font-medium text-gray-500"
                >
                  はじめる
                </th>
                {PLAN_TIERS.map((plan) => (
                  <td key={plan.slug} className="px-5 py-5">
                    {plan.slug === "pro" && !stripeReady ? (
                      <button
                        disabled
                        title="決済機能は近日公開予定です"
                        className="cursor-not-allowed rounded-lg border border-gray-800 px-4 py-2 text-xs font-semibold text-gray-500"
                      >
                        準備中
                      </button>
                    ) : plan.slug === "pro" && isPaid ? (
                      <Link
                        href="/settings"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-100 transition-colors hover:border-gray-600 hover:bg-gray-800"
                      >
                        支払いを管理する
                      </Link>
                    ) : plan.slug === "pro" && isAuthenticated ? (
                      <StripeActionButton
                        action="checkout"
                        className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                      >
                        {eligibleForTrial ? "30日間無料でProを試す" : plan.cta.label}
                      </StripeActionButton>
                    ) : plan.slug === "pro" ? (
                      <GitHubLoginButton
                        next="/pricing"
                        className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100"
                      >
                        {eligibleForTrial ? "GitHubでログインしてProを試す" : "GitHubでログインしてアップグレード"}
                      </GitHubLoginButton>
                    ) : plan.available && plan.slug === "free" && isAuthenticated ? (
                      <button
                        disabled
                        className="cursor-default rounded-lg border border-emerald-800/70 bg-emerald-950/30 px-4 py-2 text-xs font-semibold text-emerald-200"
                      >
                        {isPaid ? "Proプランを利用中" : "無料プランを利用中"}
                      </button>
                    ) : plan.available && plan.slug === "free" ? (
                      <GitHubLoginButton
                        next="/"
                        className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100"
                      >
                        {plan.cta.label}
                      </GitHubLoginButton>
                    ) : plan.available && plan.cta.href ? (
                      <Link
                        href={plan.cta.href}
                        className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100"
                      >
                        {plan.cta.label}
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="cursor-not-allowed rounded-lg border border-gray-800 px-4 py-2 text-xs font-semibold text-gray-500"
                      >
                        {plan.cta.label}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        <p className="mt-8 text-center text-xs text-gray-500">
          ログインなしでも、ホームから3回まで生成できます。ゲストのREADME文字数上限は {PROJECT_TEXT_LIMITS.guest.toLocaleString("ja-JP")}文字です。
        </p>
        <p className="mt-3 text-center text-[11px] text-gray-500">
          ※ 初月無料トライアルは Pro を初めてご契約の方のみ対象です。カード登録が必要ですが、30日以内に解約すれば請求は発生しません。
        </p>
      </div>
    </main>
  );
}
