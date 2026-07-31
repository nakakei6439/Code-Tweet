import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Code Tweet とは",
  description:
    "READMEやGitHubリポジトリからX向けマーケティングポストを生成する個人開発者向けAIツールの説明ページ",
};

const steps = [
  {
    no: "1",
    title: "GitHubリポジトリのURLを貼る",
    body: "https://github.com/owner/repo を入力欄に貼り付けます。READMEはツール側で自動取得するので、自分で本文を貼り直す必要はありません。READMEがないリポジトリの場合だけ、説明文を直接ペーストできます。",
  },
  {
    no: "2",
    title: "条件を足す(任意)",
    body: "口調・告知URL・ハッシュタグを指定したい場合だけ入力します。全部省略しても5件生成できます。",
  },
  {
    no: "3",
    title: "「ポストを生成する」を押す",
    body: "紹介・使い方・ユースケース・共感・CTAの5件が、推奨投稿日時つきで一気に揃います。「Xで投稿」ボタンでそのままX投稿画面を開けます(コピーもできます)。",
  },
] as const;

const features = [
  {
    title: "READMEを自動で読み込む",
    body: "URLを貼るだけで、リポジトリからREADMEを取得してプレビューします。本文を自分でコピペする手間はありません。",
  },
  {
    title: "5本の切り口を一度に生成",
    body: "紹介・使い方・ユースケース・共感・CTAの順で、投稿の役割を変えて5件出します。",
  },
  {
    title: "推奨投稿日時つき",
    body: "翌日から7日以内で、投稿の性質に合った曜日と時間帯を理由つきで提案します。",
  },
  {
    title: "280ウェイトを自動チェック",
    body: "twitter-textで重み付き文字数を計算。超過していれば赤色で警告します。",
  },
  {
    title: "ワンクリックでXに投稿",
    body: "「Xで投稿」ボタンで、本文入りのX投稿画面をそのまま開けます。コピー&貼り付けの手間なく投稿に進めます。",
  },
] as const;

const sampleTweet = {
  text: "個人開発で作った『Code Tweet』を公開しました。\n\nGitHubのREADMEを貼るだけで、X向けの投稿下書きを5件まとめて作るツールです。\n\n「開発は終わったけど、告知が続かない」を解消するために作りました。",
  weightedLength: 119,
  recommendedTime: {
    label: "2026-05-13 火 20:30",
    reason: "平日夜の個人開発者がXを開く時間帯。新作の紹介投稿に最適です。",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          Code{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            Tweet
          </span>
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          GitHubのURLを貼るだけで、
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            X投稿の下書きを5件作る。
          </span>
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-400">
          リポジトリのURLを貼ると、READMEを自動で読み込んで、紹介・使い方・ユースケース・共感・CTAの5件を推奨投稿日時つきで生成します。
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
          >
            生成画面を開く
          </Link>
          <a
            href="#steps"
            className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
          >
            使い方を見る
          </a>
        </div>

        <hr className="my-16 border-gray-800" />

        <section id="steps">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            使い方
          </h2>
          <ol className="mt-6 space-y-10">
            {steps.map((step) => (
              <li key={step.no} className="grid grid-cols-[44px_1fr] gap-5">
                <span className="text-4xl font-light leading-none text-gray-700">
                  {step.no}
                </span>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-gray-400">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 rounded-lg border border-gray-800 bg-gray-900/60 px-4 py-3 text-xs leading-6 text-gray-400">
            ヒント: GitHubでログインすると、自分の公開リポジトリ一覧から選択できる「リポジトリを選ぶ」ボタンが使えるようになります。URLを毎回コピペする必要がなくなります。
          </p>
        </section>

        <hr className="my-16 border-gray-800" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            できること
          </h2>
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li
                key={f.title}
                className="flex gap-3 border-b border-gray-800 pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-gray-600">·</span>
                <div>
                  <p className="text-sm font-medium text-white">{f.title}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-400">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <hr className="my-16 border-gray-800" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            出力サンプル
          </h2>
          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 shrink-0 text-cyan-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M12 6v6l4 2" />
                </svg>
                <span className="text-sm font-medium text-gray-200">
                  {sampleTweet.recommendedTime.label}
                </span>
              </div>
              <span className="text-xs text-gray-400">{sampleTweet.weightedLength}/280</span>
            </div>
            <p className="mb-3 text-xs text-gray-400">{sampleTweet.recommendedTime.reason}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
              {sampleTweet.text}
            </p>
          </div>
        </section>

        <hr className="my-16 border-gray-800" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            利用枠
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Code Tweet は GitHub ログイン後、月 3 回まで無料で使えます。足りない分はクレジットパック（10回 ¥100〜）を買い足して使えます。買ったクレジットに有効期限はありません。
          </p>
          <Link
            href="/pricing"
            className="mt-5 inline-flex items-center gap-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
          >
            プラン詳細を見る →
          </Link>
        </section>
      </article>
    </main>
  );
}
