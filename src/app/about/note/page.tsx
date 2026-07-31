import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "note Draft とは",
  description:
    "note.com の記法とユーザー特性に合わせて構造化された Markdown を生成。タイトル長・本文長・記法・リンク位置を AI 任せにせず、ツール側で検証・再生成しています",
};

const steps = [
  {
    no: "1",
    title: "GitHubリポジトリのURLを貼る",
    body: "https://github.com/owner/repo を入力欄に貼り付け。READMEはツール側で自動取得します。",
  },
  {
    no: "2",
    title: "記事の長さを選ぶ (任意)",
    body: "短め (2〜3分) / 標準 (4〜6分) / 長め (7〜10分) から選択。トーン・告知URL・ハッシュタグも任意で追加できます。",
  },
  {
    no: "3",
    title: "「記事を生成する」を押す",
    body: "タイトル + 6セクションの Markdown 本文 + ハッシュタグが揃います。コピーして note.com に貼り付けるだけ。",
  },
] as const;

const qualityChecks = [
  {
    title: "タイトル32文字を強制",
    body: "AIが32文字を超えるタイトルを返した場合、ツール側で検出して再生成を依頼します。note.com のタイトル欄で途切れない長さを保証します。",
  },
  {
    title: "文字数の下限・上限を二重チェック",
    body: "選んだプリセット (短め 600〜1200字 / 標準 1500〜2200字 / 長め 2500〜3500字) の範囲を外れた場合は再生成。「短すぎて中身がない」「長すぎて読むのが大変」を機械的に防ぎます。",
  },
  {
    title: "note.com対応の記法だけに整形",
    body: "AI生成のMarkdownから、note.com が対応しない記法 (Markdownリンク・コードブロック・テーブル等) を除去し、見出し(##) / 太字(**) / リスト(- / 1.) のみに整形します。貼り付けるだけで自動変換されます。",
  },
  {
    title: "URLは「最後に」に1回だけ埋め込み",
    body: "本文中で同じURLが繰り返されるのを防ぐため、提供されたリンクは「最後に」セクションに1回だけ配置します。スパムっぽい印象を避けるための制約です。",
  },
] as const;

const sampleNote = {
  title: "個人開発で『Code Tweet』を作って公開した話",
  charCount: 1842,
  bodyPreview: `## こんな課題はありませんか?

「開発は終わったけど、告知が続かない」「READMEは書いたけど、Xでどう紹介すればいいか分からない」——個人開発をやっていると、技術的な実装よりも告知のほうに時間がかかることがあります。`,
};

export default function NoteAboutPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          note{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            Draft
          </span>
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          個人開発を、
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            noteで正しく届ける。
          </span>
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-400">
          note.com の記法とユーザー特性に合わせて構造化された Markdown を生成します。タイトル長・本文長・記法・リンク位置を AI 任せにせず、ツール側で検証・再生成しています。
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/?tab=note"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
          >
            生成画面を開く
          </Link>
          <a
            href="#quality"
            className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
          >
            品質のために自動で行っていること ↓
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
        </section>

        <hr className="my-16 border-gray-800" />

        <section id="quality">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            品質のために自動で行っていること
          </h2>
          <p className="mt-3 text-xs leading-6 text-gray-500">
            AI 生成 = 雑、にならないようにツール側でかけている制約です。手で修正する手間を減らします。
          </p>
          <ul className="mt-6 space-y-4">
            {qualityChecks.map((q) => (
              <li
                key={q.title}
                className="rounded-xl border border-gray-800 bg-gray-900/60 p-4"
              >
                <p className="text-sm font-semibold text-white">{q.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">{q.body}</p>
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-base font-semibold leading-tight text-white">
                {sampleNote.title}
              </p>
              <span className="shrink-0 text-xs text-gray-400">
                {sampleNote.charCount}字
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
              {sampleNote.bodyPreview}
            </p>
          </div>
        </section>

        <hr className="my-16 border-gray-800" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            利用枠
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            note Draft は Code Tweet と利用枠を共有しています。GitHub ログイン後、月 3 回まで無料で使えます。足りない分はクレジットパック（10回 ¥100〜）を買い足して使えます。
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
