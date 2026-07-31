"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GenerateInputs from "@/components/GenerateInputs";
import GenerateTabs, { type GenerateTabKey } from "@/components/GenerateTabs";
import TweetCard from "@/components/TweetCard";
import RepoSelectorModal from "@/components/RepoSelectorModal";

// note Draft 生成時にだけ使う react-markdown 系の重い依存を初期バンドルから外し、
// note タブで Draft を生成した瞬間に初めて読み込む。
const NoteCard = dynamic(() => import("@/components/NoteCard"), {
  loading: () => <div className="text-gray-400 text-sm">プレビューを準備中...</div>,
});
import { CREDIT_PACKS } from "@/lib/creditPacks";
import {
  PROJECT_TEXT_LIMITS,
  getProjectTextLimit,
} from "@/lib/generateLimits";
import {
  DEFAULT_NOTE_LENGTH_PRESET,
  NOTE_LENGTH_PRESETS,
} from "@/lib/noteLengthPresets";
import { postJson } from "@/lib/apiClient";
import { parseGitHubRepoUrl } from "@/lib/githubReadme";
import { writeHandoff } from "@/lib/appss/handoff";
import { DEFAULT_THEME_ID, THEMES } from "@/lib/appss/constants";
import { AppssUploadTray } from "@/components/appss/AppssUploadTray";
import { trackCoreAction, trackActivationOnce } from "@/lib/analytics";
import type { AppSSCopyResponse } from "@/types/appss";
import type {
  Tweet,
  GenerateRequest,
  GenerateResponse,
  GenerateErrorResponse,
  GenerateErrorCode,
  GenerateErrorField,
} from "@/types/tweet";
import type {
  NoteDraft,
  NoteLengthPreset,
  GenerateNoteRequest,
  GenerateNoteResponse,
} from "@/types/note";
import type { UsageInfo } from "@/types/usage";

type Props = {
  initialUsage: UsageInfo | null;
  initialTab: GenerateTabKey;
};

const FIELD_LABELS: Record<GenerateErrorField, string> = {
  projectText: "プロジェクト説明（README）",
  toneMemo: "追加プロンプト",
  url: "URL",
  hashtags: "ハッシュタグ",
};

type ErrorState = {
  error: string | null;
  errorCode: GenerateErrorCode | null;
  errorField: GenerateErrorField | null;
};

const EMPTY_ERROR: ErrorState = { error: null, errorCode: null, errorField: null };

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

function CreditPackCTA() {
  const smallest = CREDIT_PACKS[0];
  return (
    <Link
      href="/pricing"
      className="block w-full py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer
        bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
        text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition-opacity"
    >
      クレジットパックを見る（{smallest.credits}回 ¥{smallest.amountJpy}〜）
    </Link>
  );
}

function UsageBadge({ usage }: { usage: UsageInfo }) {
  // 生成できる残数は「月次無料枠の残り + 購入クレジット」。
  const totalRemaining = usage.remaining + usage.credits;
  const isLow = totalRemaining <= 2;
  const isEmpty = totalRemaining === 0;
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
          {usage.credits > 0 && (
            <span className="text-gray-400"> + クレジット <span className="font-bold text-sm text-white">{usage.credits}</span> 回</span>
          )}
        </span>
      </div>
      {usage.tier === "guest" && (
        <p className="mt-2 leading-5 text-gray-400 sm:whitespace-nowrap">
          ログインなしは3回まで、GitHubログインなら月3回まで使えます。ポストとnote Draftで合算カウントされます。
        </p>
      )}
      {usage.tier !== "guest" && (
        <p className="mt-2 leading-5 text-gray-400">
          月の生成回数はポストとnote Draftで合算カウントされます（README上限 {PROJECT_TEXT_LIMITS[usage.tier].toLocaleString("ja-JP")} 文字）。
        </p>
      )}
    </div>
  );
}

