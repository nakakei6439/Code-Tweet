"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Tweet } from "@/types/tweet";

interface TweetCardProps {
  tweet: Tweet;
  actionSlot?: ReactNode;
}

export default function TweetCard({ tweet, actionSlot }: TweetCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(tweet.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePostToX() {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(tweet.text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className={
        tweet.isOverLimit
          ? "bg-gray-900 border border-red-500/50 rounded-xl p-5"
          : "bg-gray-900 border border-gray-800 rounded-xl p-5"
      }
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 6v6l4 2" />
          </svg>
          <span className="text-gray-200 text-sm font-medium">{tweet.recommendedTime.label}</span>
        </div>
        <span
          className={
            tweet.isOverLimit
              ? "text-red-500 text-xs font-medium"
              : "text-gray-400 text-xs"
          }
          title={tweet.isOverLimit ? "X の上限 280 ウェイトを超過しています" : undefined}
        >
          {tweet.weightedLength}/280
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-3">{tweet.recommendedTime.reason}</p>
      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{tweet.text}</p>
      <div className="mt-4 flex items-center justify-end gap-2">
        {actionSlot}
        <button
          onClick={handlePostToX}
          title={tweet.isOverLimit ? "上限超過。X の画面で編集してから投稿してください" : "X の投稿画面を開きます"}
          className="flex items-center gap-1.5 border border-gray-600 text-gray-200 hover:bg-white/5 text-xs px-3 py-1 rounded-md transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Xで投稿
        </button>
        <button
          onClick={handleCopy}
          aria-live="polite"
          className={
            copied
              ? "border border-green-500 text-green-400 text-xs px-3 py-1 rounded-md"
              : "border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 text-xs px-3 py-1 rounded-md transition-colors cursor-pointer"
          }
        >
          {copied ? "コピーしました ✓" : "コピー"}
        </button>
      </div>
    </div>
  );
}
