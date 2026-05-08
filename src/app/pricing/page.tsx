import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "料金プラン | Code Tweet",
  description: "Code Tweetの無料枠とProプランの違いを確認できます。Pro決済機能は近日公開予定です。",
};

const plans = [
  {
    name: "ゲスト",
    price: "¥0",
    limit: "月3回",
    target: "まず試したい人",
    features: ["説明文から生成", "公開GitHub URLからREADME取得", "5件のポストと推奨日時"],
    action: "ホームで試す",
    href: "/",
    current: false,
  },
  {
    name: "無料",
    price: "¥0",
    limit: "月10回",
    target: "継続利用を試したい人",
    features: ["ゲスト機能すべて", "GitHubログイン", "公開リポジトリ一覧から選択"],
    action: "ログインして使う",
    href: "/",
    current: false,
  },
  {
    name: "Pro",
    price: "¥980",
    limit: "月100回",
    target: "毎週発信する個人開発者",
    features: ["無料機能すべて", "プライベートリポジトリ対応", "公開・非公開リポジトリ一覧から選択"],
    action: "近日公開",
    href: "#",
    current: true,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-gray-200">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <span aria-hidden="true">←</span>
            ホームに戻る
          </Link>
          <Link
            href="/about"
            className="rounded-lg border border-gray-800 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-900"
          >
            Code Tweet とは
          </Link>
        </div>

        <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-medium text-fuchsia-300">料金プラン</p>
              <h1 className="text-2xl font-bold leading-tight text-white sm:text-4xl">
                無料で試して、必要になったらProへ。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                ゲストでも生成できます。GitHubログインで月10回まで利用でき、Proでは月100回とプライベートリポジトリ対応を予定しています。
              </p>
            </div>
            <div className="rounded-lg border border-fuchsia-900/70 bg-fuchsia-950/20 p-4">
              <p className="text-sm font-semibold text-fuchsia-200">Pro決済は準備中です</p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Stripe Checkout、Webhook、Customer Portalは次のPhase Bで追加します。
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border bg-gray-900/70 p-5 ${
                plan.current ? "border-fuchsia-700/70" : "border-gray-800"
              }`}
            >
              <div className="flex min-h-16 items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">{plan.target}</p>
                </div>
                {plan.current && (
                  <span className="rounded border border-fuchsia-800 bg-fuchsia-950/50 px-2 py-1 text-xs font-semibold text-fuchsia-300">
                    予定
                  </span>
                )}
              </div>

              <div className="mt-5 border-t border-gray-800 pt-5">
                <p className="text-3xl font-bold text-white">
                  {plan.price}
                  {plan.name === "Pro" && <span className="text-sm font-medium text-gray-500"> / 月</span>}
                </p>
                <p className="mt-1 text-sm font-medium text-cyan-300">{plan.limit}</p>
              </div>

              {plan.current ? (
                <button
                  disabled
                  className="mt-5 w-full rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-500 cursor-not-allowed"
                >
                  {plan.action}
                </button>
              ) : (
                <Link
                  href={plan.href}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
                >
                  {plan.action}
                </Link>
              )}

              <div className="mt-5 space-y-3 border-t border-gray-800 pt-5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-2 text-sm leading-6 text-gray-400">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" aria-hidden="true" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-gray-800 bg-gray-900/70">
          <div className="grid grid-cols-[120px_1fr] border-b border-gray-800 px-4 py-3 text-sm font-semibold text-gray-300 sm:grid-cols-[140px_1fr_1fr_1fr]">
            <span>項目</span>
            <span>ゲスト</span>
            <span className="hidden sm:block">無料</span>
            <span className="hidden sm:block">Pro</span>
          </div>
          <div className="divide-y divide-gray-800 text-sm text-gray-400">
            <div className="grid grid-cols-[120px_1fr] px-4 py-3 sm:grid-cols-[140px_1fr_1fr_1fr]">
              <span className="text-gray-300">生成回数</span>
              <span>月3回</span>
              <span className="hidden sm:block">月10回</span>
              <span className="hidden sm:block">月100回</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] px-4 py-3 sm:grid-cols-[140px_1fr_1fr_1fr]">
              <span className="text-gray-300">リポジトリ選択</span>
              <span>なし</span>
              <span className="hidden sm:block">公開のみ</span>
              <span className="hidden sm:block">公開・非公開</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] px-4 py-3 sm:grid-cols-[140px_1fr_1fr_1fr]">
              <span className="text-gray-300">決済</span>
              <span>不要</span>
              <span className="hidden sm:block">不要</span>
              <span className="hidden sm:block">近日公開</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
