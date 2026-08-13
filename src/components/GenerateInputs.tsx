"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  MAX_HASHTAGS_LENGTH,
  MAX_TONE_MEMO_LENGTH,
  MAX_URL_LENGTH,
} from "@/lib/generateLimits";
import { detectReadmeUrls, URL_CATEGORY_PRIORITY, type UrlCategory } from "@/lib/urlCategory";
import type { GenerateErrorField } from "@/types/tweet";

// 並びは URL_CATEGORY_PRIORITY と揃える（自動入力の優先順位がそのまま見た目になる）。
const URL_CATEGORY_LABELS: Record<UrlCategory, string> = {
  appstore: "App Store",
  googleplay: "Google Play",
  web: "Web",
  github: "GitHub",
};

const STATIC_FIELD_LIMITS_BY_FIELD = {
  toneMemo: MAX_TONE_MEMO_LENGTH,
  url: MAX_URL_LENGTH,
  hashtags: MAX_HASHTAGS_LENGTH,
} as const;

const inputBase =
  "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed";



type Props = {
  // values + setters
  projectText: string;
  onProjectTextChange: (v: string) => void;
  toneMemo: string;
  onToneMemoChange: (v: string) => void;
  url: string;
  onUrlChange: (v: string) => void;
  hashtags: string;
  onHashtagsChange: (v: string) => void;
  githubUrl: string;
  onGithubUrlChange: (v: string) => void;

  // status
  isLoggedIn: boolean;
  formDisabled: boolean;
  isFetchingReadme: boolean;
  isLoading: boolean;
  isDisabled: boolean;
  projectTextLimit: number;

  // error
  errorField: GenerateErrorField | null;
  error: string | null;

  // handlers
  onReadmeImport: () => void;
  onQuickGenerate: () => void;
  onGenerate: () => void;
  onClearFieldError: (field: GenerateErrorField) => void;

  // labels (画面ごとに差し替え)
  quickGenerateLabel: string;
  quickFetchingLabel: string;
  generateLabel: string;

  // ハッシュタグ欄の表示制御
  showHashtags?: boolean;

  // 画面固有の追加フィールド（例: note 画面の「記事の長さ」セレクタ）
  extraFields?: ReactNode;
};

