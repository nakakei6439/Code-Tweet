"use client";
// AppSS — AIコピー＆デザイン生成パネル。アプリ情報から Gemini がスライド構成案と
// このアプリ専用の配色パレット（customTheme）を都度生成する（テンプレ選択ではなく生成）。
// 生成は既存の無料枠 / 購入クレジットを 1 回分消費する（/api/appss/copy）。
import { useApiErrorMessage } from "@/lib/useApiErrorMessage";
import { useTranslations } from "next-intl";
import * as React from "react";
import { postJson } from "@/lib/apiClient";
import { LOCALE_LIST, type LocaleId } from "@/lib/locales";
import type {
  AppSSCopyRequest,
  AppSSCopyResponse,
  AppSSCopySlideIdea,
  GeneratedPalette,
} from "@/types/appss";
import type { UsageInfo } from "@/types/usage";
import type { BackgroundStyle } from "@/lib/appss/types";

type ApplyStyle = {
  themeId?: string;
  backgroundStyle?: BackgroundStyle;
  generatedPalette?: GeneratedPalette;
  /** 生成に使った言語。デッキの locale とフォントをこれに揃える */
  locale?: LocaleId;
};

type Props = {
  isLoggedIn: boolean;
  initialUsage: UsageInfo | null;
  slideCount: number;
  /** 現在のデッキの言語。言語セレクタの初期値に使う */
  projectLocale: LocaleId;
  // トップページの「READMEからスクショを作る」フローで来た場合の初期値。
  // ハンドオフが無い（localStorage再開・リセット直後など）場合は appName のみ
  // state.appName（既定値含む）が渡り、説明・機能は空になる。
  initialAppName?: string;
  initialAppDescription?: string;
  initialFeatures?: string[];
  onApplyAll: (ideas: AppSSCopySlideIdea[], mode: "replace" | "append", style?: ApplyStyle) => void;
  onApplyOne: (idea: AppSSCopySlideIdea) => void;
  onClose: () => void;
};

