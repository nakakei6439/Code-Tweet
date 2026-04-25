"use client";

import { useRef, useState } from "react";
import TweetCard from "@/components/TweetCard";
import type { Tweet, GenerateRequest, GenerateResponse, GenerateErrorResponse } from "@/types/tweet";

export default function Home() {
  const [projectText, setProjectText] = useState("");
  const [toneMemo, setToneMemo] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isDisabled = isLoading || projectText.trim() === "" || apiKey.trim() === "";

  async function handleGenerate() {
    setError(null);
    setIsLoading(true);
    setTweets([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectText, toneMemo, apiKey } satisfies GenerateRequest),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as GenerateErrorResponse).error ?? "エラーが発生しました。");
        return;
      }
      setTweets((data as GenerateResponse).tweets);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError("ネットワークエラーが発生しました。接続を確認してください。");
    } finally {
      setIsLoading(false);
    }
  }

  const inputBase =
    "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden px-4 py-16">
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          あなたの{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400 bg-clip-text text-transparent">
            README
          </span>{" "}
          がツイートに変わる
        </h1>
        <p className="text-gray-400 text-center mb-10">
          AIがプロジェクトを分析して5件のマーケティングツイートを自動生成
        </p>

        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                プロジェクト説明 <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={8}
                value={projectText}
                onChange={(e) => setProjectText(e.target.value)}
                placeholder="README や機能説明をここに貼り付けてください..."
                disabled={isLoading}
                className={`${inputBase} focus:ring-cyan-500 resize-none`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                口調メモ <span className="text-gray-500 font-normal">（任意）</span>
              </label>
              <input
                type="text"
                value={toneMemo}
                onChange={(e) => setToneMemo(e.target.value)}
                placeholder="例：フランクな感じで、絵文字あり"
                disabled={isLoading}
                className={`${inputBase} focus:ring-fuchsia-500`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gemini API キー <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                disabled={isLoading}
                className={`${inputBase} focus:ring-yellow-500`}
              />
              <p className="text-xs text-gray-500 mt-1.5">
                APIキーはブラウザ外に保存されません
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isDisabled}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all cursor-pointer
                bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
                text-white shadow-lg shadow-cyan-500/20
                hover:opacity-90
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  生成中...
                </>
              ) : (
                "ツイートを生成する"
              )}
            </button>

            {error && (
              <div className="border border-red-800 bg-red-950/50 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {tweets.length > 0 && (
          <div ref={resultsRef} className="mt-12">
            <p className="text-gray-400 text-sm mb-4">生成されたツイート（{tweets.length}件）</p>
            <div className="space-y-4">
              {tweets.map((tweet) => (
                <TweetCard key={tweet.id} tweet={tweet} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
