"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import TweetCard from "@/components/TweetCard";
import RepoSelectorModal from "@/components/RepoSelectorModal";
import {
  PROJECT_TEXT_LIMITS,
  MAX_HASHTAGS_LENGTH,
  MAX_TONE_MEMO_LENGTH,
  MAX_URL_LENGTH,
  getProjectTextLimit,
} from "@/lib/generateLimits";
import type {
  Tweet,
  GenerateRequest,
  GenerateResponse,
  GenerateErrorResponse,
  GenerateErrorCode,
  GenerateErrorField,
} from "@/types/tweet";
import type { UsageInfo } from "@/types/usage";

type Props = {
  initialUsage: UsageInfo | null;
};

const STATIC_FIELD_LIMITS = {
  toneMemo: MAX_TONE_MEMO_LENGTH,
  url: MAX_URL_LENGTH,
  hashtags: MAX_HASHTAGS_LENGTH,
};

const FIELD_LABELS: Record<GenerateErrorField, string> = {
  projectText: "プロジェクト説明（README）",
  toneMemo: "追加プロンプト",
  url: "URL",
  hashtags: "ハッシュタグ",
};

function formatCount(value: number) {
  return value.toLocaleString("ja-JP");
}

function GuestLimitCTA() {
  const [isPending, setIsPending] = useState(false);
  async function handleLogin() {
    setIsPending(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "read:user user:email",
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
      Pro プランを見る（¥980 / 月）
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
        : "text-white bg-white/10 border-white/45";
  const remainClass = isEmpty
    ? "text-red-400"
    : isLow
      ? "text-amber-400"
      : "text-white";

  return (
    <div className="mx-auto mb-2 max-w-xl text-center text-xs text-gray-300">
      <div className="inline-flex items-center justify-center gap-2">
        <span className={`font-bold px-2 py-px rounded-full border text-[10px] leading-4 tracking-wide ${tierClass}`}>
          {tierLabel}
        </span>
        <span className="whitespace-nowrap">
          {usage.tier === "guest" ? "あと" : "今月あと"} <span className={`font-bold text-sm ${remainClass}`}>{usage.remaining}</span>
          <span className="text-gray-400"> / {usage.limit} 回</span>
        </span>
      </div>
      {usage.tier === "guest" && (
        <p className="mt-2 leading-5 text-gray-400 sm:whitespace-nowrap">
          ログインなしは3回まで、GitHubログインなら月3回まで使えます。README上限はどちらも {PROJECT_TEXT_LIMITS.free.toLocaleString("ja-JP")} 文字です。
        </p>
      )}
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
  const [errorField, setErrorField] = useState<GenerateErrorField | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(initialUsage);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [repos, setRepos] = useState<import("@/app/api/repos/route").RepoItem[] | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const isLoggedIn = usage?.tier === "free" || usage?.tier === "paid";
  const isDetailsVisible = isLoggedIn;
  const projectTextLimit = getProjectTextLimit(usage?.tier ?? "guest");

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

  function clearErrorState() {
    setError(null);
    setErrorCode(null);
    setErrorField(null);
  }

  function clearFieldError(field: GenerateErrorField) {
    if (errorField === field) {
      setError(null);
      setErrorField(null);
    }
  }

  function setValidationError(field: GenerateErrorField, message: string) {
    setError(message);
    setErrorCode(null);
    setErrorField(field);
  }

  function getFieldError(field: GenerateErrorField) {
    return errorField === field ? error : null;
  }

  function getFieldLimit(field: GenerateErrorField) {
    if (field === "projectText") return projectTextLimit;
    return STATIC_FIELD_LIMITS[field];
  }

  function inputClass(field: GenerateErrorField, focusClass: string, extraClass = "") {
    const errorClass = errorField === field
      ? "border-red-500 bg-red-950/20 ring-1 ring-red-500 focus:ring-red-500"
      : focusClass;
    return `${inputBase} ${errorClass} ${extraClass}`;
  }

  function fieldMeta(field: GenerateErrorField, currentLength: number, helperText: string) {
    const fieldMessage = getFieldError(field);
    const limit = getFieldLimit(field);
    const isOverLimit = currentLength > limit;
    return (
      <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
        <p className={fieldMessage ? "font-semibold text-red-300" : "text-gray-400"}>
          {fieldMessage ?? helperText}
        </p>
        <span className={`shrink-0 tabular-nums ${isOverLimit ? "font-semibold text-red-300" : "text-gray-500"}`}>
          {formatCount(currentLength)} / {formatCount(limit)}
        </span>
      </div>
    );
  }

  async function fetchReadmeContent(targetUrl: string): Promise<string | null> {
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data as GenerateErrorResponse;
        setError(err.error ?? "README の取得に失敗しました。");
        setErrorCode(null);
        setErrorField(err.field ?? null);
        return null;
      }
      return data.content;
    } catch {
      setError("ネットワークエラーが発生しました。接続を確認してください。");
      setErrorCode(null);
      setErrorField(null);
      return null;
    }
  }

  async function loadReadmeIntoProjectText(targetUrl: string) {
    clearErrorState();
    setIsFetchingReadme(true);
    try {
      const content = await fetchReadmeContent(targetUrl);
      if (!content) return;
      setProjectText(content);
      if (content.length > projectTextLimit) {
        setValidationError("projectText", `READMEが長すぎます。現在のプランでは ${formatCount(projectTextLimit)} 文字以内にしてください。`);
      }
    } finally {
      setIsFetchingReadme(false);
    }
  }

  async function handleReadmeImport() {
    const trimmedUrl = githubUrl.trim();
    clearErrorState();
    if (isLoggedIn) {
      await handleOpenRepoModal();
      return;
    }
    if (trimmedUrl) {
      await loadReadmeIntoProjectText(trimmedUrl);
      return;
    }
    setError("GitHubリポジトリURLを入力してください。");
    setErrorCode(null);
    setErrorField(null);
  }

  async function handleGenerate(projectTextOverride?: string, urlOverride?: string) {
    const textToGenerate = projectTextOverride ?? projectText;
    const urlToGenerate = urlOverride ?? url;
    clearErrorState();
    setIsLoading(true);
    setTweets([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectText: textToGenerate, toneMemo, url: urlToGenerate, hashtags } satisfies GenerateRequest),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data as GenerateErrorResponse;
        setError(err.error ?? "エラーが発生しました。");
        setErrorCode(err.code ?? null);
        setErrorField(err.field ?? null);
        return;
      }
      setTweets((data as GenerateResponse).tweets);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      refreshUsage();
    } catch {
      setError("ネットワークエラーが発生しました。接続を確認してください。");
      setErrorCode(null);
      setErrorField(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQuickGenerate() {
    const trimmedUrl = githubUrl.trim();
    clearErrorState();
    if (!trimmedUrl) {
      setError("GitHubリポジトリURLを入力してください。");
      return;
    }

    setIsFetchingReadme(true);
    const content = await fetchReadmeContent(trimmedUrl);
    setIsFetchingReadme(false);
    if (!content) return;

    setProjectText(content);
    if (content.length > projectTextLimit) {
      setValidationError("projectText", `READMEが長すぎます。現在のプランでは ${formatCount(projectTextLimit)} 文字以内にしてください。`);
      return;
    }
    if (!url.trim()) {
      setUrl(trimmedUrl);
    }
    await handleGenerate(content, url.trim() || trimmedUrl);
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

      <section className="mx-auto">
        {!isLoggedIn && (
          <>
            <div className="mx-auto flex min-h-14 max-w-2xl items-center rounded-full bg-gray-700/80 px-6 shadow-lg shadow-black/20 ring-1 ring-white/10 transition-shadow focus-within:shadow-xl focus-within:ring-gray-500/80">
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickGenerate();
                  }
                }}
                placeholder="https://github.com/owner/repo"
                disabled={formDisabled}
                className="w-full bg-transparent text-base text-white placeholder-gray-400 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="mt-7 flex justify-center">
              <button
                onClick={handleQuickGenerate}
                disabled={formDisabled}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-700
                  bg-gray-800 px-5 text-sm font-medium text-gray-100 transition-colors
                  hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFetchingReadme ? "READMEを読んでいます..." : isLoading ? "生成中..." : "READMEからポストを作る"}
              </button>
            </div>
            <div className="mt-4 flex justify-center">
              <a
                href="https://github.com/"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
              >
                GitHubを開いてリポジトリURLをコピーする
              </a>
            </div>
          </>
        )}

      </section>

      {error && (
        <div className="mt-6 border border-red-800 bg-red-950/50 rounded-lg px-4 py-3 text-red-300 text-sm space-y-3">
          <div>
            <p className="font-semibold text-red-200">処理できませんでした</p>
            <p className="mt-1 text-red-300">{error}</p>
            {errorField && (
              <p className="mt-2 inline-flex rounded-md border border-red-700/80 bg-red-900/40 px-2 py-1 text-xs font-semibold text-red-100">
                該当項目：{FIELD_LABELS[errorField]}
              </p>
            )}
          </div>
          {errorCode === "guest_limit" && <GuestLimitCTA />}
          {errorCode === "free_limit" && <FreeLimitCTA />}
        </div>
      )}

      {usage && <div className="mt-6"><UsageBadge usage={usage} /></div>}

      {isDetailsVisible && (
        <div className="mt-4 bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">詳細設定</p>
                <p className="mt-1 text-xs text-gray-400">
                  口調、投稿URL、ハッシュタグ、説明文を調整できます。
                </p>
              </div>
            </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              READMEを読み込む
            </label>
            <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2 text-xs leading-5 text-gray-300">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                    <span>
                      {isLoggedIn
                        ? "GitHubからリポジトリを選ぶか、モーダル下部にURLを入力してREADMEを読み込めます。"
                        : "GitHubリポジトリURLを貼ると、READMEを説明欄に読み込めます。"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={handleReadmeImport}
                    disabled={formDisabled}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cyan-300/70 px-5 text-sm font-semibold
                      bg-cyan-300 text-gray-950 shadow-lg shadow-cyan-500/25 transition-all
                      hover:bg-cyan-200 hover:shadow-cyan-500/40
                      disabled:cursor-not-allowed disabled:opacity-50 sm:whitespace-nowrap"
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
                      "GitHubからREADMEを選ぶ"
                    )}
                  </button>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                    }}
                    placeholder="例：https://github.com/owner/repo"
                    disabled={formDisabled}
                    className={`${inputBase} focus:ring-cyan-500 flex-1`}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  公開リポジトリはURLだけで取得できます。非公開リポジトリは Pro プランの機能です。
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              プロジェクト説明（README） <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={8}
              value={projectText}
              onChange={(e) => {
                setProjectText(e.target.value);
                clearFieldError("projectText");
              }}
              placeholder="例：個人開発者向けのタスク管理アプリです。GitHub Issue と連携し、毎日の進捗を見える化できます。"
              disabled={formDisabled}
              className={inputClass("projectText", "focus:ring-cyan-500", "resize-none")}
            />
            {fieldMeta("projectText", projectText.length, "README全文、リリースノート、機能説明のどれでも使えます。")}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              追加プロンプト <span className="text-gray-500 font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={toneMemo}
              onChange={(e) => {
                setToneMemo(e.target.value);
                clearFieldError("toneMemo");
              }}
              placeholder="例：個人開発者向けに、少しフランクで、絵文字は控えめ"
              disabled={formDisabled}
              className={inputClass("toneMemo", "focus:ring-fuchsia-500")}
            />
            {fieldMeta("toneMemo", toneMemo.length, "生成時の口調や避けたい表現を短く指定できます。")}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL <span className="text-gray-500 font-normal">（任意）</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                clearFieldError("url");
              }}
              placeholder="例：https://example.com または https://github.com/owner/repo"
              disabled={formDisabled}
              className={inputClass("url", "focus:ring-fuchsia-500")}
            />
            {fieldMeta("url", url.length, "App Store / Google Play / GitHub / Web に対応。種別に合ったリード文が自動で付きます。")}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ハッシュタグ <span className="text-gray-500 font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => {
                setHashtags(e.target.value);
                clearFieldError("hashtags");
              }}
              placeholder="例：#個人開発 #Webアプリ #SaaS"
              disabled={formDisabled}
              className={inputClass("hashtags", "focus:ring-fuchsia-500")}
            />
            {fieldMeta("hashtags", hashtags.length, "入力したハッシュタグに加え、関連タグが最大5つ付きます。")}
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isDisabled}
            className="mx-auto w-full py-3 rounded-lg font-semibold text-sm transition-all cursor-pointer
              sm:w-1/3 sm:min-w-52
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

          <p className="text-xs leading-5 text-gray-400">
            生成結果は投稿前に必ず確認してください。URL、価格、機能名などの事実関係はご自身でのチェックをお願いします。
          </p>
        </div>
      </div>
      )}

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
          if (!url.trim()) {
            setUrl(htmlUrl);
          }
          void loadReadmeIntoProjectText(htmlUrl);
        }}
        onRepoUrlSubmit={(htmlUrl) => {
          setGithubUrl(htmlUrl);
          if (!url.trim()) {
            setUrl(htmlUrl);
          }
          void loadReadmeIntoProjectText(htmlUrl);
        }}
      />
    </>
  );
}
