import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AppSS とは",
  description:
    "GitHub の README から、App Store 提出用スクリーンショット（＝ダウンロードを左右する“広告”）を AI と一緒に作成。日本語コピー生成・テーマ/背景のAIおまかせ・強調ワード・全サイズ一括書き出しまで、ブラウザだけで完結します。",
};

const steps = [
  {
    no: "1",
    title: "GitHubリポジトリのURLを貼る",
    body: "https://github.com/owner/repo を入力、またはログイン後にリポジトリを選択。READMEはツール側で自動取得します。",
  },
  {
    no: "2",
    title: "雰囲気とテーマを選ぶ（任意）",
    body: "「追加プロンプト」で文体（やわらかい/上質 など）を、テーマは配色を指定。どちらも「AIにおまかせ」にすればアプリ内容から自動で選びます。",
  },
  {
    no: "3",
    title: "生成 → 画像を入れて書き出し",
    body: "AIが見出しコピーとレイアウトを一気に作成。エディタで自分のアプリのスクショを入れ、App Store 必須サイズ（6.9〜6.1インチ）を一括で PNG 書き出し。",
  },
] as const;

const features = [
  {
    title: "READMEから日本語コピーをAI生成",
    body: "「機能の羅列」ではなく、ユーザーが得る変化（ベネフィット）で書く見出しを、日本の App Store 上位アプリの流儀でAIが作成します。",
  },
  {
    title: "テーマ・背景をAIが自動選択",
    body: "アプリの雰囲気に合わせて配色テーマ（5種）と背景装飾（5種）をAIが提案。もちろん手動でも変更できます。",
  },
  {
    title: "見出しの“強調ワード”を自動ハイライト",
    body: "各見出しで一番刺さる語をAIが選び、アクセント色で強調。プロのスクショ広告に欠かせない“一語の強調”を自動で。",
  },
  {
    title: "画像は端末内だけ（サーバー送信なし）",
    body: "取り込んだスクショはブラウザ内（IndexedDB）にのみ保存。未公開アプリのスクショも安心して扱えます。",
  },
  {
    title: "日本語フォントで美しく",
    body: "ゴシック・丸ゴ・明朝を用意し、書き出し画像にもフォントを埋め込み。日本語が“映える”仕上がりに。",
  },
  {
    title: "App Store 全サイズを一括書き出し",
    body: "6.9 / 6.5 / 6.3 / 6.1 インチを一度に PNG で書き出し、そのまま App Store Connect にアップロードできます。",
  },
] as const;

const demos = [
  { src: "/appss/demo/01.jpg", alt: "AppSS 出力サンプル：ヒーロー（続ける力が手に入る）" },
  { src: "/appss/demo/02.jpg", alt: "AppSS 出力サンプル：機能（ワンタップで今日も完了）" },
  { src: "/appss/demo/03.jpg", alt: "AppSS 出力サンプル：成長（積み重ねがひと目でわかる）" },
] as const;

export default function AppSSAboutPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          App
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            SS
          </span>
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          App Storeのスクショを、
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            AIと“広告”として作る。
          </span>
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-400">
          GitHub の README を渡すだけで、App Store 提出用スクリーンショットの見出しコピー・レイアウト・配色までAIが提案。あとは自分のアプリ画面を入れて書き出すだけ。すべてブラウザで完結します。
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/?tab=appss"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
          >
            スクショを作る
          </Link>
          <Link
            href="/appss"
            className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
          >
            エディタを開く
          </Link>
        </div>

        <hr className="my-16 border-gray-800" />

        {/* ── “広告”の価値訴求（今回の肝） ── */}
        <section className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-b from-fuchsia-500/10 to-transparent p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300">
            なぜスクショが重要なのか
          </p>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-white">
            App Storeのスクショは、
            <br />
            ただの画面写真ではなく<span className="text-fuchsia-300">“広告”</span>です。
          </h2>
          <p className="mt-4 text-sm leading-7 text-gray-300">
            App Store Connect にアップロードするスクリーンショットは、単なるアプリの画面写真ではありません。ストアを訪れた見込みユーザーが「ダウンロードするかどうか」を数秒で判断する、最重要のマーケティング素材＝<span className="font-semibold text-white">広告</span>です。
          </p>
          <p className="mt-3 text-sm leading-7 text-gray-300">
            だからこそ、機能を並べるのではなく「ユーザーが得られる価値」を、伝わる言葉と映えるデザインでアピールする必要があります。<span className="font-semibold text-white">AppSS は、その“広告”をAIと一緒に作り込むためのツール</span>です。個人開発者でも、上位アプリのような訴求力あるスクショを短時間で用意できます。
          </p>
        </section>

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

        {/* ── 出力サンプル（デモ） ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            出力サンプル
          </h2>
          <p className="mt-3 text-xs leading-6 text-gray-500">
            架空アプリ「コツトレ」で作成した例。見出しコピー・強調ワード・配色・背景・デバイスフレームまで、この状態で書き出せます（自分のアプリ画面を入れるだけ）。
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            {demos.map((d) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={d.src}
                src={d.src}
                alt={d.alt}
                className="w-full rounded-xl border border-gray-800 bg-gray-900"
                loading="lazy"
              />
            ))}
          </div>
        </section>

        <hr className="my-16 border-gray-800" />

        <section id="features">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            特徴
          </h2>
          <ul className="mt-6 space-y-4">
            {features.map((f) => (
              <li
                key={f.title}
                className="rounded-xl border border-gray-800 bg-gray-900/60 p-4"
              >
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <hr className="my-16 border-gray-800" />

        {/* ── 参考元・クレジット ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            参考元・クレジット
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            AppSS のエディタ設計・書き出しの仕組みは、MIT ライセンスで公開されている{" "}
            <a
              href="https://github.com/ParthJadhav/app-store-screenshots"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-200"
            >
              ParthJadhav/app-store-screenshots
            </a>{" "}
            を参考に、日本語・AIコピー生成向けに再構築したものです。素晴らしい元プロジェクトに感謝します。
          </p>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            デバイスフレーム（iPhone ベゼル）は{" "}
            <a
              href="https://developer.apple.com/design/resources/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-200"
            >
              Apple Design Resources
            </a>{" "}
            の公式 Product Bezels を、Apple のマーケティング利用ガイドラインに従って使用しています。日本語フォントは Noto Sans JP / Zen Maru Gothic / Noto Serif JP（SIL Open Font License）です。
          </p>
        </section>

        <hr className="my-16 border-gray-800" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            利用枠
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            AI コピー生成は Code Tweet / note Draft と利用枠を共有しています。GitHub ログイン後、月 3 回まで無料で使えます。足りない分はクレジットパック（10回 ¥70〜）を買い足して使えます。エディタでの編集・書き出し自体は無料・無制限です。
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
