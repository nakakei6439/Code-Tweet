"use client";
// AppSS — 右ペイン：アクティブスライドと選択要素の設定。
import * as React from "react";
import type {
  AppSSSlide,
  ElementId,
  ElementTransform,
  SlideLayout,
  TextElement,
} from "@/lib/appss/types";
import { LAYOUT_HINT, LAYOUT_LABEL } from "@/lib/appss/constants";
import { isTextElementId, textElementKey, toTextElementId } from "@/lib/appss/elements";
import { getElementTransform } from "./SlideCanvas";
import { ScreenshotPicker } from "./ScreenshotPicker";

const LAYOUTS: SlideLayout[] = ["hero", "device-bottom", "device-top", "two-devices", "no-device"];

const ELEMENT_LABEL: Record<string, string> = {
  caption: "見出し",
  device: "デバイス",
  deviceSecondary: "背面デバイス",
};

type Props = {
  slide: AppSSSlide;
  selectedElementId: ElementId | null;
  onUpdateSlide: (patch: Partial<AppSSSlide>) => void;
  onElementChange: (id: ElementId, t: ElementTransform) => void;
  onResetElement: (id: ElementId) => void;
  onAddTextElement: () => void;
  onDeleteTextElement: (id: string) => void;
  onUpdateTextElement: (id: string, patch: Partial<TextElement>) => void;
  onSelectElement: (id: ElementId | null) => void;
};

export function Inspector({
  slide,
  selectedElementId,
  onUpdateSlide,
  onElementChange,
  onResetElement,
  onAddTextElement,
  onDeleteTextElement,
  onUpdateTextElement,
  onSelectElement,
}: Props) {
  const selectedTransform = selectedElementId
    ? getElementTransform(slide, selectedElementId)
    : undefined;
  const selectedTextElement =
    selectedElementId && isTextElementId(selectedElementId)
      ? slide.textElements?.find((t) => t.id === textElementKey(selectedElementId))
      : undefined;

  return (
    <div className="flex h-full w-64 flex-col gap-4 overflow-y-auto border-l border-gray-800 bg-gray-950/60 p-4 text-sm">
      <section>
        <h3 className="mb-2 text-xs font-semibold text-gray-400">レイアウト</h3>
        <select
          value={slide.layout}
          onChange={(e) => onUpdateSlide({ layout: e.target.value as SlideLayout })}
          className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
        >
          {LAYOUTS.map((layout) => (
            <option key={layout} value={layout}>
              {LAYOUT_LABEL[layout]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-gray-500">{LAYOUT_HINT[slide.layout]}</p>
        <label className="mt-2 flex items-center gap-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={!!slide.inverted}
            onChange={(e) => onUpdateSlide({ inverted: e.target.checked })}
            className="accent-cyan-400"
          />
          背景を反転（ダーク）
        </label>
      </section>

      {slide.layout !== "no-device" && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400">スクリーンショット</h3>
          <ScreenshotPicker
            label="メイン画像"
            currentRef={slide.screenshotRef}
            onChange={(ref) => onUpdateSlide({ screenshotRef: ref })}
          />
          {slide.layout === "two-devices" && (
            <ScreenshotPicker
              label="背面画像"
              currentRef={slide.screenshotSecondaryRef || ""}
              onChange={(ref) => onUpdateSlide({ screenshotSecondaryRef: ref })}
            />
          )}
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400">テキスト要素</h3>
          <button
            type="button"
            onClick={onAddTextElement}
            className="rounded px-1.5 py-0.5 text-xs text-cyan-300 hover:bg-gray-800"
          >
            ＋追加
          </button>
        </div>
        {(slide.textElements || []).length === 0 ? (
          <p className="text-[11px] text-gray-600">補足テキストや装飾文字を追加できます</p>
        ) : (
          <ul className="space-y-1">
            {(slide.textElements || []).map((t) => {
              const elementId = toTextElementId(t.id);
              const active = selectedElementId === elementId;
              return (
                <li key={t.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectElement(elementId)}
                    className={`flex-1 truncate rounded px-2 py-1 text-left text-xs ${
                      active ? "bg-cyan-400/15 text-cyan-200" : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {t.text.trim() || "（空のテキスト）"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTextElement(t.id)}
                    className="h-6 w-6 rounded text-xs text-gray-500 hover:bg-gray-800 hover:text-red-300"
                    title="削除"
                    aria-label="テキスト要素を削除"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedElementId && selectedTransform && (
        <section className="border-t border-gray-800 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-400">
              選択中: {ELEMENT_LABEL[selectedElementId] || "テキスト"}
            </h3>
            <button
              type="button"
              onClick={() => onResetElement(selectedElementId)}
              className="text-[11px] text-gray-500 hover:text-gray-300"
            >
              位置をリセット
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["X", "x"],
                ["Y", "y"],
                ["幅", "width"],
                ["高さ", "height"],
              ] as const
            ).map(([label, key]) => (
              <label key={key} className="text-[11px] text-gray-500">
                {label}
                <input
                  type="number"
                  value={Math.round(selectedTransform[key])}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    onElementChange(selectedElementId, { ...selectedTransform, [key]: v });
                  }}
                  className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-1.5 py-1 text-xs text-gray-100"
                />
              </label>
            ))}
            <label className="col-span-2 text-[11px] text-gray-500">
              回転（度）
              <input
                type="number"
                value={Math.round(selectedTransform.rotation ?? 0)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  onElementChange(selectedElementId, { ...selectedTransform, rotation: v });
                }}
                className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-1.5 py-1 text-xs text-gray-100"
              />
            </label>
          </div>

          {selectedTextElement && (
            <div className="mt-3 space-y-2">
              <label className="block text-[11px] text-gray-500">
                文字サイズ
                <input
                  type="number"
                  value={selectedTextElement.fontSize ?? 79}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v) || v <= 0) return;
                    onUpdateTextElement(selectedTextElement.id, { fontSize: v });
                  }}
                  className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-1.5 py-1 text-xs text-gray-100"
                />
              </label>
              <label className="block text-[11px] text-gray-500">
                太さ
                <select
                  value={selectedTextElement.fontWeight ?? 700}
                  onChange={(e) =>
                    onUpdateTextElement(selectedTextElement.id, { fontWeight: Number(e.target.value) })
                  }
                  className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-1.5 py-1 text-xs text-gray-100"
                >
                  <option value={400}>標準</option>
                  <option value={700}>太字</option>
                  <option value={900}>極太</option>
                </select>
              </label>
              <label className="block text-[11px] text-gray-500">
                文字色
                <input
                  type="color"
                  value={selectedTextElement.color || "#ffffff"}
                  onChange={(e) => onUpdateTextElement(selectedTextElement.id, { color: e.target.value })}
                  className="mt-0.5 h-7 w-full cursor-pointer rounded border border-gray-700 bg-gray-900"
                />
              </label>
              <label className="block text-[11px] text-gray-500">
                揃え
                <select
                  value={selectedTextElement.align ?? "center"}
                  onChange={(e) =>
                    onUpdateTextElement(selectedTextElement.id, {
                      align: e.target.value as TextElement["align"],
                    })
                  }
                  className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-1.5 py-1 text-xs text-gray-100"
                >
                  <option value="left">左</option>
                  <option value="center">中央</option>
                  <option value="right">右</option>
                </select>
              </label>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
