"use client";

import { useRef, useState } from "react";
import TweetCard from "@/components/TweetCard";
import type { Tweet, GenerateRequest, GenerateResponse, GenerateErrorResponse } from "@/types/tweet";

export default function GenerateForm() {
  const [projectText, setProjectText] = useState("");
  const [toneMemo, setToneMemo] = useState("");
  const [url, setUrl] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingReadme, setIsFetchingReadme] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [githubUrl, setGithubUrl] = useState("");

  const formDisabled = isLoading || isFetchingReadme;
  const isDisabled = formDisabled || projectText.trim() === "";

  async function handleFetchReadme() {
    setError(null);
    setIsFetchingReadme(true);
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "README の取得に失敗しました。");
        return;
      }
      setProjectText(data.content);
    } catch {
      setError("ネットワークエラーが発生しました。接続を確認してください。");
    } finally {
      setIsFetchingReadme(false);
    }
  }

  async function handleGenerate() {
    setError(null);
    setIsLoading(true);
    setTweets([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectText, toneMemo, url, hashtags } satisfies GenerateRequest),
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
    <>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 backdrop-blur-sm">
          <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden w-72">
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            <div className="p-8 flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400 animate-spin p-1">
                <div className="w-full h-full rounded-full bg-gray-900" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-base">生成中...</p>
                <p className="text-gray-400 text-sm mt-1">AIがポストを作成しています</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              GitHub URL <span className="text-gray-500 font-normal">（任意）</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="例：https://github.com/owner/repo"
                disabled={formDisabled}
                className={`${inputBase} focus:ring-cyan-500 flex-1`}
              />
              <button
                onClick={handleFetchReadme}
                disabled={formDisabled || githubUrl.trim() === ""}
                className="px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer
                  bg-gray-700 border border-gray-600 text-gray-200
                  hover:bg-gray-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  whitespace-nowrap flex items-center gap-2"
              >
                {isFetchingReadme ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    取得中...
                  </>
                ) : (
                  "README を取得"
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              リポジトリ URL を入力すると README をプロジェクト説明に自動挿入します
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              プロジェクト説明 <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={8}
              value={projectText}
              onChange={(e) => setProjectText(e.target.value)}
              placeholder="README や機能説明をここに貼り付けてください..."
              disabled={formDisabled}
              className={`${inputBase} focus:ring-cyan-500 resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              追加プロンプト <span className="text-gray-500 font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={toneMemo}
              onChange={(e) => setToneMemo(e.target.value)}
              placeholder="例：フランクな感じで、絵文字あり"
              disabled={formDisabled}
              className={`${inputBase} focus:ring-fuchsia-500`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL <span className="text-gray-500 font-normal">（任意）</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="例：https://example.com"
              disabled={formDisabled}
              className={`${inputBase} focus:ring-fuchsia-500`}
            />
            <p className="text-xs text-gray-500 mt-1.5">
              App Store / Google Play / GitHub / Web に対応。種別に合ったリード文が自動で付きます
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ハッシュタグ <span className="text-gray-500 font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="例：#個人開発 #Webアプリ"
              disabled={formDisabled}
              className={`${inputBase} focus:ring-fuchsia-500`}
            />
            <p className="text-xs text-gray-500 mt-1.5">
              入力したハッシュタグに加え、関連タグが最大5つ付きます
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
              "ポストを生成する"
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
          <p className="text-gray-400 text-sm mb-4">生成されたポスト（{tweets.length}件）</p>
          <div className="space-y-4">
            {tweets.map((tweet) => (
              <TweetCard key={tweet.id} tweet={tweet} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
