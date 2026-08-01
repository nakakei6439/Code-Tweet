"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  forced: boolean;
  onClose: (dontShowAgain: boolean) => void;
};

// 文言は messages/*.json の onboarding 名前空間。title は \n で改行位置を指定しており、
// 言語ごとに折り返し位置を調整している（英語は日本語より横に長くなるため）。
const SLIDES = [
  { key: "slide1", emoji: "✨" },
  { key: "slide2", emoji: "🤖" },
  { key: "slide3", emoji: "🚀" },
  { key: "slide4", emoji: "📱" },
] as const;

export default function OnboardingStep({ forced, onClose }: Props) {
  const t = useTranslations("onboarding");
  const [index, setIndex] = useState(0);
  const [dontShow, setDontShow] = useState(true);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose(dontShow);
      if (e.key === "ArrowRight" && !isLast) setIndex((i) => i + 1);
      if (e.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, dontShow, isLast, index]);

  function handlePrimary() {
    if (isLast) {
      onClose(dontShow);
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 backdrop-blur-sm p-4"
      onClick={() => onClose(dontShow)}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <span className="text-[11px] font-medium text-gray-400">
            {index + 1} / {SLIDES.length}
          </span>
          <button
            onClick={() => onClose(dontShow)}
            className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {t("skip")}
          </button>
        </div>

        <div className="px-6 pt-2 pb-6 min-h-[280px] flex flex-col">
          <div className="flex justify-center text-5xl mb-4" aria-hidden>
            {slide.emoji}
          </div>
          <p className="text-[11px] font-medium text-cyan-300/80 text-center mb-2">
            {t(`${slide.key}Badge`)}
          </p>
          <h2 className="text-lg font-bold leading-snug text-center whitespace-pre-line mb-3">
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
              {t(`${slide.key}Title`)}
            </span>
          </h2>
          <p className="text-sm text-gray-400 text-center leading-relaxed">
            {t(`${slide.key}Body`)}
          </p>
        </div>

        <div className="px-6 pb-3 flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={t("goToSlide", { n: i + 1 })}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === index ? "bg-white w-6" : "bg-gray-700 w-1.5 hover:bg-gray-600"
              }`}
            />
          ))}
        </div>

        <div className="px-6 pb-3 pt-1 flex justify-center">
          <label
            className={`inline-flex items-center gap-2 text-xs select-none ${
              forced ? "text-gray-500" : "text-gray-300 cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={dontShow}
              disabled={forced}
              onChange={(e) => setDontShow(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
            />
            {t("dontShowAgain")}
          </label>
        </div>

        <div className="px-6 pb-6 pt-1 flex items-center gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {t("back")}
          </button>
          <button
            onClick={handlePrimary}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-white text-gray-900 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-100 cursor-pointer"
          >
            {isLast ? t("start") : t("next")}
          </button>
        </div>

        {forced && (
          <p className="px-6 pb-4 text-center text-[10px] text-gray-500">
            {t("previewNotice")}
          </p>
        )}
      </div>
    </div>
  );
}
