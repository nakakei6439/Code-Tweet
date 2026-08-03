"use client";
// AppSS — 上部ツールバー：アプリ名・テーマ・フォント・保存状態・書き出し。
import { useTranslations } from "next-intl";
import * as React from "react";
import type { BackgroundStyle, FontId } from "@/lib/appss/types";
import { BACKGROUND_STYLES, FONTS, THEMES, fontIdsForScript } from "@/lib/appss/constants";
import { LOCALES, type LocaleId } from "@/lib/locales";
import type { UsageInfo } from "@/types/usage";

type Props = {
  appName: string;
  themeId: string;
  // AI が都度生成したアプリ専用パレットを現在採用しているか（テーマ選択の表示切り替え用）
  hasCustomTheme?: boolean;
  fontId: FontId;
  /** デッキの言語。選べるフォントを文字体系で絞るのに使う */
  locale: LocaleId;
  backgroundStyle: BackgroundStyle;
  savedAt: number | null;
  saveError: string | null;
  exporting: string | null;
  isLoggedIn: boolean;
  usage: UsageInfo | null;
  onAppNameChange: (v: string) => void;
  onThemeChange: (id: string) => void;
  onFontChange: (id: FontId) => void;
  onBackgroundStyleChange: (id: BackgroundStyle) => void;
  onExport: () => void;
  onExportUnlocked: () => void;
  onReset: () => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
  onToggleCopyAssistant: () => void;
  copyAssistantOpen: boolean;
};

export function Toolbar({
  appName,
  themeId,
  hasCustomTheme,
  fontId,
  locale,
  backgroundStyle,
  savedAt,
  saveError,
  exporting,
  isLoggedIn,
  usage,
  onAppNameChange,
  onThemeChange,
  onFontChange,
  onBackgroundStyleChange,
  onExport,
  onExportUnlocked,
  onReset,
  onExportProject,
  onImportProject,
  onToggleCopyAssistant,
  copyAssistantOpen,
}: Props) {
  const tb = useTranslations("appssToolbar");
  const tTheme = useTranslations("appssThemes");
  const tBg = useTranslations("appssBackgrounds");
  const importInputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-800 bg-gray-950/80 px-4 py-2">
      <input
        type="text"
        value={appName}
        onChange={(e) => onAppNameChange(e.target.value)}
        placeholder={tb("appNamePlaceholder")}
        className="w-40 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 placeholder:text-gray-600"
        aria-label={tb("appNamePlaceholder")}
      />

      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        {tb("theme")}
        <select
          value={hasCustomTheme ? "" : themeId}
          onChange={(e) => onThemeChange(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
        >
          {hasCustomTheme && (
            <option value="" disabled>
              {tb("aiPaletteActive")}
            </option>
          )}
          {Object.values(THEMES).map((theme) => (
            <option key={theme.id} value={theme.id}>
              {tTheme(theme.nameKey)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        {tb("font")}
        <select
          value={fontId}
          onChange={(e) => onFontChange(e.target.value as FontId)}
          className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
        >
          {/* この言語の文字体系を持つフォントだけを出す（他言語のフォントだと豆腐になる） */}
          {fontIdsForScript(LOCALES[locale].script).map((id) => (
            <option key={id} value={id}>
              {FONTS[id].name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        {tb("background")}
        <select
          value={backgroundStyle}
          onChange={(e) => onBackgroundStyleChange(e.target.value as BackgroundStyle)}
          className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
        >
          {BACKGROUND_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {tBg(s.nameKey)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onToggleCopyAssistant}
        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
          copyAssistantOpen
            ? "border-fuchsia-400 bg-fuchsia-400/10 text-fuchsia-200"
            : "border-gray-700 text-gray-300 hover:border-fuchsia-400/60 hover:text-fuchsia-200"
        }`}
      >
        {tb("aiCopy")}
      </button>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-[11px] text-gray-500">
          {saveError
            ? tb("saveError", { message: saveError })
            : savedAt
              ? tb("saved")
              : ""}
        </span>
        <button
          type="button"
          onClick={onExportProject}
          className="rounded-md border border-gray-800 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-600 hover:text-gray-300"
          title={tb("backupTooltip")}
        >
          {tb("backup")}
        </button>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="rounded-md border border-gray-800 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-600 hover:text-gray-300"
          title={tb("restoreTooltip")}
        >
          {tb("restore")}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportProject(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-gray-800 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-600 hover:text-gray-300"
        >
          {tb("reset")}
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={!!exporting}
          title={tb("exportFreeTooltip")}
          className="rounded-md border border-gray-700 px-4 py-1.5 text-sm font-semibold text-gray-200 hover:border-gray-500 disabled:opacity-60"
        >
          {exporting ? tb("exporting", { status: exporting }) : tb("exportFree")}
        </button>
        <div className="flex flex-col items-end gap-0.5">
          <button
            type="button"
            onClick={onExportUnlocked}
            disabled={!!exporting}
            title={tb("exportUnlockTooltip")}
            className="rounded-md bg-gradient-to-r from-cyan-400 to-fuchsia-400 px-4 py-1.5 text-sm font-semibold text-gray-950 hover:opacity-90 disabled:opacity-60"
          >
            {tb("exportUnlock")}
          </button>
          {usage && (
            <span className="text-[10px] text-gray-500">
              {tb("remainingFree", { n: Math.max(0, usage.remaining) })}
              {usage.credits > 0 && tb("plusCredits", { n: usage.credits })}
            </span>
          )}
          {!isLoggedIn && !usage && (
            <span className="text-[10px] text-gray-500">{tb("loginToUnlock")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
