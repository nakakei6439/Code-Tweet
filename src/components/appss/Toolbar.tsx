"use client";
// AppSS — 上部ツールバー：アプリ名・テーマ・フォント・保存状態・書き出し。
import * as React from "react";
import type { BackgroundStyle, FontId } from "@/lib/appss/types";
import { BACKGROUND_STYLES, FONTS, THEMES } from "@/lib/appss/constants";

type Props = {
  appName: string;
  themeId: string;
  fontId: FontId;
  backgroundStyle: BackgroundStyle;
  savedAt: number | null;
  saveError: string | null;
  exporting: string | null;
  onAppNameChange: (v: string) => void;
  onThemeChange: (id: string) => void;
  onFontChange: (id: FontId) => void;
  onBackgroundStyleChange: (id: BackgroundStyle) => void;
  onExport: () => void;
  onReset: () => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
  onToggleCopyAssistant: () => void;
  copyAssistantOpen: boolean;
};

export function Toolbar({
  appName,
  themeId,
  fontId,
  backgroundStyle,
  savedAt,
  saveError,
  exporting,
  onAppNameChange,
  onThemeChange,
  onFontChange,
  onBackgroundStyleChange,
  onExport,
  onReset,
  onExportProject,
  onImportProject,
  onToggleCopyAssistant,
  copyAssistantOpen,
}: Props) {
  const importInputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-800 bg-gray-950/80 px-4 py-2">
      <input
        type="text"
        value={appName}
        onChange={(e) => onAppNameChange(e.target.value)}
        placeholder="アプリ名"
        className="w-40 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 placeholder:text-gray-600"
        aria-label="アプリ名"
      />

      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        テーマ
        <select
          value={themeId}
          onChange={(e) => onThemeChange(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
        >
          {Object.values(THEMES).map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        フォント
        <select
          value={fontId}
          onChange={(e) => onFontChange(e.target.value as FontId)}
          className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
        >
          {(Object.keys(FONTS) as FontId[]).map((id) => (
            <option key={id} value={id}>
              {FONTS[id].name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        背景
        <select
          value={backgroundStyle}
          onChange={(e) => onBackgroundStyleChange(e.target.value as BackgroundStyle)}
          className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
        >
          {BACKGROUND_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
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
        ✦ AIコピー生成
      </button>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-[11px] text-gray-500">
          {saveError
            ? `保存エラー: ${saveError}`
            : savedAt
              ? "保存済み（この端末内）"
              : ""}
        </span>
        <button
          type="button"
          onClick={onExportProject}
          className="rounded-md border border-gray-800 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-600 hover:text-gray-300"
          title="プロジェクト（JSON + 画像）を zip でバックアップ"
        >
          保存(zip)
        </button>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="rounded-md border border-gray-800 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-600 hover:text-gray-300"
          title="バックアップ zip からプロジェクトを復元"
        >
          読み込み
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
          リセット
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={!!exporting}
          className="rounded-md bg-gradient-to-r from-cyan-400 to-fuchsia-400 px-4 py-1.5 text-sm font-semibold text-gray-950 hover:opacity-90 disabled:opacity-60"
        >
          {exporting ? `書き出し中… ${exporting}` : "PNG一括書き出し"}
        </button>
      </div>
    </div>
  );
}
