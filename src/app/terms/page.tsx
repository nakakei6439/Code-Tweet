import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約",
  description: "Code Tweet の利用条件、禁止事項、免責事項について説明します。",
};

const sections = [
  {
    title: "1. サービスの内容",
    body: "Code Tweet は、GitHub リポジトリの README やユーザーが入力した説明文をもとに、X 向け投稿案を生成する下書き支援ツールです。生成結果は投稿前に必ずユーザー自身で確認してください。",
  },
  {
    title: "2. アカウントと認証",
    body: "GitHub ログインを利用することで、無料ユーザー向けの利用枠やリポジトリ選択機能を利用できます。アカウント情報の管理、ログアウト、アカウント削除はユーザー自身の責任で行ってください。",
  },
  {
    title: "3. 利用制限",
    body: "ゲスト、無料、Pro などのプランに応じて月間の生成回数に上限があります。過度な連続利用、不正アクセス、制限回避を目的とした利用は禁止します。",
  },
  {
    title: "4. 禁止事項",
    body: "第三者の権利を侵害する内容、違法または有害な内容、スパム、なりすまし、サービスの運営を妨げる行為、その他運営者が不適切と判断する行為を禁止します。",
  },
  {
    title: "5. 生成結果の扱い",
    body: "AI による生成結果には誤り、不正確な表現、古い情報が含まれる場合があります。投稿内容、URL、価格、機能名、法的表現などの事実確認はユーザー自身で行ってください。",
  },
  {
    title: "6. 免責事項",
    body: "本サービスの利用または利用できなかったことにより発生した損害について、運営者は法令で認められる範囲で責任を負いません。サービス内容は予告なく変更、停止、終了する場合があります。",
  },
  {
    title: "7. 規約の変更",
    body: "必要に応じて本規約を変更することがあります。重要な変更がある場合は、サービス上での掲示など適切な方法で告知します。",
  },
] as const;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          Terms
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          利用規約
        </h1>
        <p className="mt-6 text-sm leading-7 text-gray-400">
          このページは Code Tweet を安心して利用していただくための初期版の利用条件です。正式な法務レビュー前の内容であり、必要に応じて更新します。
        </p>

        <hr className="my-12 border-gray-800" />

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-400">{section.body}</p>
            </section>
          ))}
        </div>

        <hr className="my-12 border-gray-800" />

        <Link
          href="/contact"
          className="inline-flex rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
        >
          問い合わせる
        </Link>
      </article>
    </main>
  );
}