function LengthPresetSelector({
  value,
  onChange,
  disabled,
}: {
  value: NoteLengthPreset;
  onChange: (next: NoteLengthPreset) => void;
  disabled: boolean;
}) {
  const presetKeys = Object.keys(NOTE_LENGTH_PRESETS) as NoteLengthPreset[];
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-3">
        記事の長さ <span className="text-gray-500 font-normal">（任意）</span>
      </label>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {presetKeys.map((key) => {
          const preset = NOTE_LENGTH_PRESETS[key];
          const isActive = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              disabled={disabled}
              aria-pressed={isActive}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-4 rounded-lg border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                isActive
                  ? "border-cyan-500 bg-cyan-500/10 text-white"
                  : "border-gray-700 bg-gray-800/40 text-gray-300 hover:border-gray-500 hover:bg-gray-800/60"
              }`}
            >
              <span className="text-base font-semibold">{preset.label}</span>
              <span className={`text-xs ${isActive ? "text-cyan-200" : "text-gray-400"}`}>
                {preset.minutesLabel}
              </span>
              <span className={`text-xs tabular-nums whitespace-nowrap ${isActive ? "text-cyan-200" : "text-gray-400"}`}>
                約 {preset.min.toLocaleString("ja-JP")}〜{preset.max.toLocaleString("ja-JP")}字
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThemeChip({
  label,
  active,
  disabled,
  swatch,
  swatchBg,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  swatch?: string;
  swatchBg?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-cyan-500 bg-cyan-500/10 text-white"
          : "border-gray-700 bg-gray-800/40 text-gray-300 hover:border-gray-500 hover:bg-gray-800/60"
      }`}
    >
      {swatch && (
        <span
          aria-hidden
          className="h-3 w-3 rounded-full border border-white/20"
          style={{ background: `linear-gradient(135deg, ${swatchBg ?? "#fff"} 50%, ${swatch} 50%)` }}
        />
      )}
      {label}
    </button>
  );
}

function Hero({ activeTab }: { activeTab: GenerateTabKey }) {
  const gradient =
    "bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent";
  const title =
    activeTab === "note" ? (
      <>
        note <span className={gradient}>Draft</span>
      </>
    ) : activeTab === "appss" ? (
      <>
        App <span className={gradient}>SS</span>
      </>
    ) : (
      <>
        Code <span className={gradient}>Tweet</span>
      </>
    );
  const subtitle =
    activeTab === "note" ? (
      <>
        <span className="block">GitHubリポジトリURLを貼るだけで、</span>
        <span className="block">note.com に貼り付けられるMarkdown Draftを1本生成します。</span>
      </>
    ) : activeTab === "appss" ? (
      <>
        <span className="block">GitHubリポジトリURLを貼るだけで、</span>
        <span className="block">App Store用スクショの見出しをAIが考えます。</span>
      </>
    ) : (
      <>
        <span className="block">GitHubリポジトリURLを貼るだけで、</span>
        <span className="block">READMEから1週間分のポストを5件作成します。</span>
      </>
    );
  return (
    <>
      <h1 className="text-center text-6xl font-medium tracking-tight text-white sm:text-8xl">
        {title}
      </h1>
      <p className="mx-auto mt-5 mb-10 max-w-xl text-center text-sm leading-6 text-gray-300">
        {subtitle}
      </p>
    </>
  );
}