export function CopyAssistant({
  isLoggedIn,
  initialUsage,
  slideCount,
  projectLocale,
  initialAppName,
  initialAppDescription,
  initialFeatures,
  onApplyAll,
  onApplyOne,
  onClose,
}: Props) {
  const tc = useTranslations("appssCopyAssistant");
  const tae = useTranslations("apiErrors");
  const taf = useTranslations("apiErrorFields");
  const resolveApiError = useApiErrorMessage();
  const tLayout = useTranslations("appssLayoutLabel");
  const [appName, setAppName] = React.useState(initialAppName ?? "");
  const [appDescription, setAppDescription] = React.useState(initialAppDescription ?? "");
  const [featuresText, setFeaturesText] = React.useState((initialFeatures ?? []).join("\n"));
  const [tone, setTone] = React.useState("");
  const [count, setCount] = React.useState(Math.min(6, Math.max(3, slideCount)));
  // 生成コピーの言語。適用時にデッキの locale とフォントもこれに合わせる。
  const [copyLocale, setCopyLocale] = React.useState<LocaleId>(projectLocale);
  const [usage, setUsage] = React.useState<UsageInfo | null>(initialUsage);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AppSSCopyResponse | null>(null);
  const ideas = result?.slides ?? null;

  async function refreshUsage() {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) setUsage((await res.json()) as UsageInfo);
    } catch {
      /* 表示用のため失敗は無視 */
    }
  }

  async function handleGenerate() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const body: AppSSCopyRequest = {
        appName: appName.trim(),
        appDescription: appDescription.trim(),
        features: featuresText
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean)
          .slice(0, 8),
        tone: tone.trim() || undefined,
        slideCount: count,
        locale: copyLocale,
      };
      if (!body.appName) {
        setError(tae("field_required", { field: taf("appName") }));
        return;
      }
      if (!body.appDescription) {
        setError(tae("field_required", { field: taf("appDescription") }));
        return;
      }
      const outcome = await postJson<AppSSCopyResponse>("/api/appss/copy", body);
      if (!outcome.ok) {
        setError(resolveApiError(outcome.error));
        return;
      }
      setResult(outcome.data);
      void refreshUsage();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full w-[440px] flex-col overflow-y-auto border-l border-gray-800 bg-gray-950/60 p-5 text-base">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-fuchsia-200">✦ {tc("title")}</h3>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded text-gray-500 hover:bg-gray-800 hover:text-gray-200"
          aria-label={tc("close")}
        >
          ×
        </button>
      </div>

      {usage && (
        <p className="mb-3 text-xs text-gray-500">
          {tc("remaining", { n: Math.max(0, usage.remaining) })}
          {usage.credits > 0 && tc("plusCredits", { n: usage.credits })}
        </p>
      )}
      {!isLoggedIn && (
        <p className="mb-3 rounded-md border border-gray-800 bg-gray-900/60 px-2.5 py-2 text-xs text-gray-400">
          {tc("guestNote")}
        </p>
      )}

      <div className="space-y-4">
        <label className="block text-sm text-gray-400">
          {tc("appName")} <span className="text-red-400">*</span>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            maxLength={50}
            placeholder={tc("appNamePlaceholder")}
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100 placeholder:text-gray-600"
          />
        </label>
        <label className="block text-sm text-gray-400">
          {tc("appDescription")} <span className="text-red-400">*</span>
          <textarea
            value={appDescription}
            onChange={(e) => setAppDescription(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder={tc("appDescriptionPlaceholder")}
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100 placeholder:text-gray-600"
          />
        </label>
        <label className="block text-sm text-gray-400">
          {tc("features")}
          <textarea
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
            rows={4}
            placeholder={tc("featuresPlaceholder")}
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100 placeholder:text-gray-600"
          />
        </label>
        <label className="block text-sm text-gray-400">
          {tc("tone")}
          <input
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            maxLength={200}
            placeholder={tc("tonePlaceholder")}
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100 placeholder:text-gray-600"
          />
        </label>
        <label className="block text-sm text-gray-400">
          {tc("copyLocale")}
          <select
            value={copyLocale}
            onChange={(e) => setCopyLocale(e.target.value as LocaleId)}
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100"
          >
            {LOCALE_LIST.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nativeName}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-gray-500">{tc("copyLocaleHint")}</span>
        </label>
        <label className="block text-sm text-gray-400">
          {tc("slideCount")}
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100"
          >
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {tc("slidesUnit", { n })}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={loading}
          className="w-full rounded-md bg-gradient-to-r from-fuchsia-400 to-cyan-400 px-4 py-2.5 text-base font-semibold text-gray-950 hover:opacity-90 disabled:opacity-60"
        >
          {loading ? tc("generating") : tc("generate")}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {ideas && result && (
        <div className="mt-5 border-t border-gray-800 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-300">{tc("results")}</h4>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() =>
                  onApplyAll(ideas, "replace", {
                    themeId: result.recommendedThemeId,
                    backgroundStyle: result.recommendedBackgroundStyle as BackgroundStyle | undefined,
                    generatedPalette: result.generatedPalette,
                    locale: copyLocale,
                  })
                }
                className="rounded bg-cyan-400/15 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-400/25"
                title={tc("applyAllTooltip")}
              >
                {tc("applyAll")}
              </button>
              <button
                type="button"
                onClick={() => onApplyAll(ideas, "append")}
                className="rounded border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800"
                title={tc("appendTooltip")}
              >
                {tc("append")}
              </button>
            </div>
          </div>
          {result.generatedPalette && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-fuchsia-400/30 bg-fuchsia-400/5 px-3 py-2 text-sm text-fuchsia-200">
              <span className="flex shrink-0 gap-1">
                {[result.generatedPalette.bg, result.generatedPalette.accent, result.generatedPalette.fg].map(
                  (c, i) => (
                    <span
                      key={i}
                      className="h-3.5 w-3.5 rounded-full border border-white/20"
                      style={{ background: c }}
                    />
                  ),
                )}
              </span>
              {tc("paletteGenerated")}
            </div>
          )}
          <ul className="space-y-2.5">
            {ideas.map((idea, i) => (
              <li key={i} className="rounded-md border border-gray-800 bg-gray-900/50 p-3">
                <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {tc("slideNo", { n: i + 1 })} · {tLayout(idea.layoutHint)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onApplyOne(idea)}
                    className="rounded px-2 py-1 text-sm text-cyan-300 hover:bg-gray-800"
                    title={tc("applyOneTooltip")}
                  >
                    {tc("applyOne")}
                  </button>
                </div>
                <p className="text-sm text-fuchsia-300">{idea.label}</p>
                <p className="whitespace-pre-wrap text-sm font-semibold text-gray-100">{idea.headline}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-600">
            {tc("applyAllNote")}
          </p>
        </div>
      )}
    </div>
  );
}
