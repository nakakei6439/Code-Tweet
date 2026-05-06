import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscriptionTier } from "@/lib/subscription";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const tier = await getSubscriptionTier(user.id);
  const isPaid = tier === "paid";

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

      <div className="mb-6 bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-gray-400 text-sm mb-1">現在のプラン</p>
          {isPaid ? (
            <p className="text-white text-lg font-bold flex items-center gap-2">
              Pro
              <span className="text-xs font-medium text-fuchsia-400 bg-fuchsia-950/50 border border-fuchsia-800 px-2 py-0.5 rounded-full">
                月 980 円
              </span>
            </p>
          ) : (
            <p className="text-white text-lg font-bold">無料プラン</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            {isPaid
              ? "月 100 回まで生成・プライベートリポジトリ対応・リポジトリ一覧から選択"
              : "月 10 回まで生成・公開リポジトリのみ"}
          </p>
        </div>
        {isPaid ? (
          <button
            disabled
            title="決済機能は近日公開予定です"
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-medium border border-gray-700 text-gray-500 cursor-not-allowed"
          >
            解約・支払い管理
          </button>
        ) : (
          <Link
            href="/pricing"
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer
              bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
              text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition-opacity"
          >
            アップグレード
          </Link>
        )}
      </div>

      <SettingsForm hasToken={!!data} isPaid={isPaid} />
    </main>
  );
}