export default function UnifiedGenerateForm({ initialUsage, initialTab }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams?.get("tab");
  const activeTab: GenerateTabKey =
    tabParam === "note" ? "note" : tabParam === "tweet" ? "tweet" : initialTab;

  // 共通入力
  const [projectText, setProjectText] = useState("");
  const [toneMemo, setToneMemo] = useState("");
  const [url, setUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  // タブ固有入力
  const [hashtags, setHashtags] = useState("");
  const [lengthPreset, setLengthPreset] = useState<NoteLengthPreset>(DEFAULT_NOTE_LENGTH_PRESET);

  // AppSS 固有入力（ログイン時のみ利用）
  const [appssTone, setAppssTone] = useState("");
  const [appssThemeId, setAppssThemeId] = useState(""); // "" = AIおまかせ
  const [appssShots, setAppssShots] = useState<string[]>([]);
  const [appssAppName, setAppssAppName] = useState("");
  const [isExtractingAppName, setIsExtractingAppName] = useState(false);
  // ユーザーが「アプリ名」欄を手動編集したら true。以後はAI抽出結果で上書きしない。
  const appssAppNameTouchedRef = useRef(false);
  // 直近に情報推定を実行したREADME本文（同一テキストでの再実行を避ける）
  const lastExtractedReadmeRef = useRef("");
  // README から推定したアプリの説明・主な機能。トップページ上に編集欄は無く、
  // /appss エディタの「AIコピー＆デザイン生成」パネルの初期値としてハンドオフ経由で渡すだけ。
  const [appssExtractedDescription, setAppssExtractedDescription] = useState("");
  const [appssExtractedFeatures, setAppssExtractedFeatures] = useState<string[]>([]);

  // タブ固有結果
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [note, setNote] = useState<NoteDraft | null>(null);

  // タブ固有 ローディング/エラー
  const [isTweetLoading, setIsTweetLoading] = useState(false);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [isAppssLoading, setIsAppssLoading] = useState(false);
  const [tweetErrorState, setTweetErrorState] = useState<ErrorState>(EMPTY_ERROR);
  const [noteErrorState, setNoteErrorState] = useState<ErrorState>(EMPTY_ERROR);
  const [appssErrorState, setAppssErrorState] = useState<ErrorState>(EMPTY_ERROR);

  // 共通ステータス
  const [isFetchingReadme, setIsFetchingReadme] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(initialUsage);

  // Repo selector
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [repos, setRepos] = useState<import("@/app/api/repos/route").RepoItem[] | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = usage?.tier === "free" || usage?.tier === "paid";
  const projectTextLimit = getProjectTextLimit(usage?.tier ?? "guest");

  const isLoading =
    activeTab === "tweet" ? isTweetLoading : activeTab === "note" ? isNoteLoading : isAppssLoading;
  const currentErrorState =
    activeTab === "tweet" ? tweetErrorState : activeTab === "note" ? noteErrorState : appssErrorState;
  const setCurrentErrorState =
    activeTab === "tweet"
      ? setTweetErrorState
      : activeTab === "note"
        ? setNoteErrorState
        : setAppssErrorState;
  const formDisabled = isLoading || isFetchingReadme;
  const isDisabled = formDisabled || projectText.trim() === "";

  const syncTabToUrl = useCallback(
    (next: GenerateTabKey) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next === "note") {
        params.set("tab", "note");
      } else if (next === "appss") {
        params.set("tab", "appss");
      } else {
        params.delete("tab");
      }
      const query = params.toString();
      const target = query ? `${pathname}?${query}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function handleTabChange(next: GenerateTabKey) {
    if (next === activeTab) return;
    syncTabToUrl(next);
  }

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

  function clearErrorState() {
    setCurrentErrorState(EMPTY_ERROR);
  }

  function clearFieldError(field: GenerateErrorField) {
    setCurrentErrorState((prev) =>
      prev.errorField === field ? EMPTY_ERROR : prev,
    );
  }

  function setValidationError(field: GenerateErrorField, message: string) {
    setCurrentErrorState({ error: message, errorCode: null, errorField: field });
  }

  function setApiError(err: GenerateErrorResponse) {
    setCurrentErrorState({
      error: err.error ?? "エラーが発生しました。",
      errorCode: err.code ?? null,
      errorField: err.field ?? null,
    });
  }

  async function fetchReadmeContent(targetUrl: string): Promise<string | null> {
    const result = await postJson<{ content: string }>("/api/github", { url: targetUrl });
    if (!result.ok) {
      setCurrentErrorState({
        error: result.error.error ?? "README の取得に失敗しました。",
        errorCode: null,
        errorField: result.error.field ?? null,
      });
      return null;
    }
    return result.data.content;
  }

  async function loadReadmeIntoProjectText(targetUrl: string) {
    clearErrorState();
    setIsFetchingReadme(true);
    try {
      const content = await fetchReadmeContent(targetUrl);
      if (!content) return;
      setProjectText(content);
      if (content.length > projectTextLimit) {
        setValidationError(
          "projectText",
          `READMEが長すぎます。現在のプランでは ${formatCount(projectTextLimit)} 文字以内にしてください。`,
        );
      }
      // 新しいREADMEを取得した＝別プロジェクトの可能性が高いので、アプリ名の自動推定を再度許可する
      appssAppNameTouchedRef.current = false;
      void runAppssInfoExtraction(content);
    } finally {
      setIsFetchingReadme(false);
    }
  }

  // AppSS: README本文からアプリ名・説明・主な機能を推定する（App SSタブのみ）。
  // /api/appss/copy（1回消費）とは無関係の、無料・即時の軽量呼び出し。
  // - アプリ名: ユーザーが既に手入力していれば上書きしない（欄が見えているのはこれだけのため）。
  // - 説明・機能: トップページ上に編集欄が無いので、常に最新の推定結果で更新し、
  //   /appss エディタの「AIコピー＆デザイン生成」パネルの初期値としてハンドオフ経由で渡す。
  // 失敗しても無視（ユーザーが手入力すればよい・フォームは止めない）。
  async function runAppssInfoExtraction(readme: string) {
    if (activeTab !== "appss") return;
    const trimmed = readme.trim();
    if (!trimmed) return;
    if (trimmed === lastExtractedReadmeRef.current) return;
    lastExtractedReadmeRef.current = trimmed;
    setIsExtractingAppName(true);
    try {
      const result = await postJson<{
        appName: string | null;
        appDescription: string | null;
        features: string[];
      }>("/api/appss/extract-info", { readme: trimmed });
      if (result.ok) {
        if (result.data.appName && !appssAppNameTouchedRef.current) {
          setAppssAppName(result.data.appName);
        }
        setAppssExtractedDescription(result.data.appDescription ?? "");
        setAppssExtractedFeatures(result.data.features ?? []);
      }
    } finally {
      setIsExtractingAppName(false);
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
    setCurrentErrorState({
      error: "GitHubリポジトリURLを入力してください。",
      errorCode: null,
      errorField: null,
    });
  }

  async function generateTweets(projectTextOverride?: string, urlOverride?: string) {
    const textToGenerate = projectTextOverride ?? projectText;
    const urlToGenerate = urlOverride ?? url;
    clearErrorState();
    setIsTweetLoading(true);
    setTweets([]);
    try {
      const result = await postJson<GenerateResponse>("/api/generate", {
        projectText: textToGenerate, toneMemo, url: urlToGenerate, hashtags,
      } satisfies GenerateRequest);
      if (!result.ok) {
        setApiError(result.error);
        return;
      }
      setTweets(result.data.tweets);
      // ファネル: 生成成功のたびに core_action、初回のみ activation。
      trackCoreAction("tweet", result.data.tweets.length);
      trackActivationOnce();
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      refreshUsage();
    } finally {
      setIsTweetLoading(false);
    }
  }

  async function generateNote(projectTextOverride?: string, urlOverride?: string) {
    const textToGenerate = projectTextOverride ?? projectText;
    const urlToGenerate = urlOverride ?? url;
    clearErrorState();
    setIsNoteLoading(true);
    setNote(null);
    try {
      const result = await postJson<GenerateNoteResponse>("/api/generate-note", {
        projectText: textToGenerate, toneMemo, url: urlToGenerate, hashtags, lengthPreset,
      } satisfies GenerateNoteRequest);
      if (!result.ok) {
        setApiError(result.error);
        return;
      }
      setNote(result.data.note);
      // ファネル: 生成成功のたびに core_action、初回のみ activation。
      trackCoreAction("note", 1);
      trackActivationOnce();
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      refreshUsage();
    } finally {
      setIsNoteLoading(false);
    }
  }

  async function handleGenerate() {
    if (activeTab === "tweet") {
      await generateTweets();
    } else {
      await generateNote();
    }
  }

  // AppSS: リポジトリ URL → README → スクショ用コピー生成 → /appss へ受け渡し。
  // urlOverride はモーダルで選んだリポジトリ URL を直接渡す用（state 反映を待たない）。
  async function handleAppssGenerate(urlOverride?: string) {
    const trimmedUrl = (urlOverride ?? githubUrl).trim();
    const repo = parseGitHubRepoUrl(trimmedUrl);
    clearErrorState();

    setIsAppssLoading(true);
    let navigating = false;
    try {
      // ログイン時は「プロジェクト説明」欄（projectText）を優先して使う。
      // ゲスト／未読込のときは URL から README を取得する。
      let description = isLoggedIn ? projectText.trim() : "";
      if (!description) {
        if (!repo) {
          setCurrentErrorState({
            error: "GitHub のリポジトリ URL を入力してください。",
            errorCode: null,
            errorField: null,
          });
          return;
        }
        const content = await fetchReadmeContent(trimmedUrl);
        if (!content) return; // fetchReadmeContent 内でエラー表示済み
        description = content;
      }

      // 「アプリ名」欄（手入力 or README自動推定）を優先し、無ければリポジトリ名にフォールバック
      const appName = appssAppName.trim() || repo?.repo || "マイアプリ";
      const result = await postJson<AppSSCopyResponse>("/api/appss/copy", {
        appName,
        // /api/appss/copy の appDescription 上限（10,000字）に合わせて先頭を渡す
        appDescription: description.slice(0, 10000),
        features: [],
        tone: appssTone.trim(),
      });
      if (!result.ok) {
        setApiError(result.error);
        refreshUsage();
        return;
      }

      // テーマは明示選択があればそれを優先、なければ AI 推奨（未指定なら既定）。
      // 事前登録したスクショ（idb:参照）は登録順にスライドへ配置される。
      // AI 生成パレット（customTheme）はユーザーがプリセットを明示選択していない時のみ適用する。
      const chosenTheme =
        appssThemeId || result.data.recommendedThemeId || DEFAULT_THEME_ID;
      writeHandoff(
        appName,
        result.data.slides,
        chosenTheme,
        result.data.recommendedBackgroundStyle,
        appssShots,
        appssThemeId ? undefined : result.data.generatedPalette,
        appssExtractedDescription,
        appssExtractedFeatures,
      );
      trackActivationOnce();
      refreshUsage();
      navigating = true;
      router.push("/appss");
    } finally {
      // 遷移時はオーバーレイを出したままにする（成功時は false にしない）
      if (!navigating) setIsAppssLoading(false);
    }
  }

  async function handleQuickGenerate() {
    const trimmedUrl = githubUrl.trim();
    clearErrorState();
    if (!trimmedUrl) {
      setCurrentErrorState({
        error: "GitHubリポジトリURLを入力してください。",
        errorCode: null,
        errorField: null,
      });
      return;
    }

    setIsFetchingReadme(true);
    const content = await fetchReadmeContent(trimmedUrl);
    setIsFetchingReadme(false);
    if (!content) return;

    setProjectText(content);
    if (content.length > projectTextLimit) {
      setValidationError(
        "projectText",
        `READMEが長すぎます。現在のプランでは ${formatCount(projectTextLimit)} 文字以内にしてください。`,
      );
      return;
    }
    if (!url.trim()) {
      setUrl(trimmedUrl);
    }
    if (activeTab === "tweet") {
      await generateTweets(content, url.trim() || trimmedUrl);
    } else {
      await generateNote(content, url.trim() || trimmedUrl);
    }
  }

  const labels =
    activeTab === "tweet"
      ? {
          quickGenerateLabel: "READMEからポストを作る",
          quickFetchingLabel: "READMEを読んでいます...",
          generateLabel: "ポストを生成する",
          loadingTitle: "AIがポストを作成しています",
        }
      : activeTab === "appss"
        ? {
            quickGenerateLabel: "READMEからスクショを作る",
            quickFetchingLabel: "READMEを読んでいます...",
            generateLabel: "READMEからスクショを作る",
            loadingTitle: "AIがスクショの見出しを考えています",
          }
        : {
            quickGenerateLabel: "READMEからnote Draftを作る",
            quickFetchingLabel: "READMEを読んでいます...",
            generateLabel: "note Draftを生成する",
            loadingTitle: "AIがnote Draftを書いています",
          };

  const { error, errorCode, errorField } = currentErrorState;

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
                <p className="text-gray-400 text-sm mt-1">{labels.loadingTitle}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Hero activeTab={activeTab} />

      <GenerateTabs activeTab={activeTab} onChange={handleTabChange} />

      {activeTab === "appss" ? (
        isLoggedIn ? (
          <div className="mt-4 bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden">
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            <div className="p-8 space-y-6">
              <div>
                <p className="text-sm font-semibold text-white">READMEからスクショの見出しを作る</p>
                <p className="mt-1 text-xs text-gray-400">
                  GitHubからリポジトリを選ぶか、URLを入力してください。非公開リポジトリはクレジット購入者向けの機能です。
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleOpenRepoModal}
                    disabled={formDisabled}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cyan-300/70 px-5 text-sm font-semibold
                      bg-cyan-300 text-gray-950 shadow-lg shadow-cyan-500/25 transition-all
                      hover:bg-cyan-200 hover:shadow-cyan-500/40
                      disabled:cursor-not-allowed disabled:opacity-50 sm:whitespace-nowrap"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                    GitHubからREADMEを選ぶ
                  </button>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void loadReadmeIntoProjectText(githubUrl.trim());
                      }
                    }}
                    placeholder="例：https://github.com/owner/repo"
                    disabled={formDisabled}
                    className="w-full flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">アプリ名</label>
                <div className="relative">
                  <input
                    type="text"
                    value={appssAppName}
                    onChange={(e) => {
                      appssAppNameTouchedRef.current = true;
                      setAppssAppName(e.target.value);
                    }}
                    maxLength={50}
                    placeholder="例: 家計簿サクッと"
                    disabled={formDisabled}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {isExtractingAppName && (
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      読み取り中…
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  READMEから自動で読み取ります。違う場合はここで直接編集してください。
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  プロジェクト説明（README） <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={8}
                  value={projectText}
                  onChange={(e) => {
                    setProjectText(e.target.value);
                    clearFieldError("projectText");
                  }}
                  onBlur={(e) => void runAppssInfoExtraction(e.target.value)}
                  placeholder="READMEを読み込むと自動で入ります。ここを編集して、伝えたい内容に絞るとコピーの精度が上がります。"
                  disabled={formDisabled}
                  className={`w-full resize-none rounded-lg border bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    errorField === "projectText"
                      ? "border-red-500 bg-red-950/20 ring-1 ring-red-500 focus:ring-red-500"
                      : "border-gray-700 focus:ring-cyan-500"
                  }`}
                />
                <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
                  <p className={errorField === "projectText" && error ? "font-semibold text-red-300" : "text-gray-400"}>
                    {errorField === "projectText" && error
                      ? error
                      : "README全文、リリースノート、機能説明のどれでも使えます。"}
                  </p>
                  <span
                    className={`shrink-0 tabular-nums ${
                      projectText.length > projectTextLimit ? "font-semibold text-red-300" : "text-gray-500"
                    }`}
                  >
                    {formatCount(projectText.length)} / {formatCount(projectTextLimit)}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  追加プロンプト <span className="text-gray-500 font-normal">（任意）</span>
                </label>
                <textarea
                  rows={2}
                  value={appssTone}
                  maxLength={200}
                  onChange={(e) => setAppssTone(e.target.value)}
                  placeholder="例：やさしく親しみやすいトーンで。20〜30代の女性向け。"
                  disabled={formDisabled}
                  className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="mt-1.5 text-xs text-gray-500">見出しの雰囲気・ターゲットを自然文で指定できます（最大200字）。</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  配色テーマ <span className="text-gray-500 font-normal">（任意）</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <ThemeChip
                    label="AIおまかせ"
                    active={appssThemeId === ""}
                    disabled={formDisabled}
                    onClick={() => setAppssThemeId("")}
                  />
                  {Object.values(THEMES).map((theme) => (
                    <ThemeChip
                      key={theme.id}
                      label={theme.name}
                      active={appssThemeId === theme.id}
                      disabled={formDisabled}
                      swatch={theme.accent}
                      swatchBg={theme.bg}
                      onClick={() => setAppssThemeId(theme.id)}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-gray-500">「AIおまかせ」だとアプリ内容から自動で選びます（エディタで変更可）。</p>
              </div>

              <AppssUploadTray value={appssShots} onChange={setAppssShots} disabled={formDisabled} />

              <button
                onClick={() => void handleAppssGenerate()}
                disabled={formDisabled || projectText.trim() === ""}
                className="mx-auto flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all
                  sm:w-1/2 sm:min-w-52
                  bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400 text-white shadow-lg shadow-cyan-500/20
                  hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {isFetchingReadme
                  ? "READMEを読んでいます..."
                  : isAppssLoading
                    ? "見出しを生成中..."
                    : "READMEからスクショを作る"}
              </button>
              <p className="text-xs leading-5 text-gray-400">
                READMEを読んで、App Store用スクショの見出しをAIが作成します。登録したスクショは最初から配置され、エディタで差し替え・追加もできます（生成に1回分を消費します）。
              </p>
            </div>
          </div>
        ) : (
          <section className="mx-auto">
            <div className="mx-auto flex min-h-14 max-w-2xl items-center rounded-full bg-gray-700/80 px-6 shadow-lg shadow-black/20 ring-1 ring-white/10 transition-shadow focus-within:shadow-xl focus-within:ring-gray-500/80">
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAppssGenerate();
                  }
                }}
                placeholder="https://github.com/owner/repo"
                disabled={formDisabled}
                className="w-full bg-transparent text-base text-white placeholder-gray-400 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="mt-7 flex justify-center">
              <button
                onClick={() => void handleAppssGenerate()}
                disabled={formDisabled}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-700
                  bg-gray-800 px-5 text-sm font-medium text-gray-100 transition-colors
                  hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFetchingReadme
                  ? "READMEを読んでいます..."
                  : isAppssLoading
                    ? "見出しを生成中..."
                    : "READMEからスクショを作る"}
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
          </section>
        )
      ) : (
        <GenerateInputs
        projectText={projectText}
        onProjectTextChange={setProjectText}
        toneMemo={toneMemo}
        onToneMemoChange={setToneMemo}
        url={url}
        onUrlChange={setUrl}
        hashtags={hashtags}
        onHashtagsChange={setHashtags}
        githubUrl={githubUrl}
        onGithubUrlChange={setGithubUrl}
        isLoggedIn={isLoggedIn}
        formDisabled={formDisabled}
        isFetchingReadme={isFetchingReadme}
        isLoading={isLoading}
        isDisabled={isDisabled}
        projectTextLimit={projectTextLimit}
        errorField={errorField}
        error={error}
        onReadmeImport={handleReadmeImport}
        onQuickGenerate={handleQuickGenerate}
        onGenerate={handleGenerate}
        onClearFieldError={clearFieldError}
        quickGenerateLabel={labels.quickGenerateLabel}
        quickFetchingLabel={labels.quickFetchingLabel}
        generateLabel={labels.generateLabel}
        showHashtags
        extraFields={
          activeTab === "note" ? (
            <LengthPresetSelector
              value={lengthPreset}
              onChange={setLengthPreset}
              disabled={formDisabled}
            />
          ) : undefined
        }
        />
      )}

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
          {(errorCode === "free_limit" || errorCode === "paid_limit") && <CreditPackCTA />}
        </div>
      )}

      {usage && <div className="mt-6"><UsageBadge usage={usage} /></div>}

      {activeTab === "tweet" && tweets.length > 0 && (
        <div ref={resultsRef} className="mt-12">
          <p className="text-gray-400 text-sm mb-4">生成されたポスト（{tweets.length}件）</p>
          <div className="space-y-4">
            {tweets.map((tweet) => (
              <TweetCard key={tweet.id} tweet={tweet} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "note" && note && (
        <div ref={resultsRef} className="mt-12">
          <p className="text-gray-400 text-sm mb-4">生成されたnote Draft</p>
          <NoteCard note={note} />
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
          // AppSS でも README を「プロジェクト説明」欄に読み込む（生成は別ボタン）
          if (activeTab !== "appss" && !url.trim()) {
            setUrl(htmlUrl);
          }
          void loadReadmeIntoProjectText(htmlUrl);
        }}
        onRepoUrlSubmit={(htmlUrl) => {
          setGithubUrl(htmlUrl);
          if (activeTab !== "appss" && !url.trim()) {
            setUrl(htmlUrl);
          }
          void loadReadmeIntoProjectText(htmlUrl);
        }}
      />
    </>
  );
}
