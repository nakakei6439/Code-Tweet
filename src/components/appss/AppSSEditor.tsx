"use client";
// AppSS — エディタ本体。状態管理・キーボードショートカット・書き出しオーケストレーション。
// Based on MIT-licensed https://github.com/ParthJadhav/app-store-screenshots
import { useTranslations } from "next-intl";
import { DEFAULT_LOCALE, LOCALES, type LocaleId } from "@/lib/locales";
import { useApiErrorMessage } from "@/lib/useApiErrorMessage";
import * as React from "react";
import type {
  AppSSSlide,
  BackgroundStyle,
  ElementId,
  ElementTransform,
  FontId,
  SelectedElement,
  TextElement,
} from "@/lib/appss/types";
import {
  EXPORT_SIZES,
  FONTS,
  IPAD_EXPORT_SIZES,
  MAX_SLIDES,
  THEMES,
  canvasFor,
  ipadInchesFor,
  resolveFontForScript,
  buildCustomTheme,
  themeById,
  type DeviceKind,
} from "@/lib/appss/constants";
import { isTextElementId, textElementKey } from "@/lib/appss/elements";
import { preloadImages } from "@/lib/appss/imageCache";
import { useAppSSProject } from "@/lib/appss/storage";
import { makeStarterSlides, nid } from "@/lib/appss/defaults";
import {
  captureSlide,
  commitAndVerifyOffscreen,
  computeFontEmbedCSS,
  createZip,
  downloadZip,
  slugify,
  stamp,
  waitForFonts,
  warmupCapture,
} from "@/lib/appss/exporter";
import { exportProjectZip, importProjectZip } from "@/lib/appss/projectFile";
import { postJson } from "@/lib/apiClient";
import type { AppSSCopySlideIdea, AppSSExportUnlockResponse, GeneratedPalette } from "@/types/appss";
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
  const resolveApiError = useApiErrorMessage();
  const te = useTranslations("appssEditor2");
  const { state, setState, hydrated, savedAt, saveError, reset, undo, redo, copyAssistantSeed } =
    useAppSSProject();
  const [activeSlideId, setActiveSlideId] = React.useState<string | null>(null);
  const [selectedElement, setSelectedElement] = React.useState<SelectedElement | null>(null);
  const [exporting, setExporting] = React.useState<string | null>(null);
  const [exportSlideIndex, setExportSlideIndex] = React.useState(0);
  const [exportError, setExportError] = React.useState<string | null>(null);
  // 現在実行中の書き出しに透かしを焼き込むか（無料=true、透かし解除=false）
  const [exportWatermark, setExportWatermark] = React.useState(true);
  const [copyAssistantOpen, setCopyAssistantOpen] = React.useState(false);
  // デバイス種別（iPhone / iPad）。プレビュー・書き出しの両方で参照する。
  // 仕様（spec.md 置いた前提3）に従いリロードで iPhone へ戻るため、永続化しない。
  const [deviceKind, setDeviceKind] = React.useState<DeviceKind>("iphone");
  const [usage, setUsage] = React.useState<UsageInfo | null>(initialUsage);
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);
  const exportRef = React.useRef<HTMLDivElement | null>(null);
  // 2026-09-07 スプリント 06: 書き出し用オフスクリーン DOM の現在寸法。
  // iPad の 13"/11" を切り替えるために使う。iPhone は常に canvasFor("iphone") のまま。
  const [exportDims, setExportDims] = React.useState<{ w: number; h: number }>(() => canvasFor("iphone"));

  async function refreshUsage() {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) setUsage((await res.json()) as UsageInfo);
    } catch {
      /* 表示用のため失敗は無視 */
    }
  }

  // AI が都度生成したパレット（customTheme）があればプリセットより優先して描画する
  const theme = state.customTheme ?? themeById(state.themeId);
  const projectLocale = state.locale ?? DEFAULT_LOCALE;
  const fontFamily = FONTS[state.fontId].cssVar;
  const backgroundStyle = state.backgroundStyle;
  const slides = state.slides;
  // activeSlideId が削除済みスライドを指していても先頭へフォールバックする（補正 effect は不要）
  const activeSlide = slides.find((s) => s.id === activeSlideId) || slides[0] || null;

  // 全スクショ参照をプリロード（解決後に再描画）。スプリント 04 で Apple 公式ベゼル
  // 画像は廃止したので、ベゼル URL はプリロード対象に含めない。
  const assetRefs = React.useMemo(() => {
    const refs = new Set<string>();
    for (const slide of slides) {
      if (slide.screenshotRef) refs.add(slide.screenshotRef);
      if (slide.screenshotSecondaryRef) refs.add(slide.screenshotSecondaryRef);
      if (slide.screenshotTertiaryRef) refs.add(slide.screenshotTertiaryRef);
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
      // 初期座標は選択中のデバイス種別のキャンバス寸法を基準にする（iPad モードでも
      // iPhone 座標で左上に小さく出てしまう問題を修正）。
      const canvas = canvasFor(deviceKind);
      const element: TextElement = {
        id,
        text: te("textElement"),
        transform: {
          x: canvas.w * 0.2,
          y: canvas.h * 0.42,
          width: canvas.w * 0.6,
          height: canvas.h * 0.08,
        },
      };
      updateSlide(slideId, (s) => ({
        ...s,
        textElements: [...(s.textElements || []), element],
      }));
      setSelectedElement({ slideId, elementId: `text:${id}` });
    },
    [updateSlide, te, deviceKind],
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
    if (slides.length >= MAX_SLIDES) return; // 上限（6枚）を超えて追加しない
    const starter = makeStarterSlides()[1];
    const slide: AppSSSlide = { ...starter, id: nid(), label: te("newSlideLabel"), headline: te("newSlideHeadline") };
    setState((prev) => ({ ...prev, slides: [...prev.slides, slide] }));
    setActiveSlideId(slide.id);
  }, [setState, slides.length, te]);

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
    (
      ideas: AppSSCopySlideIdea[],
      mode: "replace" | "append",
      style?: {
        themeId?: string;
        backgroundStyle?: BackgroundStyle;
        generatedPalette?: GeneratedPalette;
        locale?: LocaleId;
      },
    ) => {
      setState((prev) => {
        if (mode === "replace") {
          const slides = ideas.map((idea, i) => {
            const existing = prev.slides[i];
            return {
              id: existing?.id ?? nid(),
              layout: idea.layoutHint,
              label: idea.label,
              headline: idea.headline,
              ...(idea.emphasis ? { emphasis: idea.emphasis } : {}),
              screenshotRef: existing?.screenshotRef ?? "",
              ...(existing?.screenshotSecondaryRef !== undefined
                ? { screenshotSecondaryRef: existing.screenshotSecondaryRef }
                : {}),
              ...(existing?.screenshotTertiaryRef !== undefined
                ? { screenshotTertiaryRef: existing.screenshotTertiaryRef }
                : {}),
              ...(existing?.inverted ? { inverted: true } : {}),
              ...(existing?.transforms ? { transforms: existing.transforms } : {}),
              ...(existing?.textElements ? { textElements: existing.textElements } : {}),
            } satisfies AppSSSlide;
          });
          const themeId = style?.themeId && THEMES[style.themeId] ? style.themeId : prev.themeId;
          const customTheme = style?.generatedPalette
            ? buildCustomTheme(style.generatedPalette, THEMES[themeId]?.fontId)
            : prev.customTheme;
          // 生成した言語にデッキを合わせる。テーマ推奨フォントがその文字体系を
          // 持たない場合は既定へ差し替える（日本語フォントのままだと豆腐になる）。
          const locale = style?.locale ?? prev.locale ?? DEFAULT_LOCALE;
          const fontId = resolveFontForScript(
            THEMES[themeId]?.fontId ?? prev.fontId,
            LOCALES[locale].script,
          );
          return {
            ...prev,
            slides,
            locale,
            themeId,
            ...(customTheme ? { customTheme } : { customTheme: undefined }),
            fontId,
            backgroundStyle: style?.backgroundStyle ?? prev.backgroundStyle,
          };
        }
        const appended = ideas.map(
          (idea) =>
            ({
              id: nid(),
              layout: idea.layoutHint,
              label: idea.label,
              headline: idea.headline,
              ...(idea.emphasis ? { emphasis: idea.emphasis } : {}),
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
      // 「全て適用」と同じく emphasis / layout も反映する（以前は捨てていて挙動が非対称だった）。
      updateSlide(activeSlide.id, {
        label: idea.label,
        headline: idea.headline,
        layout: idea.layoutHint,
        ...(idea.emphasis ? { emphasis: idea.emphasis } : { emphasis: undefined }),
      });
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

  // watermark=true: 無料・常に許可（サーバー通信なし）。false: 透かし解除（有料、呼び出し元で
  // /api/appss/export-unlock によるクレジット消費が成功した後にのみ呼ばれる想定。
  async function exportAll(watermark: boolean) {
    if (!slides.length || exporting) return;
    setExportError(null);
    setExportWatermark(watermark);
    setExporting(te("preparing"));

    try {
      await preloadImages(assetRefs, { retryFailed: true });
      await waitForFonts();
      // デバイス別の書き出し設定を確定する。iPhone は 4 サイズ（1320×2868 等）、
      // iPad は 13 インチ (2064×2752) と 11 インチ (1488×2266) の 2 サイズ（2026-09-07 スプリント 06）。
      const isIpad = deviceKind === "ipad";
      const sizes = isIpad ? IPAD_EXPORT_SIZES : EXPORT_SIZES;
      const folderName = (size: { w: number; h: number }) =>
        isIpad ? `ipad-${size.w}x${size.h}` : `${size.w}x${size.h}`;
      const zipDeviceSuffix = isIpad ? "-ipad" : "";

      // 2026-09-12 attempt 3 — React state を async 関数内で「今何を撮っているか」
      // の判断材料として読み返してはいけない（await をまたぐと最新値の保証が無い）。
      // attempt 2 のバグの根因は、`exportAll` のクロージャが `exportSlideIndex` を
      // 呼出時点の値で固定し、後続の setExportSlideIndex(i) が同じクロージャ変数を
      // 更新しないことにあった。これを解消するため、ループ中はローカル変数
      // `currentSlideIndex` を単一の真実源とし、React state には「期待する値を
      // 書き戻す」用途だけに使わせる。
      //
      //   - サイズ切替時: currentSlideIndex を 0 にリセットし、
      //                   setExportSlideIndex(0) と setExportDims(offscreenDims) を
      //                   同じ flushSync 内でコミットする（それぞれを別 commit すると
      //                   中間状態が DOM に一瞬出る）。
      //   - スライド切替時: currentSlideIndex = i で setExportSlideIndex(i) をコミット。
      //   - 検証 expectation はローカル変数から組み立てる（state から逆算しない）。
      let currentSlideIndex = 0;
      const initialDims = isIpad ? sizes[0] : canvasFor(deviceKind);
      const initialReady = await commitAndVerifyOffscreen(
        {
          slideId: slides[currentSlideIndex].id,
          width: initialDims.w,
          height: initialDims.h,
        },
        () => {
          setExportSlideIndex(currentSlideIndex);
          setExportDims(initialDims);
        },
        () => exportRef.current,
        "initial",
      );
      if (!initialReady) {
        throw new Error(te("canvasInitFailed"));
      }

      const el = exportRef.current;
      if (!el) throw new Error(te("canvasInitFailed"));

      // フォント埋め込み CSS は 1 回だけ計算して全キャプチャで再利用
      const fontEmbedCSS = await computeFontEmbedCSS(el);
      await warmupCapture(el, fontEmbedCSS);

      const zip = createZip();
      const total = sizes.length * slides.length;
      let unit = 0;
      let okCount = 0;
      const errors: string[] = [];

      for (let s = 0; s < sizes.length; s++) {
        const size = sizes[s];
        // iPad のとき 13"/11" でオフスクリーン DOM の寸法と SlideCanvas 内の rect 計算を
        // 切り替える。11" は 13" 用レイアウト既定値を 11" 比率 (≈ 0.657) でリフローして
        // 再描画する（13" 描画の単純引き伸ばしスケールではない）。
        // iPhone はオフスクリーンを常に CANVAS (1320×2868) のまま据え置く。
        const offscreenDims = isIpad ? size : canvasFor(deviceKind);

        // サイズ切替: 必ずスライド 0 へ巻き戻し、寸法変更と同時にコミットする。
        // attempt 2 の旧実装は「現在の exportSlideIndex」をクロージャ越しに参照していた
        // ため、サイズ 2 周目の検証が古いスライド ID を期待値にして必ず失敗していた。
        // attempt 3 ではローカル変数を真実源にしてこれを根絶する。
        currentSlideIndex = 0;
        const sizeReady = await commitAndVerifyOffscreen(
          {
            slideId: slides[currentSlideIndex].id,
            width: offscreenDims.w,
            height: offscreenDims.h,
          },
          () => {
            // サイズとスライドを同一 commit 内で切り替える（分離すると DOM が
            // 中間状態「古い寸法・新しいスライド」になり verify が揺れる）。
            setExportSlideIndex(currentSlideIndex);
            setExportDims(offscreenDims);
          },
          () => exportRef.current,
          `size[s=${s}/${sizes.length}]=${offscreenDims.w}x${offscreenDims.h}`,
        );
        if (!sizeReady) {
          // サイズ切替で race が解決しない場合は、このサイズ内の全スライドをスキップ。
          // 2026-09-12: どのサイズが丸ごと失敗したかが伝わるよう、iPad のときは
          // 専用文言を出す（attempt 2 の「7枚失敗/7枚成功」だけだと 11" が全滅したことが
          // 読み取れない）。
          if (isIpad) {
            const inches = ipadInchesFor(size);
            errors.push(
              inches
                ? te("exportIpadBatchFailed", {
                    inches,
                    w: String(size.w),
                    h: String(size.h),
                    count: slides.length,
                  })
                : te("exportTargetMissing", { size: `${size.w}×${size.h}`, n: "1" }),
            );
            for (let k = 0; k < slides.length; k++) unit += 1;
          } else {
            for (let k = 0; k < slides.length; k++) {
              errors.push(
                te("exportTargetMissing", { size: `${size.w}×${size.h}`, n: k + 1 }),
              );
              unit += 1;
            }
          }
          continue;
        }

        for (let i = 0; i < slides.length; i++) {
          currentSlideIndex = i;
          unit += 1;
          setExporting(`${unit}/${total}`);
          // スライド切替も flushSync + 検証で同期コミット。検証成功後にのみ
          // html-to-image キャプチャを開始する。これにより attempt 1 の
          // 「1 枚前ずれ」「torn（DOM 途中状態）」フレームを根絶する。
          const slideReady = await commitAndVerifyOffscreen(
            { slideId: slides[i].id, width: offscreenDims.w, height: offscreenDims.h },
            () => {
              setExportSlideIndex(currentSlideIndex);
            },
            () => exportRef.current,
            `slide[s=${s},i=${i}/${slides.length}]`,
          );
          if (!slideReady) {
            errors.push(
              te("exportTargetMissing", { size: `${size.w}×${size.h}`, n: i + 1 }),
            );
            continue;
          }
          const node = exportRef.current;
          if (!node) {
            errors.push(te("exportTargetMissing", { size: `${size.w}×${size.h}`, n: i + 1 }));
            continue;
          }
          try {
            const dataUrl = await captureSlide(
              node,
              offscreenDims.w,
              offscreenDims.h,
              size.w,
              size.h,
              fontEmbedCSS,
            );
            const base64 = dataUrl.split(",")[1] || "";
            const filename = `${String(i + 1).padStart(2, "0")}-${slides[i].layout}.png`;
            zip.file(`${folderName(size)}/${filename}`, base64, { base64: true });
            okCount += 1;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(te("exportSlideFailed", { size: `${size.w}×${size.h}`, n: i + 1, message: msg }));
          }
        }
      }

      if (okCount > 0) {
        // 言語と（iPad のとき）デバイス種別のサフィックスを zip 名に含める。複数言語・
        // 複数デバイスを書き出したときに取り違えないようにする。
        await downloadZip(
          zip,
          `${slugify(state.appName)}-${projectLocale}-appstore${zipDeviceSuffix}-${stamp()}.zip`,
        );
      }
      if (errors.length > 0) {
        setExportError(
          okCount === 0
            ? te("exportFailedOne", { reason: errors[0] })
            : te("exportFailedMany", { failed: errors.length, ok: okCount }),
        );
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : te("exportFailed"));
    } finally {
      setExporting(null);
    }
  }

  // 透かし解除書き出し。まずクレジット消費の許可を取り、通れば透かし無しで exportAll する。
  // 画像は一切送信しない（許可チェックのみのAPI）。
  async function exportUnlocked() {
    if (!slides.length || exporting) return;
    setExportError(null);
    setExporting(te("checking"));
    const outcome = await postJson<AppSSExportUnlockResponse>("/api/appss/export-unlock", {});
    if (!outcome.ok) {
      setExporting(null);
      setExportError(resolveApiError(outcome.error));
      return;
    }
    void refreshUsage();
    await exportAll(false);
  }

  // ---------- Render ----------

  if (!hydrated) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">{te("loadingEditor")}</p>
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
        hasCustomTheme={!!state.customTheme}
        fontId={state.fontId}
        locale={projectLocale}
        backgroundStyle={backgroundStyle}
        savedAt={savedAt}
        saveError={saveError}
        exporting={exporting}
        onAppNameChange={(v) => setState((prev) => ({ ...prev, appName: v }))}
        onThemeChange={(id) => {
          const nextFont = THEMES[id]?.fontId;
          // プリセットを手動選択した場合は AI 生成パレット(customTheme)を解除する
          setState((prev) => ({
            ...prev,
            themeId: id,
            customTheme: undefined,
            ...(nextFont ? { fontId: nextFont } : {}),
          }));
        }}
        onFontChange={(id: FontId) => setState((prev) => ({ ...prev, fontId: id }))}
        onBackgroundStyleChange={(id) => setState((prev) => ({ ...prev, backgroundStyle: id }))}
        onExport={() => void exportAll(true)}
        onExportUnlocked={() => void exportUnlocked()}
        usage={usage}
        isLoggedIn={isLoggedIn}
        onReset={() => {
          if (window.confirm(te("resetConfirm"))) {
            reset();
            setSelectedElement(null);
          }
        }}
        onExportProject={() => {
          void exportProjectZip(state).catch(() => {
            setExportError(te("projectExportFailed"));
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
              setExportError(e instanceof Error ? e.message : te("projectImportFailed"));
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
          backgroundStyle={backgroundStyle}
          fontFamily={fontFamily}
          device={deviceKind}
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
            backgroundStyle={backgroundStyle}
            fontFamily={fontFamily}
            selectedElement={selectedElement}
            device={deviceKind}
            onDeviceChange={setDeviceKind}
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
            initialAppName={state.appName}
            initialAppDescription={copyAssistantSeed?.appDescription ?? ""}
            initialFeatures={copyAssistantSeed?.features ?? []}
            projectLocale={projectLocale}
            onApplyAll={applyCopyIdeas}
            onApplyOne={applySingleIdea}
            onClose={() => setCopyAssistantOpen(false)}
          />
        )}

        {activeSlide && !copyAssistantOpen && (
          <Inspector
            slide={activeSlide}
            selectedElementId={selectedElementId}
            device={deviceKind}
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

      {/* 書き出し用オフスクリーンキャンバス（実寸）。選択中のデバイス種別のキャンバス寸法で
          描画する。iPhone は 1320×2868 固定、iPad は exportDims で 13"/11" を切り替える
          （2026-09-07 スプリント 06）。SlideCanvas に exportCanvas を渡して 11" 比率で
          rect をリフローする（13" 描画の単純引き伸ばしスケールではない）。
          2026-09-07 スプリント 06 attempt 2: data-export-* 属性を output して
          commitAndVerifyOffscreen が「これから撮るスライド・寸法」を実 DOM から
          読み戻して検証できるようにする。これが無いと React commit と
          html-to-image クローンが非同期で race する。 */}
      {exportSlide && (
        <div
          ref={exportRef}
          aria-hidden
          data-export-slide-id={exportSlide.id}
          data-export-w={String(exportDims.w)}
          data-export-h={String(exportDims.h)}
          style={{
            position: "absolute",
            left: -99999,
            top: 0,
            width: exportDims.w,
            height: exportDims.h,
            fontFamily,
            pointerEvents: "none",
          }}
        >
          <SlideCanvas
            slide={exportSlide}
            theme={theme}
            backgroundStyle={backgroundStyle}
            hideEmpty
            watermark={exportWatermark}
            device={deviceKind}
            exportCanvas={deviceKind === "ipad" ? exportDims : undefined}
          />
        </div>
      )}
    </div>
  );
}
