"use client";
// AppSS — エディタ本体。状態管理・キーボードショートカット・書き出しオーケストレーション。
// Based on MIT-licensed https://github.com/ParthJadhav/app-store-screenshots
import * as React from "react";
import type {
  AppSSSlide,
  ElementId,
  ElementTransform,
  FontId,
  SelectedElement,
  TextElement,
} from "@/lib/appss/types";
import { BEZEL, CANVAS, EXPORT_SIZES, FONTS, THEMES, themeById } from "@/lib/appss/constants";
import { isTextElementId, textElementKey } from "@/lib/appss/elements";
import { preloadImages } from "@/lib/appss/imageCache";
import { useAppSSProject } from "@/lib/appss/storage";
import { makeStarterSlides, nid } from "@/lib/appss/defaults";
import {
  captureSlide,
  computeFontEmbedCSS,
  createZip,
  downloadZip,
  slugify,
  stamp,
  waitForFonts,
  waitForPaint,
  warmupCapture,
} from "@/lib/appss/exporter";
import { exportProjectZip, importProjectZip } from "@/lib/appss/projectFile";
import type { AppSSCopySlideIdea } from "@/types/appss";
import type { UsageInfo } from "@/types/usage";
import { PreviewStage } from "./PreviewStage";
import { Sidebar } from "./Sidebar";
import { Inspector } from "./Inspector";
import { Toolbar } from "./Toolbar";
import { SlideCanvas } from "./SlideCanvas";
import { CopyAssistant } from "./CopyAssistant";

type Props = {
  isLoggedIn: boolean;
  initialUsage: UsageInfo | null;
};

