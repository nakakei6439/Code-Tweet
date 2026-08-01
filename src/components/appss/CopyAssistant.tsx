"use client";
// AppSS — AIコピー＆デザイン生成パネル。アプリ情報から Gemini がスライド構成案と
// このアプリ専用の配色パレット（customTheme）を都度生成する（テンプレ選択ではなく生成）。
// 生成は既存の無料枠 / 購入クレジットを 1 回分消費する（/api/appss/copy）。
import { useApiErrorMessage } from "@/lib/useApiErrorMessage";
import { useTranslations } from "next-intl";
import * as React from "react";
import { postJson } from "@/lib/apiClient";
import type {
  AppSSCopyRequest,
  AppSSCopyResponse,
  AppSSCopySlideIdea,
  GeneratedPalette,
} from "@/types/appss";
import type { UsageInfo } from "@/types/usage";
import type { BackgroundStyle } from "@/lib/appss/types";

type ApplyStyle = { themeId?: string; backgroundStyle?: BackgroundStyle; generatedPalette?: GeneratedPalette };

type Props = {
  isLoggedIn: boolean;
  initialUsage: UsageInfo | null;
  slideCount: number;
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
  initialAppName,
  initialAppDescription,
  initialFeatures,
  onApplyAll,
  onApplyOne,
  onClose,
}: Props) {
  const tc = useTranslations("appssCopyAssistant");
  const resolveApiError = useApiErrorMessage();
  const tLayout = useTranslations("appssLayoutLabel");
  const [appName, setAppName] = React.useState(initialAppName ?? "");
  const [appDescription, setAppDescription] = React.useState(initialAppDescription ?? "");
  const [featuresText, setFeaturesText] = React.useState((initialFeatures ?? []).join("\n"));
  const [tone, setTone] = React.useState("");
  const [count, setCount] = React.useState(Math.min(6, Math.max(3, slideCount)));
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
      };
      if (!body.appName) {
        setError("アプリ名を入力してください。");
        return;
      }
      if (!body.appDescription) {
        setError("アプリの説明を入力してください。");
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
        <h3 className="text-base font-semibold text-fuchsia-200">✦ AIコピー＆デザイン生成</h3>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded text-gray-500 hover:bg-gray-800 hover:text-gray-200"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      {usage && (
        <p className="mb-3 text-xs text-gray-500">
          今月の残り生成回数: {Math.max(0, usage.remaining)} 回
          {usage.credits > 0 && ` ＋ クレジット ${usage.credits} 回`}
        </p>
      )}
      {!isLoggedIn && (
        <p className="mb-3 rounded-md border border-gray-800 bg-gray-900/60 px-2.5 py-2 text-xs text-gray-400">
          未ログインでもお試し生成できます。ログインすると毎月の無料枠とクレジットが使えます。
        </p>
      )}

      <div className="space-y-4">
        <label className="block text-sm text-gray-400">
          アプリ名 <span className="text-red-400">*</span>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            maxLength={50}
            placeholder="例: 家計簿サクッと"
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100 placeholder:text-gray-600"
          />
        </label>
        <label className="block text-sm text-gray-400">
          アプリの説明 <span className="text-red-400">*</span>
          <textarea
            value={appDescription}
            onChange={(e) => setAppDescription(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="どんなアプリで、誰のどんな悩みを解決するのかを書いてください"
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100 placeholder:text-gray-600"
          />
        </label>
        <label className="block text-sm text-gray-400">
          主な機能・特徴（1行に1つ・優先順）
          <textarea
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
            rows={4}
            placeholder={"例:\nレシートを撮るだけで自動記録\n夫婦で共有できる\nグラフで支出が一目でわかる"}
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100 placeholder:text-gray-600"
          />
        </label>
        <label className="block text-sm text-gray-400">
          トーン指示（任意）
          <input
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            maxLength={200}
            placeholder="例: やわらかく親しみやすい"
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100 placeholder:text-gray-600"
          />
        </label>
        <label className="block text-sm text-gray-400">
          スライド枚数
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100"
          >
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} 枚
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
          {loading ? "生成中…" : "コピー＆デザインを生成（1回分消費）"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {ideas && result && (
        <div className="mt-5 border-t border-gray-800 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-300">生成結果</h4>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() =>
                  onApplyAll(ideas, "replace", {
                    themeId: result.recommendedThemeId,
                    backgroundStyle: result.recommendedBackgroundStyle as BackgroundStyle | undefined,
                    generatedPalette: result.generatedPalette,
                  })
                }
                className="rounded bg-cyan-400/15 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-400/25"
                title="現在のスライドの見出し・配色・背景を置き換える"
              >
                全て適用
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
              このアプリ専用に配色を生成しました
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
                    title="選択中のスライドにこの見出しを適用"
                  >
                    適用
                  </button>
                </div>
                <p className="text-sm text-fuchsia-300">{idea.label}</p>
                <p className="whitespace-pre-wrap text-sm font-semibold text-gray-100">{idea.headline}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-600">
            「全て適用」は各スライドの見出し・レイアウト・配色・背景を置き換えます（スクショ画像・配置は保持）
          </p>
        </div>
      )}
    </div>
  );
}
