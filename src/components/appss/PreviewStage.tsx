"use client";
// AppSS — 中央プレビュー。実寸キャンバスを CSS scale で縮小し、デッキ全体を横スクロールで見せる。
import { useTranslations } from "next-intl";
import * as React from "react";
import type {
  AppSSSlide,
  BackgroundStyle,
  ElementId,
  ElementTransform,
  SelectedElement,
  Theme,
} from "@/lib/appss/types";
import { CANVAS } from "@/lib/appss/constants";
import { DeckStrip } from "./SlideCanvas";

type Props = {
  slides: AppSSSlide[];
  activeSlideId: string | null;
  theme: Theme;
  backgroundStyle: BackgroundStyle;
  fontFamily: string;
  selectedElement: SelectedElement | null;
  onActiveSlideChange: (id: string) => void;
  onLabelChange: (slideId: string, v: string) => void;
  onHeadlineChange: (slideId: string, v: string) => void;
  onTextElementTextChange: (slideId: string, id: string, v: string) => void;
  onElementChange: (slideId: string, id: ElementId, t: ElementTransform) => void;
  onSelectElement: (element: SelectedElement | null) => void;
};

export function PreviewStage({
  slides,
  activeSlideId,
  theme,
  backgroundStyle,
  fontFamily,
  selectedElement,
  onActiveSlideChange,
  onLabelChange,
  onHeadlineChange,
  onTextElementTextChange,
  onElementChange,
  onSelectElement,
}: Props) {
  const tLayout = useTranslations("appssLayoutLabel");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const suppressNextPanRef = React.useRef(false);
  const [fitScale, setFitScale] = React.useState(0.2);
  const [zoom, setZoom] = React.useState(1);
  const cW = CANVAS.w;
  const cH = CANVAS.h;
  const totalW = Math.max(1, slides.length) * cW;
  const scale = fitScale * zoom;
  const activeIndex = Math.max(0, slides.findIndex((slide) => slide.id === activeSlideId));
  const activeSlide = slides[activeIndex] || slides[0] || null;

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const sx = (rect.width - 96) / cW;
      const sy = (rect.height - 96) / cH;
      setFitScale(Math.max(0.05, Math.min(sx, sy)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cW, cH]);

  // アクティブスライドを中央へスクロール（キャンバス内クリック由来の切替時は抑止）
  React.useEffect(() => {
    if (suppressNextPanRef.current) {
      suppressNextPanRef.current = false;
      return;
    }
    const scroller = scrollerRef.current;
    if (!scroller || !activeSlide) return;
    const screenLeft = activeIndex * cW * scale;
    const screenWidth = cW * scale;
    const targetLeft = Math.max(0, screenLeft - (scroller.clientWidth - screenWidth) / 2);
    scroller.scrollTo({ left: targetLeft, behavior: "smooth" });
  }, [activeIndex, activeSlide, cW, scale]);

  const handleSelectScreen = React.useCallback(
    (id: string) => {
      if (id !== activeSlideId) {
        suppressNextPanRef.current = true;
      }
      onActiveSlideChange(id);
    },
    [activeSlideId, onActiveSlideChange],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-gray-900/60">
      <div ref={scrollerRef} className="h-full w-full overflow-auto p-12">
        <div
          style={{
            width: totalW * scale,
            height: cH * scale,
            position: "relative",
            flexShrink: 0,
            filter: "drop-shadow(0 32px 42px rgba(0, 0, 0, 0.45))",
          }}
        >
          <div
            style={{
              width: totalW,
              height: cH,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              fontFamily,
            }}
          >
            <DeckStrip
              slides={slides}
              theme={theme}
              backgroundStyle={backgroundStyle}
              editable
              previewScale={scale}
              selectedElement={selectedElement}
              activeSlideId={activeSlide?.id || null}
              showGuides
              edit={{
                onLabelChange,
                onHeadlineChange,
                onTextElementTextChange,
                onElementChange,
                onSelectElement,
                onSelectScreen: handleSelectScreen,
              }}
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-md bg-gray-950/80 px-2 py-1 text-[11px] text-gray-400 shadow-sm backdrop-blur">
        <span className="font-medium text-gray-100">iPhone</span>
        {activeSlide && (
          <>
            <span aria-hidden>·</span>
            <span>{activeIndex + 1}枚目</span>
            <span aria-hidden>·</span>
            <span>{tLayout(activeSlide.layout)}</span>
          </>
        )}
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-md bg-gray-950/85 px-1.5 py-1 text-[10px] tabular-nums text-gray-400 shadow-sm backdrop-blur">
        <span className="px-1">
          {slides.length}枚 × {cW}×{cH}
        </span>
        <span aria-hidden className="text-gray-700">|</span>
        <button
          type="button"
          className="h-6 w-6 rounded text-gray-300 hover:bg-gray-800 disabled:opacity-40"
          onClick={() => setZoom((value) => Math.max(0.25, Number((value - 0.1).toFixed(2))))}
          disabled={zoom <= 0.25}
          title="縮小"
          aria-label="縮小"
        >
          −
        </button>
        <span className="min-w-10 text-center">{(scale * 100).toFixed(0)}%</span>
        <button
          type="button"
          className="h-6 w-6 rounded text-gray-300 hover:bg-gray-800 disabled:opacity-40"
          onClick={() => setZoom((value) => Math.min(2, Number((value + 0.1).toFixed(2))))}
          disabled={zoom >= 2}
          title="拡大"
          aria-label="拡大"
        >
          ＋
        </button>
        <button
          type="button"
          className="h-6 px-1.5 rounded text-gray-300 hover:bg-gray-800"
          onClick={() => setZoom(1)}
          title="全体表示"
          aria-label="全体表示"
        >
          Fit
        </button>
      </div>
    </div>
  );
}
