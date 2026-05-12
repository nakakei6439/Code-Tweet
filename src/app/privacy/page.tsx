import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "Code Tweet における取得情報、利用目的、外部サービス利用について説明します。",
};

const sections = [
  {
    title: "1. 取得する情報",
    body: "Code Tweet は、GitHub ログイン時のメールアドレス、GitHub アカウント情報、GitHub OAuth トークン、生成回数の利用ログ、ゲスト利用時の IP アドレスをハッシュ化した情報を扱います。",
  },
  {
    title: "2. 利用目的",
    body: "取得した情報は、ログイン状態の確認、利用回数制限、GitHub README やリポジトリ一覧の取得、プラン判定、不正利用防止、サービス改善のために利用します。",
  },
  {
    title: "3. GitHub トークンの扱い",
    body: "GitHub OAuth で取得したトークンは暗号化して保存し、README 取得やリポジトリ一覧取得に利用します。必要がなくなった場合は、設定ページからアカウント削除を行うことで関連情報を削除できます。",
  },
  {
    title: "4. AI 生成に送信される情報",
    body: "投稿生成時には、ユーザーが入力したプロジェクト説明、README、追加プロンプト、URL、ハッシュタグなどが Gemini API に送信されます。機密情報を入力しないよう注意してください。",
  },
  {
    title: "5. 外部サービス",
    body: "本サービスは Supabase、GitHub、Google Gemini API、Vercel などの外部サービスを利用します。各サービスでの情報の扱いは、それぞれのプライバシーポリシーや利用規約に従います。",
  },
  {
    title: "6. 情報の削除",
    body: "ログイン済みユーザーは設定ページからアカウント削除を実行できます。削除により、アカウント、GitHub 連携情報、利用履歴、プラン情報の削除を行います。",
  },
  {
    title: "7. ポリシーの変更",
    body: "本ポリシーは、サービス内容や利用する外部サービスの変更に応じて更新する場合があります。重要な変更がある場合は、サービス上で告知します。",
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          Privacy
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          プライバシーポリシー
        </h1>
        <p className="mt-6 text-sm leading-7 text-gray-400">
          Code Tweet が扱う情報と、その利用目的を説明します。このページは初期版であり、必要に応じて更新します。
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