export function AppSSEditor({ isLoggedIn, initialUsage }: Props) {
  const { state, setState, hydrated, savedAt, saveError, reset, undo, redo } = useAppSSProject();
  const [activeSlideId, setActiveSlideId] = React.useState<string | null>(null);
  const [selectedElement, setSelectedElement] = React.useState<SelectedElement | null>(null);
  const [exporting, setExporting] = React.useState<string | null>(null);
  const [exportSlideIndex, setExportSlideIndex] = React.useState(0);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [copyAssistantOpen, setCopyAssistantOpen] = React.useState(false);
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);
  const exportRef = React.useRef<HTMLDivElement | null>(null);

  const theme = themeById(state.themeId);
  const fontFamily = FONTS[state.fontId].cssVar;
  const slides = state.slides;
  // activeSlideId が削除済みスライドを指していても先頭へフォールバックする（補正 effect は不要）
  const activeSlide = slides.find((s) => s.id === activeSlideId) || slides[0] || null;

  // ベゼルと全スクショ参照をプリロード（解決後に再描画）
  const assetRefs = React.useMemo(() => {
    const refs = new Set<string>([BEZEL.src]);
    for (const slide of slides) {
      if (slide.screenshotRef) refs.add(slide.screenshotRef);
      if (slide.screenshotSecondaryRef) refs.add(slide.screenshotSecondaryRef);
    }
    return Array.from(refs);
  }, [slides]);

  React.useEffect(() => {
    let cancelled = false;
    void preloadImages(assetRefs).then(() => {
      if (!cancelled) forceRender();
    });
    return () => {
      cancelled = true;
    };
  }, [assetRefs]);

  // ---------- スライド更新ヘルパー ----------

  const updateSlide = React.useCallback(
    (slideId: string, patch: Partial<AppSSSlide> | ((s: AppSSSlide) => AppSSSlide)) => {
      setState((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === slideId ? (typeof patch === "function" ? patch(s) : { ...s, ...patch }) : s,
        ),
      }));
    },
    [setState],
  );

  const handleElementChange = React.useCallback(
    (slideId: string, elementId: ElementId, t: ElementTransform) => {
      updateSlide(slideId, (s) => {
        if (isTextElementId(elementId)) {
          const key = textElementKey(elementId);
          return {
            ...s,
            textElements: (s.textElements || []).map((el) =>
              el.id === key ? { ...el, transform: t } : el,
            ),
          };
        }
        return {
          ...s,
          transforms: { ...(s.transforms || {}), [elementId]: t },
        };
      });
    },
    [updateSlide],
  );

  const handleResetElement = React.useCallback(
    (slideId: string, elementId: ElementId) => {
      updateSlide(slideId, (s) => {
        if (isTextElementId(elementId)) return s;
        if (!s.transforms) return s;
        const next = { ...s.transforms };
        delete next[elementId as keyof typeof next];
        return { ...s, transforms: Object.keys(next).length ? next : undefined };
      });
    },
    [updateSlide],
  );

  const addTextElement = React.useCallback(
    (slideId: string) => {
      const id = nid();
      const element: TextElement = {
        id,
        text: "テキスト",
        transform: {
          x: CANVAS.w * 0.2,
          y: CANVAS.h * 0.42,
          width: CANVAS.w * 0.6,
          height: CANVAS.h * 0.08,
        },
      };
      updateSlide(slideId, (s) => ({
        ...s,
        textElements: [...(s.textElements || []), element],
      }));
      setSelectedElement({ slideId, elementId: `text:${id}` });
    },
    [updateSlide],
  );

  const deleteTextElement = React.useCallback(
    (slideId: string, textId: string) => {
      updateSlide(slideId, (s) => ({
        ...s,
        textElements: (s.textElements || []).filter((el) => el.id !== textId),
      }));
      setSelectedElement((sel) =>
        sel && sel.slideId === slideId && textElementKey(sel.elementId) === textId ? null : sel,
      );
    },
    [updateSlide],
  );

  const updateTextElement = React.useCallback(
    (slideId: string, textId: string, patch: Partial<TextElement>) => {
      updateSlide(slideId, (s) => ({
        ...s,
        textElements: (s.textElements || []).map((el) =>
          el.id === textId ? { ...el, ...patch } : el,
        ),
      }));
    },
    [updateSlide],
  );

  // ---------- スライド操作 ----------

  const addSlide = React.useCallback(() => {
    const starter = makeStarterSlides()[1];
    const slide: AppSSSlide = { ...starter, id: nid(), label: "新しいスライド", headline: "見出しを\n入力" };
    setState((prev) => ({ ...prev, slides: [...prev.slides, slide] }));
    setActiveSlideId(slide.id);
  }, [setState]);

  const duplicateSlide = React.useCallback(
    (slideId: string) => {
      setState((prev) => {
        const index = prev.slides.findIndex((s) => s.id === slideId);
        if (index < 0) return prev;
        const src = prev.slides[index];
        const copy: AppSSSlide = structuredClone(src);
        copy.id = nid();
        copy.textElements = copy.textElements?.map((t) => ({ ...t, id: nid() }));
        const slides = [...prev.slides];
        slides.splice(index + 1, 0, copy);
        setActiveSlideId(copy.id);
        return { ...prev, slides };
      });
    },
    [setState],
  );

  const deleteSlide = React.useCallback(
    (slideId: string) => {
      setState((prev) => {
        if (prev.slides.length <= 1) return prev;
        const slides = prev.slides.filter((s) => s.id !== slideId);
        return { ...prev, slides };
      });
      setSelectedElement((sel) => (sel?.slideId === slideId ? null : sel));
    },
    [setState],
  );

  const moveSlide = React.useCallback(
    (slideId: string, direction: -1 | 1) => {
      setState((prev) => {
        const index = prev.slides.findIndex((s) => s.id === slideId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= prev.slides.length) return prev;
        const slides = [...prev.slides];
        [slides[index], slides[target]] = [slides[target], slides[index]];
        return { ...prev, slides };
      });
    },
    [setState],
  );

  // ---------- AIコピー適用 ----------

  const applyCopyIdeas = React.useCallback(
    (ideas: AppSSCopySlideIdea[], mode: "replace" | "append") => {
      setState((prev) => {
        if (mode === "replace") {
          const slides = ideas.map((idea, i) => {
            const existing = prev.slides[i];
            return {
              id: existing?.id ?? nid(),
              layout: idea.layoutHint,
              label: idea.label,
              headline: idea.headline,
              screenshotRef: existing?.screenshotRef ?? "",
              ...(existing?.screenshotSecondaryRef !== undefined
                ? { screenshotSecondaryRef: existing.screenshotSecondaryRef }
                : {}),
              ...(existing?.inverted ? { inverted: true } : {}),
              ...(existing?.transforms ? { transforms: existing.transforms } : {}),
              ...(existing?.textElements ? { textElements: existing.textElements } : {}),
            } satisfies AppSSSlide;
          });
          return { ...prev, slides };
        }
        const appended = ideas.map(
          (idea) =>
            ({
              id: nid(),
              layout: idea.layoutHint,
              label: idea.label,
              headline: idea.headline,
              screenshotRef: "",
            }) satisfies AppSSSlide,
        );
        return { ...prev, slides: [...prev.slides, ...appended] };
      });
    },
    [setState],
  );

  const applySingleIdea = React.useCallback(
    (idea: AppSSCopySlideIdea) => {
      if (!activeSlide) return;
      updateSlide(activeSlide.id, { label: idea.label, headline: idea.headline });
    },
    [activeSlide, updateSlide],
  );

  // ---------- キーボードショートカット ----------

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (exporting) return;
      const target = e.target as HTMLElement | null;
      const editingText =
        !!target &&
        (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        if (editingText) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d" && activeSlide) {
        e.preventDefault();
        duplicateSlide(activeSlide.id);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !editingText && selectedElement) {
        if (isTextElementId(selectedElement.elementId)) {
          e.preventDefault();
          deleteTextElement(selectedElement.slideId, textElementKey(selectedElement.elementId));
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exporting, undo, redo, activeSlide, duplicateSlide, selectedElement, deleteTextElement]);

  // ---------- 書き出し ----------

  const exportSlide = slides[exportSlideIndex] || null;

  async function exportAll() {
    if (!slides.length || exporting) return;
    setExportError(null);
    setExporting("準備中");

    try {
      await preloadImages(assetRefs, { retryFailed: true });
      await waitForFonts();
      setExportSlideIndex(0);
      await waitForPaint();

      const el = exportRef.current;
      if (!el) throw new Error("書き出し用キャンバスを初期化できませんでした");

      // フォント埋め込み CSS は 1 回だけ計算して全キャプチャで再利用
      const fontEmbedCSS = await computeFontEmbedCSS(el);
      await warmupCapture(el, fontEmbedCSS);

      const zip = createZip();
      const total = EXPORT_SIZES.length * slides.length;
      let unit = 0;
      let okCount = 0;
      const errors: string[] = [];

      for (const size of EXPORT_SIZES) {
        for (let i = 0; i < slides.length; i++) {
          unit += 1;
          setExporting(`${unit}/${total}`);
          setExportSlideIndex(i);
          await waitForPaint();
          const node = exportRef.current;
          if (!node) {
            errors.push(`${size.w}×${size.h} ${i + 1}枚目: 描画先が見つかりません`);
            continue;
          }
          try {
            const dataUrl = await captureSlide(node, CANVAS.w, CANVAS.h, size.w, size.h, fontEmbedCSS);
            const base64 = dataUrl.split(",")[1] || "";
            const filename = `${String(i + 1).padStart(2, "0")}-${slides[i].layout}.png`;
            zip.file(`${size.w}x${size.h}/${filename}`, base64, { base64: true });
            okCount += 1;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${size.w}×${size.h} ${i + 1}枚目: ${msg}`);
          }
        }
      }

      if (okCount > 0) {
        await downloadZip(zip, `${slugify(state.appName)}-appstore-${stamp()}.zip`);
      }
      if (errors.length > 0) {
        setExportError(
          okCount === 0
            ? `書き出しに失敗しました: ${errors[0]}`
            : `${errors.length}枚の書き出しに失敗しました（${okCount}枚は成功）`,
        );
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "書き出しに失敗しました");
    } finally {
      setExporting(null);
    }
  }

  // ---------- Render ----------

  if (!hydrated) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">エディタを読み込み中…</p>
        </div>
      </div>
    );
  }

  const selectedElementId =
    selectedElement && activeSlide && selectedElement.slideId === activeSlide.id
      ? selectedElement.elementId
      : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[560px] flex-col">
      <Toolbar
        appName={state.appName}
        themeId={state.themeId}
        fontId={state.fontId}
        savedAt={savedAt}
        saveError={saveError}
        exporting={exporting}
        onAppNameChange={(v) => setState((prev) => ({ ...prev, appName: v }))}
        onThemeChange={(id) => {
          const nextFont = THEMES[id]?.fontId;
          setState((prev) => ({
            ...prev,
            themeId: id,
            ...(nextFont ? { fontId: nextFont } : {}),
          }));
        }}
        onFontChange={(id: FontId) => setState((prev) => ({ ...prev, fontId: id }))}
        onExport={() => void exportAll()}
        onReset={() => {
          if (window.confirm("編集内容を破棄して初期状態に戻しますか？")) {
            reset();
            setSelectedElement(null);
          }
        }}
        onExportProject={() => {
          void exportProjectZip(state).catch(() => {
            setExportError("プロジェクトの書き出しに失敗しました");
          });
        }}
        onImportProject={(file) => {
          void importProjectZip(file)
            .then((imported) => {
              setState(imported);
              setSelectedElement(null);
              setExportError(null);
            })
            .catch((e) => {
              setExportError(e instanceof Error ? e.message : "プロジェクトの読み込みに失敗しました");
            });
        }}
        onToggleCopyAssistant={() => setCopyAssistantOpen((v) => !v)}
        copyAssistantOpen={copyAssistantOpen}
      />

      {exportError && (
        <div className="border-b border-red-900/50 bg-red-950/40 px-4 py-2 text-xs text-red-300">
          {exportError}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <Sidebar
          slides={slides}
          activeSlideId={activeSlide?.id ?? null}
          theme={theme}
          fontFamily={fontFamily}
          onSelect={(id) => {
            setActiveSlideId(id);
            setSelectedElement(null);
          }}
          onAdd={addSlide}
          onDuplicate={duplicateSlide}
          onDelete={deleteSlide}
          onMove={moveSlide}
        />

        <div className="min-w-0 flex-1">
          <PreviewStage
            slides={slides}
            activeSlideId={activeSlide?.id ?? null}
            theme={theme}
            fontFamily={fontFamily}
            selectedElement={selectedElement}
            onActiveSlideChange={setActiveSlideId}
            onLabelChange={(slideId, v) => updateSlide(slideId, { label: v })}
            onHeadlineChange={(slideId, v) => updateSlide(slideId, { headline: v })}
            onTextElementTextChange={(slideId, id, v) => updateTextElement(slideId, id, { text: v })}
            onElementChange={handleElementChange}
            onSelectElement={setSelectedElement}
          />
        </div>

        {copyAssistantOpen && (
          <CopyAssistant
            isLoggedIn={isLoggedIn}
            initialUsage={initialUsage}
            slideCount={slides.length}
            onApplyAll={applyCopyIdeas}
            onApplyOne={applySingleIdea}
            onClose={() => setCopyAssistantOpen(false)}
          />
        )}

        {activeSlide && !copyAssistantOpen && (
          <Inspector
            slide={activeSlide}
            selectedElementId={selectedElementId}
            onUpdateSlide={(patch) => updateSlide(activeSlide.id, patch)}
            onElementChange={(id, t) => handleElementChange(activeSlide.id, id, t)}
            onResetElement={(id) => handleResetElement(activeSlide.id, id)}
            onAddTextElement={() => addTextElement(activeSlide.id)}
            onDeleteTextElement={(id) => deleteTextElement(activeSlide.id, id)}
            onUpdateTextElement={(id, patch) => updateTextElement(activeSlide.id, id, patch)}
            onSelectElement={(id) =>
              setSelectedElement(id ? { slideId: activeSlide.id, elementId: id } : null)
            }
          />
        )}
      </div>

      {/* 書き出し用オフスクリーンキャンバス（実寸） */}
      {exportSlide && (
        <div
          ref={exportRef}
          aria-hidden
          style={{
            position: "absolute",
            left: -99999,
            top: 0,
            width: CANVAS.w,
            height: CANVAS.h,
            fontFamily,
            pointerEvents: "none",
          }}
        >
          <SlideCanvas slide={exportSlide} theme={theme} hideEmpty />
        </div>
      )}
    </div>
  );
}
