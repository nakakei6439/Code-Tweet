import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Code Tweet とは | Code Tweet",
  description: "READMEやGitHubリポジトリからX向けマーケティングポストを生成する個人開発者向けAIツールの説明ページ",
};

const steps = [
  ["1", "READMEを入れる", "GitHub URLから取得、または説明文を貼り付けます。"],
  ["2", "条件を足す", "口調、告知URL、ハッシュタグを必要に応じて指定します。"],
  ["3", "5件を生成", "紹介、使い方、ユースケース、共感、CTAの流れで出力します。"],
];

const outputs = [
  ["X向けポスト", "weighted lengthを確認し、280ウェイト以内に収めます。"],
  ["投稿タイミング", "翌日から7日以内の推奨日時と理由を添えます。"],
  ["URLリード文", "GitHub、Web、App Storeなどに合わせて文言を変えます。"],
];

const plans = [
  ["ゲスト", "月3回", "ログインなしで試せます。"],
  ["無料", "月10回", "GitHubログインで公開リポジトリ一覧から選べます。"],
  ["Pro", "月100回", "プライベートリポジトリ対応。決済機能は近日公開予定です。"],
];

export default function AboutPage() {
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
            href="/pricing"
            className="rounded-lg border border-gray-800 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-900"
          >
            プラン
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-6 sm:p-8">
            <p className="mb-3 text-sm font-medium text-cyan-300">Code Tweet とは</p>
            <h1 className="text-2xl font-bold leading-tight text-white sm:text-4xl">
              READMEから、X投稿の下書きを5件まとめて作るツールです。
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
              個人開発者が「作ったあとに発信を続ける」ための補助ツールです。
              GitHubリポジトリやプロジェクト説明を読み取り、紹介からCTAまでの投稿案に分解します。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
              >
                生成画面へ
              </Link>
              <a
                href="#flow"
                className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800"
              >
                使い方を見る
              </a>
            </div>
          </div>

          <aside className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="text-sm font-semibold text-white">生成イメージ</span>
              <span className="rounded border border-cyan-900 bg-cyan-950/40 px-2 py-0.5 text-xs text-cyan-300">
                5 posts
              </span>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                <p className="text-xs font-semibold text-cyan-300">POST 1 / 紹介</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  READMEからプロダクトの強みを抽出して、最初の紹介文に整えます。
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                <p className="text-xs font-semibold text-fuchsia-300">POST 4 / 共感</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  ユーザーの悩みに寄せた切り口で、投稿の反応点を作ります。
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                <p className="text-xs font-semibold text-yellow-300">SCHEDULE</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  2026-05-09 20:30 / 平日夜の個人開発者が見やすい時間帯
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section id="flow" className="mt-8 rounded-lg border border-gray-800 bg-gray-900/70 p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Workflow</p>
              <h2 className="mt-1 text-xl font-bold text-white">基本の流れ</h2>
            </div>
            <p className="hidden text-sm text-gray-500 sm:block">READMEがなくても直接入力できます。</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <div key={number} className="rounded-lg border border-gray-800 bg-gray-950/50 p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-700 text-sm font-semibold text-white">
                  {number}
                </span>
                <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-6">
            <p className="text-sm font-medium text-gray-500">Output</p>
            <h2 className="mt-1 text-xl font-bold text-white">生成されるもの</h2>
            <div className="mt-5 divide-y divide-gray-800">
              {outputs.map(([title, description]) => (
                <div key={title} className="grid gap-2 py-4 sm:grid-cols-[160px_1fr]">
                  <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
                  <p className="text-sm leading-6 text-gray-400">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-6">
            <p className="text-sm font-medium text-gray-500">Security</p>
            <h2 className="mt-1 text-xl font-bold text-white">GitHub連携</h2>
            <p className="mt-4 text-sm leading-6 text-gray-400">
              GitHubログインで利用枠が増えます。ProではOAuthトークンを暗号化して保存し、
              プライベートリポジトリのREADME取得に使います。
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-gray-800 bg-gray-900/70 p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Plans</p>
              <h2 className="mt-1 text-xl font-bold text-white">利用枠</h2>
            </div>
            <Link href="/pricing" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
              詳しく見る
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-800">
            {plans.map(([name, limit, description], index) => (
              <div
                key={name}
                className={`grid gap-2 bg-gray-950/40 px-4 py-4 sm:grid-cols-[120px_120px_1fr] ${
                  index > 0 ? "border-t border-gray-800" : ""
                }`}
              >
                <p className="text-sm font-semibold text-white">{name}</p>
                <p className="text-sm text-cyan-300">{limit}</p>
                <p className="text-sm text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