export default function GenerateInputs({
  projectText,
  onProjectTextChange,
  toneMemo,
  onToneMemoChange,
  url,
  onUrlChange,
  hashtags,
  onHashtagsChange,
  githubUrl,
  onGithubUrlChange,
  isLoggedIn,
  formDisabled,
  isFetchingReadme,
  isLoading,
  isDisabled,
  projectTextLimit,
  errorField,
  error,
  onReadmeImport,
  onQuickGenerate,
  onGenerate,
  onClearFieldError,
  quickGenerateLabel,
  quickFetchingLabel,
  generateLabel,
  showHashtags = true,
  extraFields,
}: Props) {
  const t = useTranslations("generateInputs");
  const tf = useTranslations("generateForm");
  const locale = useLocale();
  const formatCount = (value: number) => value.toLocaleString(locale);
  const detectedUrls = useMemo(() => detectReadmeUrls(projectText), [projectText]);

  function getFieldError(field: GenerateErrorField) {
    return errorField === field ? error : null;
  }

  function getFieldLimit(field: GenerateErrorField) {
    if (field === "projectText") return projectTextLimit;
    return STATIC_FIELD_LIMITS_BY_FIELD[field];
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

  return (
    <>
      {!isLoggedIn && (
        <section className="mx-auto">
          <div className="mx-auto flex min-h-14 max-w-2xl items-center rounded-full bg-gray-700/80 px-6 shadow-lg shadow-black/20 ring-1 ring-white/10 transition-shadow focus-within:shadow-xl focus-within:ring-gray-500/80">
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => onGithubUrlChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onQuickGenerate();
                }
              }}
              placeholder="https://github.com/owner/repo"
              disabled={formDisabled}
              className="w-full bg-transparent text-base text-white placeholder-gray-400 outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="mt-7 flex justify-center">
            <button
              onClick={onQuickGenerate}
              disabled={formDisabled}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-700
                bg-gray-800 px-5 text-sm font-medium text-gray-100 transition-colors
                hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFetchingReadme ? quickFetchingLabel : isLoading ? tf("generating") : quickGenerateLabel}
            </button>
          </div>
          <div className="mt-4 flex justify-center">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
            >
              {tf("openGithub")}
            </a>
          </div>
        </section>
      )}

      {isLoggedIn && (
        <div className="mt-4 bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">{t("advancedTitle")}</p>
                <p className="mt-1 text-xs text-gray-400">{t("advancedDesc")}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("loadReadme")}
              </label>
              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2 text-xs leading-5 text-gray-300">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                      </svg>
                      <span>{t("loadReadmeHelp")}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={onReadmeImport}
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
                          {t("fetching")}
                        </>
                      ) : (
                        tf("chooseRepo")
                      )}
                    </button>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => onGithubUrlChange(e.target.value)}
                      placeholder={tf("repoUrlPlaceholder")}
                      disabled={formDisabled}
                      className={`${inputBase} focus:ring-cyan-500 flex-1`}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{t("publicRepoNote")}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {tf("fieldProjectText")} <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={8}
                value={projectText}
                onChange={(e) => {
                  onProjectTextChange(e.target.value);
                  onClearFieldError("projectText");
                }}
                placeholder={t("projectTextPlaceholder")}
                disabled={formDisabled}
                className={inputClass("projectText", "focus:ring-cyan-500", "resize-none")}
              />
              {fieldMeta("projectText", projectText.length, tf("projectTextHint"))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {tf("fieldToneMemo")} <span className="text-gray-500 font-normal">{tf("optional")}</span>
              </label>
              <input
                type="text"
                value={toneMemo}
                onChange={(e) => {
                  onToneMemoChange(e.target.value);
                  onClearFieldError("toneMemo");
                }}
                placeholder={t("toneMemoPlaceholder")}
                disabled={formDisabled}
                className={inputClass("toneMemo", "focus:ring-fuchsia-500")}
              />
              {fieldMeta("toneMemo", toneMemo.length, t("toneMemoHint"))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {tf("fieldUrl")} <span className="text-gray-500 font-normal">{tf("optional")}</span>
              </label>
              <textarea
                value={url}
                onChange={(e) => {
                  onUrlChange(e.target.value.replace(/\s+/g, ""));
                  onClearFieldError("url");
                }}
                rows={2}
                placeholder={t("urlPlaceholder")}
                disabled={formDisabled}
                className={inputClass("url", "focus:ring-fuchsia-500", "resize-none [overflow-wrap:anywhere]")}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {URL_CATEGORY_PRIORITY.map((cat) => {
                  const label = URL_CATEGORY_LABELS[cat];
                  const hit = detectedUrls[cat];
                  const isActive = !!hit && !formDisabled;
                  const isSelected = !!hit && url === hit;
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={!isActive}
                      onClick={() => {
                        if (!hit) return;
                        onUrlChange(hit);
                        onClearFieldError("url");
                      }}
                      title={hit ?? t("urlNotFound")}
                      className={
                        isSelected
                          ? "rounded-md border border-cyan-500 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300 cursor-pointer"
                          : isActive
                            ? "rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:border-cyan-500 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            : "rounded-md border border-gray-800 px-3 py-1 text-xs text-gray-600 cursor-not-allowed"
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {fieldMeta("url", url.length, t("urlHint"))}
            </div>

            {showHashtags && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {tf("fieldHashtags")} <span className="text-gray-500 font-normal">{tf("optional")}</span>
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => {
                    onHashtagsChange(e.target.value);
                    onClearFieldError("hashtags");
                  }}
                  placeholder={t("hashtagsPlaceholder")}
                  disabled={formDisabled}
                  className={inputClass("hashtags", "focus:ring-fuchsia-500")}
                />
                {fieldMeta("hashtags", hashtags.length, t("hashtagsHint"))}
              </div>
            )}

            {extraFields}

            <button
              onClick={onGenerate}
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
                  {tf("generating")}
                </>
              ) : (
                generateLabel
              )}
            </button>

            <p className="text-xs leading-5 text-gray-400">{t("reviewNotice")}</p>
          </div>
        </div>
      )}
    </>
  );
}
