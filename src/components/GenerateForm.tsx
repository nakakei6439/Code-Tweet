"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import TweetCard from "@/components/TweetCard";
import RepoSelectorModal from "@/components/RepoSelectorModal";
import type { Tweet, GenerateRequest, GenerateResponse, GenerateErrorResponse, GenerateErrorCode } from "@/types/tweet";
import type { UsageInfo } from "@/types/usage";

type Props = {
  initialUsage: UsageInfo | null;
};

function GuestLimitCTA() {
  const [isPending, setIsPending] = useState(false);
  async function handleLogin() {
    setIsPending(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "read:user user:email repo",
      },
    });
  }
  return (
    <button
      onClick={handleLogin}
      disabled={isPending}
      className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer
        bg-white text-gray-900 hover:bg-gray-100
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors
        flex items-center justify-center gap-2"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
      {isPending ? "..." : "GitHub でログイン"}
    </button>
  );
}

function FreeLimitCTA() {
  return (
    <Link
      href="/pricing"
      className="block w-full py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer
        bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
        text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition-opacity"
    >
      Pro プランへアップグレード（月 980 円）
    </Link>
  );
}

function UsageBadge({ usage }: { usage: UsageInfo }) {
  const isLow = usage.remaining <= 2;
  const isEmpty = usage.remaining === 0;
  const tierLabel = usage.tier === "paid" ? "Pro" : usage.tier === "free" ? "無料" : "ゲスト";
  const tierClass =
    usage.tier === "paid"
      ? "text-fuchsia-300 bg-fuchsia-950/40 border-fuchsia-800/60"
      : usage.tier === "free"
        ? "text-cyan-300 bg-cyan-950/40 border-cyan-800/60"
        : "text-gray-300 bg-gray-800/60 border-gray-700";
  const remainClass = isEmpty
    ? "text-red-400"
    : isLow
      ? "text-amber-400"
      : "text-white";

  return (
    <div className="mb-4 flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-900/60 backdrop-blur border border-gray-800 rounded-xl text-sm">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tierClass}`}>
        {tierLabel}
      </span>
      <span className="text-gray-400 text-xs">
        今月あと <span className={`font-semibold text-base ${remainClass}`}>{usage.remaining}</span>
        <span className="text-gray-500"> / {usage.limit} 回</span>
      </span>
    </div>
  );
}

export default function GenerateForm({ initialUsage }: Props) {
  const [projectText, setProjectText] = useState("");
  const [toneMemo, setToneMemo] = useState("");
  const [url, setUrl] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingReadme, setIsFetchingReadme] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<GenerateErrorCode | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(initialUsage);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [repos, setRepos] = useState<import("@/app/api/repos/route").RepoItem[] | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const isLoggedIn = usage?.tier === "free" || usage?.tier === "paid";

  async function handleOpenRepoModal() {
    setIsRepoModalOpen(true);
    setReposError(null);
    setReposLoading(true);
    try {
      const res = await fetch("/api/repos");
      const data = await res.json();
      if (!res.ok) {
        setReposError(data.error ?? "取得に失敗しました。");
        setRepos([]);
      } else {
        setRepos(data.repos);
      }
    } catch {
      setReposError("ネットワークエラーが発生しました。");
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  }

  async function refreshUsage() {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = (await res.json()) as UsageInfo;
        setUsage(data);
      }
    } catch {
      // 無視（残り回数表示は best-effort）
    }
  }

  const formDisabled = isLoading || isFetchingReadme;
  const isDisabled = formDisabled || projectText.trim() === "";

  async function handleFetchReadme() {
    setError(null);
    setErrorCode(null);
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
    setErrorCode(null);
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
        const err = data as GenerateErrorResponse;
        setError(err.error ?? "エラーが発生しました。");
        setErrorCode(err.code ?? null);
        return;
      }
      setTweets((data as GenerateResponse).tweets);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      refreshUsage();
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

      {usage && <UsageBadge usage={usage} />}

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
                data-fetch-readme
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
            {isLoggedIn && (
              <button
                onClick={handleOpenRepoModal}
                disabled={formDisabled}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                自分のリポジトリから選ぶ
              </button>
            )}
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
            <div className="border border-red-800 bg-red-950/50 rounded-lg px-4 py-3 text-red-400 text-sm space-y-3">
              <p>{error}</p>
              {errorCode === "guest_limit" && <GuestLimitCTA />}
              {errorCode === "free_limit" && <FreeLimitCTA />}
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

      <RepoSelectorModal
        isOpen={isRepoModalOpen}
        isLoading={reposLoading}
        repos={repos}
        error={reposError}
        onClose={() => setIsRepoModalOpen(false)}
        onSelect={(htmlUrl) => {
          setGithubUrl(htmlUrl);
          setTimeout(() => {
            const btn = document.querySelector<HTMLButtonElement>("[data-fetch-readme]");
            btn?.click();
          }, 50);
        }}
      />
    </>
  );
}
