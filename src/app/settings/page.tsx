import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SettingsForm from "@/components/SettingsForm";

const PAT_STEPS = [
  {
    step: 1,
    title: "GitHub の設定を開く",
    desc: "GitHub にログインし、右上のアイコン → Settings をクリック",
  },
  {
    step: 2,
    title: "Developer settings を開く",
    desc: "左サイドバーの一番下にある「Developer settings」をクリック",
  },
  {
    step: 3,
    title: "Personal access tokens を選ぶ",
    desc: "「Personal access tokens」→「Tokens (classic)」をクリック",
  },
  {
    step: 4,
    title: "新しいトークンを生成",
    desc: "「Generate new token」→「Generate new token (classic)」をクリック",
  },
  {
    step: 5,
    title: "Note と Expiration を入力",
    desc: "Note に任意の名前（例：code-tweet）を入力。Expiration は任意。",
  },
  {
    step: 6,
    title: "repo スコープにチェック",
    desc: "「repo」にチェックを入れる。これがないとプライベートリポジトリにアクセスできません。",
    highlight: "repo",
  },
  {
    step: 7,
    title: "Generate token をクリック",
    desc: "ページ下部の「Generate token」ボタンをクリック",
  },
  {
    step: 8,
    title: "トークンをコピーして上の欄に貼り付ける",
    desc: "ghp_ から始まる文字列が表示されます。この画面を閉じると二度と見られないので、すぐコピーしてください。",
    highlight: "ghp_",
  },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_tokens")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-gray-400 text-sm hover:text-white transition-colors mb-8"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        ホームに戻る
      </Link>

      <h1 className="text-white text-2xl font-bold mb-8">設定</h1>

      <SettingsForm hasPat={!!data} />

      <div className="mt-10">
        <h2 className="text-white text-base font-semibold mb-4">PAT の取得方法</h2>
        <div className="space-y-3">
          {PAT_STEPS.map(({ step, title, desc, highlight }) => (
            <div key={step} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex gap-4">
              <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
                {step}
              </div>
              <div>
                <p className="text-white text-sm font-medium mb-0.5">{title}</p>
                <p className="text-gray-400 text-sm">
                  {highlight
                    ? desc.split(highlight).map((part, i, arr) =>
                        i < arr.length - 1 ? (
                          <span key={i}>
                            {part}
                            <code className="text-cyan-400 bg-gray-800 px-1 rounded text-xs">{highlight}</code>
                          </span>
                        ) : part
                      )
                    : desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
