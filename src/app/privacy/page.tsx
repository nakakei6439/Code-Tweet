import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "Code Tweet における取得情報、利用目的、外部サービス利用について説明します。",
};

const sections = [
  {
    title: "1. 取得する情報",
    body: "Code Tweet は、GitHub ログイン時のメールアドレス、GitHub アカウント識別情報、GitHub README やリポジトリ一覧の取得に必要な連携情報、生成回数、プラン判定、利用ログ、ゲスト利用時の IP アドレスをハッシュ化した情報を扱います。また、投稿やnote Draft生成時に入力されたプロジェクト説明、README、追加プロンプト、URL、ハッシュタグなどを扱います。Pro ユーザーの生成履歴として保存するのは生成された投稿、推奨投稿日時、note Draftのタイトルと本文、URL、ハッシュタグ、生成日時で、README本文や追加プロンプト本文は保存しません。生成履歴は1ユーザーあたり最新50件までを保持し、新しい履歴が追加されるとそれを超える古い履歴は自動的に削除されます。",
  },
  {
    title: "2. 利用目的",
    body: "取得した情報は、ログイン状態の確認、利用回数制限、プラン判定、GitHub README やリポジトリ一覧の取得、AI による投稿生成、不正利用防止、問い合わせ対応、サービス改善のために利用します。",
  },
  {
    title: "3. GitHub トークンの扱い",
    body: "GitHub の Personal Access Token など、保存が必要なアクセストークン類はサーバー側でのみ扱い、データベースへ保存する場合は AES-256-GCM で暗号化します。保存済みトークンを画面に平文表示することはありません。必要がなくなった場合は、設定ページからトークン削除またはアカウント削除を行うことで関連情報を削除できます。",
  },
  {
    title: "4. AI 生成に送信される情報",
    body: "投稿生成時には、ユーザーが入力したプロジェクト説明、README、追加プロンプト、URL、ハッシュタグなどが Google Gemini API に送信されます。README やプロンプトには、秘密鍵、アクセストークン、パスワード、第三者の個人情報、未公開の機密情報を含めないでください。",
  },
  {
    title: "5. 外部サービス",
    body: "本サービスは、認証とデータベースに Supabase、ログインやリポジトリ情報取得に GitHub、投稿生成に Google Gemini API、ホスティングと実行基盤および利用状況分析に Vercel（Vercel Analytics / Vercel Speed Insights）、ヒートマップとセッション記録による UX 改善のために Microsoft Clarity を利用します。各外部サービスでの情報の扱いは、それぞれのプライバシーポリシーや利用規約に従います。",
  },
  {
    title: "6. アクセス解析・セッション記録について",
    body: "サービス改善および不具合検知のため、以下のアクセス解析ツールを利用します。Vercel Analytics は Cookie を使用せず、匿名のページビュー、参照元、地域、デバイス情報を収集します。Vercel Speed Insights は LCP・CLS・INP などのパフォーマンス指標を収集します。Microsoft Clarity はヒートマップとセッション記録のために Cookie を利用し、ページ上の操作（クリック、スクロール、マウス移動）を匿名化したうえで記録します。入力フォームのパスワード、クレジットカード情報、その他の機密性の高い入力欄は自動的にマスクされ、平文では記録されません。",
  },
  {
    title: "7. 情報の削除",
    body: "ログイン済みユーザーは設定ページからアカウント削除を実行できます。削除により、アカウント、GitHub 連携情報、利用履歴、生成履歴、プラン情報など、ユーザーに紐づく情報の削除を行います。ただし、法令対応、不正利用防止、障害調査、外部サービス側の保持仕様により、一部のログや情報が一定期間残る場合があります。",
  },
  {
    title: "8. 安全管理",
    body: "API キーや Service Role Key などの秘密情報はサーバー側の環境変数として管理し、クライアントに公開しません。ゲスト利用時の IP アドレスはハッシュ化して保存し、GitHub トークンは暗号化して保存します。アクセス権限は、認証状態やユーザー ID に基づいて制御します。",
  },
  {
    title: "9. 問い合わせ",
    body: "個人情報の取り扱い、削除、訂正、利用停止などに関する問い合わせは、問い合わせページからご連絡ください。本人確認が必要な場合は、ログイン状態や登録情報を確認したうえで対応します。",
  },
  {
    title: "10. ポリシーの変更",
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
          Code Tweet が扱う情報、その利用目的、外部サービスへの送信、削除方法について説明します。
          最終更新日: 2026年5月24日
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
