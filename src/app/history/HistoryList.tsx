"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import TweetCard from "@/components/TweetCard";
import type { GenerationHistoryRecord } from "@/lib/generationHistory";
import type { Tweet } from "@/types/tweet";
import { deleteHistoryNote, deleteHistoryTweet } from "./actions";

const NoteCard = dynamic(() => import("@/components/NoteCard"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-sm text-gray-400">
      note Draftを読み込んでいます...
    </div>
  ),
});

type Props = {
  histories: GenerationHistoryRecord[];
};

type PendingDelete = ({
  type: "tweet";
  generationId: string;
  tweet: Tweet;
} | {
  type: "note";
  generationId: string;
  title: string;
  markdown: string;
}) | null;

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

const PREVIEW_LENGTH = 60;

function truncatePreview(value: string): string {
  const flattened = value.replace(/\s+/g, " ").trim();
  if (!flattened) return "（この履歴には表示できる内容がありません）";
  if (flattened.length <= PREVIEW_LENGTH) return flattened;
  return `${flattened.slice(0, PREVIEW_LENGTH)}…`;
}

function buildPreview(history: GenerationHistoryRecord): string {
  if (history.generationType === "note") {
    return truncatePreview(`${history.note.title} ${history.note.markdown}`);
  }
  const first = history.tweets[0];
  if (!first) return "（このセッションには表示できる投稿案がありません）";
  return truncatePreview(first.text);
}

function buildCountLabel(history: GenerationHistoryRecord): string {
  return history.generationType === "note" ? "note Draft" : `ポスト ${history.tweets.length}件`;
}

function extractGithubRepo(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    if (!/(^|\.)github\.com$/.test(url.hostname)) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    return `${segments[0]}/${segments[1]}`;
  } catch {
    return null;
  }
}

type DateGroupKey = "today" | "yesterday" | "thisWeek" | "thisMonth" | "older";

const GROUP_LABEL: Record<DateGroupKey, string> = {
  today: "今日",
  yesterday: "昨日",
  thisWeek: "今週",
  thisMonth: "今月",
  older: "それ以前",
};

const GROUP_ORDER: DateGroupKey[] = ["today", "yesterday", "thisWeek", "thisMonth", "older"];

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function classifyDate(value: string, now: Date): DateGroupKey {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "older";

  const today = startOfDay(now);
  const target = startOfDay(date);
  const dayDiff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff < 7) return "thisWeek";
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return "thisMonth";
  }
  return "older";
}

function groupByDate(histories: GenerationHistoryRecord[]) {
  const now = new Date();
  const buckets = new Map<DateGroupKey, GenerationHistoryRecord[]>();
  for (const history of histories) {
    const key = classifyDate(history.createdAt, now);
    const list = buckets.get(key) ?? [];
    list.push(history);
    buckets.set(key, list);
  }
  return GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    label: GROUP_LABEL[key],
    items: buckets.get(key)!,
  }));
}

export default function HistoryList({ histories }: Props) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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
      const result = pendingDelete.type === "tweet"
        ? await deleteHistoryTweet(pendingDelete.generationId, pendingDelete.tweet.id)
        : await deleteHistoryNote(pendingDelete.generationId);
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
          Proプランでポストまたはnote Draftを生成すると、ここに生成結果が残ります。
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

  const groups = groupByDate(histories);

  return (
    <>
      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.key}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {group.label}
              <span className="ml-2 text-gray-600">({group.items.length})</span>
            </h2>
            <div className="space-y-3">
              {group.items.map((history) => {
                const isOpen = openIds.has(history.id);
                const panelId = `history-panel-${history.id}`;
                const repo = extractGithubRepo(history.sourceUrl);
                return (
                  <section
                    key={history.id}
                    className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70"
                  >
                    <button
                      type="button"
                      onClick={() => toggleOpen(history.id)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-900"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {repo ? (
                            <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                aria-hidden="true"
                                className="h-4 w-4 shrink-0 text-gray-400"
                              >
                                <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
                              </svg>
                              <span className="truncate">{repo}</span>
                            </span>
                          ) : null}
                          <p className="text-xs text-gray-400">
                            {formatCreatedAt(history.createdAt)}
                          </p>
                        </div>
                        {!isOpen && (
                          <p className="mt-1 truncate text-xs text-gray-400">
                            {buildPreview(history)}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-400">
                        {buildCountLabel(history)}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                        className={`mt-1 h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.22 4.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L10.94 10 6.22 5.28a.75.75 0 010-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {isOpen && (
                      <div id={panelId} className="border-t border-gray-800 px-5 py-4">
                        {(history.sourceUrl || history.hashtags) && (
                          <div className="mb-4 space-y-1 text-xs leading-5 text-gray-400">
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
                        )}
                        <div className="space-y-4">
                          {history.generationType === "note" ? (
                            <>
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setError(null);
                                    setPendingDelete({
                                      type: "note",
                                      generationId: history.id,
                                      title: history.note.title,
                                      markdown: history.note.markdown,
                                    });
                                  }}
                                  className="rounded-md border border-red-700/70 px-3 py-1 text-xs text-red-300 transition-colors hover:bg-red-950/40"
                                >
                                  削除
                                </button>
                              </div>
                              <NoteCard note={history.note} />
                            </>
                          ) : (
                            history.tweets.map((tweet) => (
                              <TweetCard
                                key={tweet.id}
                                tweet={tweet}
                                actionSlot={
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setError(null);
                                      setPendingDelete({ type: "tweet", generationId: history.id, tweet });
                                    }}
                                    className="rounded-md border border-red-700/70 px-3 py-1 text-xs text-red-300 transition-colors hover:bg-red-950/40"
                                  >
                                    削除
                                  </button>
                                }
                              />
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
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
                {pendingDelete.type === "note" ? "このnote Draftを削除しますか？" : "この投稿案を削除しますか？"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                削除すると元に戻せません。
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950/60 px-4 py-3">
                <p className="whitespace-pre-wrap text-xs leading-5 text-gray-300">
                  {pendingDelete.type === "note"
                    ? `# ${pendingDelete.title}\n\n${pendingDelete.markdown}`
                    : pendingDelete.tweet.text}
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
