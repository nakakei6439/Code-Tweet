import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listTweetGenerations, TWEET_GENERATION_HISTORY_LIMIT } from "@/lib/generationHistory";
import { getSubscriptionTier } from "@/lib/subscription";
import AuthOverlay from "@/components/AuthOverlay";
import HomeLinkButton from "@/components/HomeLinkButton";
import HistoryList from "./HistoryList";

export const metadata: Metadata = {
  title: "生成履歴",
  description: "Code Tweet で生成した過去のX投稿を確認できます。",
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <HomeLinkButton className="justify-self-start" />
          <h1 className="text-center text-2xl font-bold text-white">生成履歴</h1>
          <div aria-hidden="true" />
        </div>
        <p className="mb-6 text-sm text-gray-400">
          生成履歴を確認するにはログインしてください。
        </p>
        <AuthOverlay />
      </main>
    );
  }

  const tier = await getSubscriptionTier(user.id);
  if (tier !== "paid") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <HomeLinkButton className="justify-self-start" />
          <h1 className="text-center text-2xl font-bold text-white">生成履歴</h1>
          <div aria-hidden="true" />
        </div>
        <section className="rounded-2xl border border-gray-800 bg-gray-900/80 p-8 text-center">
          <p className="text-base font-semibold text-white">生成履歴は Pro プランの機能です</p>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Pro では生成した投稿案を最新 {TWEET_GENERATION_HISTORY_LIMIT} 件まで保存し、あとから見返したり不要な投稿案を削除できます。
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
          >
            Pro プランを見る
          </Link>
        </section>
      </main>
    );
  }

  const historyResult = await listTweetGenerations(user.id);
  const histories = historyResult.records;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <HomeLinkButton className="justify-self-start" />
        <h1 className="text-center text-2xl font-bold text-white">生成履歴</h1>
        <div aria-hidden="true" />
      </div>
      <p className="mb-6 text-center text-xs text-gray-500">
        最新 {TWEET_GENERATION_HISTORY_LIMIT} 件まで保存されます。これを超えると古い履歴から自動で削除されます。
      </p>

      <HistoryList histories={historyResult.ok ? histories : []} />
    </main>
  );
}
