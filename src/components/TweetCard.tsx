"use client";

import { useState } from "react";
import type { Tweet } from "@/types/tweet";

interface TweetCardProps {
  tweet: Tweet;
}

export default function TweetCard({ tweet }: TweetCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(tweet.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <span className="text-gray-500 text-xs">#{tweet.id}</span>
        <span
          className={
            tweet.isOverLimit
              ? "text-red-500 text-xs font-medium"
              : "text-gray-500 text-xs"
          }
          title={tweet.isOverLimit ? "X の上限 280 ウェイトを超過しています" : undefined}
        >
          {tweet.weightedLength}/280
        </span>
      </div>
      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{tweet.text}</p>
      <div className="flex justify-end mt-4">
        <button
          onClick={handleCopy}
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
