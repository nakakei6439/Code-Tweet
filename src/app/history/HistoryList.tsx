"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import TweetCard from "@/components/TweetCard";
import type { TweetGenerationRecord } from "@/lib/generationHistory";
import type { Tweet } from "@/types/tweet";
import { deleteHistoryTweet } from "./actions";

type Props = {
  histories: TweetGenerationRecord[];
};

type PendingDelete = {
  generationId: string;
  tweet: Tweet;
} | null;

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function HistoryList({ histories }: Props) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) {
        setPendingDelete(null);
        setError(null);
      }
    }

    if (pendingDelete) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [pendingDelete, isPending]);

  function closeModal() {
    if (isPending) return;
    setPendingDelete(null);
    setError(null);
  }

  function handleDelete() {
    if (!pendingDelete) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteHistoryTweet(pendingDelete.generationId, pendingDelete.tweet.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingDelete(null);
    });
  }

  if (histories.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900/80 p-8 text-center">
        <p className="text-base font-semibold text-white">まだ履歴はありません</p>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          ログインした状態でポストを生成すると、ここに生成結果が残ります。
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg border border-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/10"
        >
          ポストを生成する
        </Link>
      </section>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {histories.map((history) => (
          <section key={history.id} className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
            <div className="mb-4 flex flex-col gap-2 border-b border-gray-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{formatCreatedAt(history.createdAt)}</p>
                <div className="mt-2 space-y-1 text-xs leading-5 text-gray-400">
                  {history.sourceUrl && (
                    <p className="break-all">
                      URL: <span className="text-gray-300">{history.sourceUrl}</span>
                    </p>
                  )}
                  {history.hashtags && (
                    <p>
                      ハッシュタグ: <span className="text-gray-300">{history.hashtags}</span>
                    </p>
                  )}
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-400">
                {history.tweets.length}件
              </span>
            </div>
            <div className="space-y-4">
              {history.tweets.map((tweet) => (
                <TweetCard
                  key={tweet.id}
                  tweet={tweet}
                  actionSlot={
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setPendingDelete({ generationId: history.id, tweet });
                      }}
                      className="rounded-md border border-red-700/70 px-3 py-1 text-xs text-red-300 transition-colors hover:bg-red-950/40"
                    >
                      削除
                    </button>
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-delete-confirm-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-red-950/80 bg-gray-900 shadow-2xl shadow-red-950/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            <div className="border-b border-gray-800 px-6 py-5">
              <h3 id="history-delete-confirm-title" className="font-semibold text-white">
                この投稿案を削除しますか？
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                削除すると元に戻せません。
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950/60 px-4 py-3">
                <p className="whitespace-pre-wrap text-xs leading-5 text-gray-300">
                  {pendingDelete.tweet.text}
                </p>
              </div>
              {error && (
                <div className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-xs text-red-300">
                  {error}
                </div>
              )}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-4 text-sm font-semibold text-gray-100 transition-colors hover:border-gray-600 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                >
                  {isPending ? "削除中..." : "削除する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
