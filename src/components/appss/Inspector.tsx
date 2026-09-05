"use client";
// AppSS — 右ペイン：アクティブスライドと選択要素の設定。
import { useTranslations } from "next-intl";
import * as React from "react";
import type {
  AppSSSlide,
  ElementId,
  ElementTransform,
  SlideLayout,
  TextElement,
} from "@/lib/appss/types";
import type { DeviceKind } from "@/lib/appss/constants";
import { isTextElementId, textElementKey, toTextElementId } from "@/lib/appss/elements";
import { getElementTransform } from "./SlideCanvas";
import { ScreenshotPicker } from "./ScreenshotPicker";

const LAYOUTS: SlideLayout[] = [
  "hero",
  "device-bottom",
  "device-top",
  "two-devices",
  "collage-duo",
  "collage-trio",
  "no-device",
];

// 値は messages の appssInspector 配下のキー（表示時に解決する）。
const ELEMENT_LABEL_KEY: Record<string, string> = {
  caption: "elementCaption",
  device: "elementDevice",
  deviceSecondary: "elementDeviceSecondary",
  deviceTertiary: "elementDeviceTertiary",
};

type Props = {
  slide: AppSSSlide;
  selectedElementId: ElementId | null;
  device?: DeviceKind;
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
  device = "iphone",
  onUpdateSlide,
  onElementChange,
  onResetElement,
  onAddTextElement,
  onDeleteTextElement,
  onUpdateTextElement,
  onSelectElement,
}: Props) {
  const ti = useTranslations("appssInspector");
  const tLayout = useTranslations("appssLayoutLabel");
  const tHint = useTranslations("appssLayoutHint");
  const selectedTransform = selectedElementId
    ? getElementTransform(slide, selectedElementId, device)
    : undefined;
  const selectedTextElement =
    selectedElementId && isTextElementId(selectedElementId)
      ? slide.textElements?.find((t) => t.id === textElementKey(selectedElementId))
      : undefined;

  return (
    <div className="flex h-full w-64 flex-col gap-4 overflow-y-auto border-l border-gray-800 bg-gray-950/60 p-4 text-sm">
      <section>
        <h3 className="mb-2 text-xs font-semibold text-gray-400">{ti("layout")}</h3>
        <select
          value={slide.layout}
          onChange={(e) => onUpdateSlide({ layout: e.target.value as SlideLayout })}
          className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
        >
          {LAYOUTS.map((layout) => (
            <option key={layout} value={layout}>
              {tLayout(layout)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-gray-500">{tHint(slide.layout)}</p>
        <label className="mt-2 flex items-center gap-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={!!slide.inverted}
            onChange={(e) => onUpdateSlide({ inverted: e.target.checked })}
            className="accent-cyan-400"
          />
          {ti("invertBackground")}
        </label>
        <div className="mt-3">
          <label className="mb-1 block text-[11px] text-gray-500">
            {ti("emphasis")} <span className="text-gray-600">{ti("emphasisHint")}</span>
          </label>
          <input
            type="text"
            value={slide.emphasis ?? ""}
            onChange={(e) => onUpdateSlide({ emphasis: e.target.value || undefined })}
            placeholder={ti("emphasisPlaceholder")}
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 placeholder:text-gray-600"
          />
          {slide.emphasis && !slide.headline.includes(slide.emphasis) && (
            <p className="mt-1 text-[10px] text-amber-400">{ti("emphasisWarning")}</p>
          )}
        </div>
      </section>

      {slide.layout !== "no-device" && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400">{ti("screenshots")}</h3>
          <ScreenshotPicker
            label={ti("mainImage")}
            currentRef={slide.screenshotRef}
            onChange={(ref) => onUpdateSlide({ screenshotRef: ref })}
          />
          {(slide.layout === "two-devices" ||
            slide.layout === "collage-duo" ||
            slide.layout === "collage-trio") && (
            <ScreenshotPicker
              label={slide.layout === "two-devices" ? ti("backImage") : ti("secondImage")}
              currentRef={slide.screenshotSecondaryRef || ""}
              onChange={(ref) => onUpdateSlide({ screenshotSecondaryRef: ref })}
            />
          )}
          {slide.layout === "collage-trio" && (
            <ScreenshotPicker
              label={ti("thirdImage")}
              currentRef={slide.screenshotTertiaryRef || ""}
              onChange={(ref) => onUpdateSlide({ screenshotTertiaryRef: ref })}
            />
          )}
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400">{ti("textElements")}</h3>
          <button
            type="button"
            onClick={onAddTextElement}
            className="rounded px-1.5 py-0.5 text-xs text-cyan-300 hover:bg-gray-800"
          >
            {ti("add")}
          </button>
        </div>
        {(slide.textElements || []).length === 0 ? (
          <p className="text-[11px] text-gray-600">{ti("textElementsHint")}</p>
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
                    {t.text.trim() || ti("emptyText")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTextElement(t.id)}
                    className="h-6 w-6 rounded text-xs text-gray-500 hover:bg-gray-800 hover:text-red-300"
                    title={ti("delete")}
                    aria-label={ti("deleteTextElement")}
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
              {ti("selected", { name: ELEMENT_LABEL_KEY[selectedElementId] ? ti(ELEMENT_LABEL_KEY[selectedElementId]) : ti("elementText") })}
            </h3>
            <button
              type="button"
              onClick={() => onResetElement(selectedElementId)}
              className="text-[11px] text-gray-500 hover:text-gray-300"
            >
              {ti("resetPosition")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["X", "x"],
                ["Y", "y"],
                [ti("width"), "width"],
                [ti("height"), "height"],
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
              {ti("rotation")}
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
                {ti("fontSize")}
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
                {ti("fontWeight")}
                <select
                  value={selectedTextElement.fontWeight ?? 700}
                  onChange={(e) =>
                    onUpdateTextElement(selectedTextElement.id, { fontWeight: Number(e.target.value) })
                  }
                  className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-1.5 py-1 text-xs text-gray-100"
                >
                  <option value={400}>{ti("weightNormal")}</option>
                  <option value={700}>{ti("weightBold")}</option>
                  <option value={900}>{ti("weightBlack")}</option>
                </select>
              </label>
              <label className="block text-[11px] text-gray-500">
                {ti("textColor")}
                <input
                  type="color"
                  value={selectedTextElement.color || "#ffffff"}
                  onChange={(e) => onUpdateTextElement(selectedTextElement.id, { color: e.target.value })}
                  className="mt-0.5 h-7 w-full cursor-pointer rounded border border-gray-700 bg-gray-900"
                />
              </label>
              <label className="block text-[11px] text-gray-500">
                {ti("align")}
                <select
                  value={selectedTextElement.align ?? "center"}
                  onChange={(e) =>
                    onUpdateTextElement(selectedTextElement.id, {
                      align: e.target.value as TextElement["align"],
                    })
                  }
                  className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-1.5 py-1 text-xs text-gray-100"
                >
                  <option value="left">{ti("alignLeft")}</option>
                  <option value="center">{ti("alignCenter")}</option>
                  <option value="right">{ti("alignRight")}</option>
                </select>
              </label>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
