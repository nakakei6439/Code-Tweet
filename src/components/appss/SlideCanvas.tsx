"use client";
// AppSS — スライドキャンバス描画（1320×2868 の実寸 DOM を CSS scale で表示）。
// Based on MIT-licensed https://github.com/ParthJadhav/app-store-screenshots
// (iPhone 縦向き・単一ロケール・日本語タイポグラフィ向けに簡約)
import { useTranslations } from "next-intl";
import * as React from "react";
import { Rnd } from "react-rnd";
import type {
  AppSSSlide,
  BackgroundStyle,
  BuiltInElementId,
  ElementId,
  ElementTransform,
  SelectedElement,
  TextElement,
  Theme,
} from "@/lib/appss/types";
import {
  DEFAULT_BACKGROUND_STYLE,
  bezelRatioFor,
  canvasFor,
  phoneW,
  phoneWSmall,
  type DeviceKind,
} from "@/lib/appss/constants";
import { toTextElementId } from "@/lib/appss/elements";
import { DeviceFrame } from "./DeviceFrame";

type EditHandlers = {
  onLabelChange?: (v: string) => void;
  onHeadlineChange?: (v: string) => void;
  onTextElementTextChange?: (id: string, v: string) => void;
  onElementChange?: (id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (id: ElementId | null) => void;
};

type DeckEditHandlers = {
  onLabelChange?: (slideId: string, v: string) => void;
  onHeadlineChange?: (slideId: string, v: string) => void;
  onTextElementTextChange?: (slideId: string, id: string, v: string) => void;
  onElementChange?: (slideId: string, id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (element: SelectedElement | null) => void;
  onSelectScreen?: (slideId: string) => void;
};

// ---------- インライン編集テキスト ----------

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 強調ワードをアクセント色の span で囲んだ HTML を生成（一致しなければプレーン）。
// value は自前で escape するので XSS の心配はない。
function emphasisHtml(value: string, emphasis: string | undefined, color: string): string {
  if (!emphasis) return escapeHtml(value);
  const idx = value.indexOf(emphasis);
  if (idx < 0) return escapeHtml(value);
  return (
    escapeHtml(value.slice(0, idx)) +
    `<span style="color:${color}">` +
    escapeHtml(value.slice(idx, idx + emphasis.length)) +
    "</span>" +
    escapeHtml(value.slice(idx + emphasis.length))
  );
}

function EditableText({
  value,
  editable,
  onChange,
  style,
  multiline = false,
  placeholder,
  onFocus,
  emphasis,
  emphasisColor,
}: {
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  // 指定時は value 内の一致部分をアクセント色で描画（非フォーカス時のみ）。
  emphasis?: string;
  emphasisColor?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  // フォーカス外の表示を同期する。emphasis 指定時は色付き HTML、通常は textContent。
  const syncDisplay = React.useCallback(
    (el: HTMLDivElement) => {
      const incoming = value || "";
      if (emphasis && emphasisColor) {
        const html = emphasisHtml(incoming, emphasis, emphasisColor);
        if (el.innerHTML !== html) el.innerHTML = html;
      } else if (el.textContent !== incoming) {
        el.textContent = incoming;
      }
    },
    [value, emphasis, emphasisColor],
  );

  React.useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    syncDisplay(el);
  }, [syncDisplay]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!onChange) return;
    const text = (e.currentTarget.innerText || "").replace(/\u00a0/g, " ");
    onChange(multiline ? text : text.replace(/\n/g, ""));
  };

  return (
    <div
      ref={ref}
      contentEditable={editable}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={handleInput}
      onFocus={(e) => {
        // 編集開始時は色付き span を外してプレーンにする（キャレット安定のため）
        if (emphasis && emphasisColor && e.currentTarget.textContent !== value) {
          e.currentTarget.textContent = value || "";
        }
        onFocus?.();
      }}
      onBlur={(e) => {
        // 編集終了時に色付き表示へ戻す
        if (emphasis && emphasisColor) syncDisplay(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onMouseDown={(e) => {
        // Rnd のドラッグを開始せずにテキスト編集へ入る
        if (editable) {
          e.stopPropagation();
          onFocus?.();
        }
      }}
      onPointerDown={(e) => {
        if (editable) e.stopPropagation();
      }}
      style={{
        outline: "none",
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        cursor: editable ? "text" : "default",
        ...style,
      }}
    />
  );
}

// ---------- キャプション（ラベル + 見出し） ----------
// 日本語調整: uppercase 廃止、letterSpacing 0.1em、行間 1.28、見出し 900

function Caption({
  cW,
  cH,
  slide,
  theme,
  editable,
  edit,
  align = "center",
  inverted,
  onFocus,
}: {
  cW: number;
  cH: number;
  slide: AppSSSlide;
  theme: Theme;
  editable?: boolean;
  edit?: EditHandlers;
  align?: "center" | "left";
  inverted?: boolean;
  onFocus?: () => void;
}) {
  const tcv = useTranslations("appssCanvas");
  const fg = inverted ? theme.fgAlt : theme.fg;
  const unit = Math.min(cW, cH);
  return (
    <div style={{ textAlign: align, position: "relative", width: "100%" }}>
      <EditableText
        value={slide.label}
        editable={editable}
        onChange={edit?.onLabelChange}
        onFocus={onFocus}
        placeholder={tcv("labelPlaceholder")}
        style={{
          fontSize: unit * 0.03,
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: theme.accent,
          marginBottom: unit * 0.02,
          minHeight: unit * 0.03,
        }}
      />
      <EditableText
        value={slide.headline}
        editable={editable}
        multiline
        onChange={edit?.onHeadlineChange}
        onFocus={onFocus}
        placeholder={tcv("headlinePlaceholder")}
        emphasis={slide.emphasis}
        emphasisColor={theme.accent}
        style={{
          fontSize: unit * 0.088,
          fontWeight: 900,
          lineHeight: 1.28,
          letterSpacing: "0.01em",
          color: fg,
        }}
      />
    </div>
  );
}

// ---------- 背景 ----------

function shade(hex: string, percent: number) {
  const c = hex.replace("#", "");
  const num = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const amt = Math.round((255 * percent) / 100);
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function backgroundFor(theme: Theme, inverted?: boolean) {
  if (inverted) {
    return `linear-gradient(160deg, ${theme.bgAlt} 0%, ${shade(theme.bgAlt, -8)} 100%)`;
  }
  return `linear-gradient(160deg, ${theme.bg} 0%, ${shade(theme.bg, -6)} 100%)`;
}

// ソフトな光彩。CSS filter:blur() は Safari の foreignObject→canvas 描画
// （html-to-image が使う方式）で全体が黒化する既知バグがあるため、
// フィルターを使わず radial-gradient で同等のぼかしを表現する。
function Blob({
  color,
  x,
  y,
  size,
  opacity = 0.4,
}: {
  color: string;
  x: number;
  y: number;
  size: number;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        background: `radial-gradient(circle at center, ${color} 0%, transparent 68%)`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

// 背景装飾。全て CSS グラデ/影のみ（filter:blur 不使用）で export 安全。
function BackgroundDecor({
  style,
  accent,
  inverted,
}: {
  style: BackgroundStyle;
  accent: string;
  inverted?: boolean;
}) {
  switch (style) {
    case "plain":
      return null;
    case "grid":
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: inverted ? 0.18 : 0.12,
            backgroundImage: `radial-gradient(${accent} 1.5px, transparent 1.6px)`,
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(120% 90% at 50% 20%, #000 55%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(120% 90% at 50% 20%, #000 55%, transparent 100%)",
          }}
        />
      );
    case "spotlight":
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(80% 55% at 50% 8%, ${accent} 0%, transparent 60%)`,
            opacity: inverted ? 0.4 : 0.5,
          }}
        />
      );
    case "stripes":
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: inverted ? 0.16 : 0.12,
            background: `repeating-linear-gradient(-45deg, ${accent} 0 3%, transparent 3% 9%)`,
          }}
        />
      );
    case "soft":
    default:
      return (
        <>
          <Blob color={accent} x={-15} y={-10} size={70} opacity={inverted ? 0.35 : 0.42} />
          <Blob color={accent} x={65} y={70} size={60} opacity={inverted ? 0.28 : 0.35} />
        </>
      );
  }
}

function SlideBackground({
  slide,
  theme,
  backgroundStyle,
}: {
  slide: AppSSSlide;
  theme: Theme;
  backgroundStyle: BackgroundStyle;
}) {
  const inverted = !!slide.inverted;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: backgroundFor(theme, inverted),
        color: inverted ? theme.fgAlt : theme.fg,
      }}
    >
      <BackgroundDecor style={backgroundStyle} accent={theme.accent} inverted={inverted} />
    </div>
  );
}

// ---------- レイアウトごとの既定配置 ----------

// rotation/zIndex はレイアウトの既定傾き用（例: collage-duo）。
// スライド側で個別に transforms を設定していれば、そちらが優先される（rectFor/getElementTransform 参照）。
type Rect = { x: number; y: number; width: number; height: number; rotation?: number; zIndex?: number };
type LayoutRects = {
  caption?: Rect & { align?: "center" | "left" };
  device?: Rect;
  deviceSecondary?: Rect;
  deviceTertiary?: Rect;
};

function getDefaultRects(layout: AppSSSlide["layout"], kind: DeviceKind = "iphone"): LayoutRects {
  const canvas = canvasFor(kind);
  const cW = canvas.w;
  const cH = canvas.h;
  const ratio = bezelRatioFor(kind);
  const deviceW = phoneW(cW, cH, 0.84, kind) * cW;
  const deviceH = deviceW / ratio;
  const smallW = phoneWSmall(cW, cH, kind) * cW;
  const smallH = smallW / ratio;
  const capW = cW * 0.84;
  const capH = cH * 0.28;

  switch (layout) {
    case "hero":
      return {
        caption: { x: cW * 0.08, y: cH * 0.09, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: cH - deviceH + deviceH * 0.15,
          width: deviceW,
          height: deviceH,
        },
      };
    case "device-bottom":
      return {
        caption: { x: cW * 0.08, y: cH * 0.08, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: cH - deviceH - cH * 0.02,
          width: deviceW,
          height: deviceH,
        },
      };
    case "device-top":
      return {
        caption: { x: cW * 0.08, y: cH * 0.65, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: -cH * 0.1,
          width: deviceW,
          height: deviceH,
        },
      };
    case "two-devices":
      return {
        caption: { x: cW * 0.08, y: cH * 0.08, width: capW, height: capH, align: "center" },
        deviceSecondary: {
          x: -cW * 0.06,
          y: cH - smallH - cH * 0.05,
          width: smallW,
          height: smallH,
        },
        device: {
          x: cW - deviceW * 0.9 + cW * 0.06,
          y: cH - deviceH * 0.9 - cH * 0.02,
          width: deviceW * 0.9,
          height: (deviceW * 0.9) / ratio,
        },
      };
    case "collage-duo": {
      // 2台を大胆に反対向きへ傾けて重ねる。見出しは上部で両画面をまたぐ。
      const duoW = phoneW(cW, cH, 0.6, kind) * cW;
      const duoH = duoW / ratio;
      return {
        caption: { x: cW * 0.06, y: cH * 0.06, width: cW * 0.88, height: cH * 0.18, align: "center" },
        deviceSecondary: {
          x: cW * 0.04,
          y: cH * 0.3,
          width: duoW,
          height: duoH,
          rotation: -10,
          zIndex: 2,
        },
        device: {
          x: cW - duoW - cW * 0.04,
          y: cH * 0.34,
          width: duoW,
          height: duoH,
          rotation: 9,
          zIndex: 3,
        },
      };
    }
    case "collage-trio": {
      // 3台を扇状に配置。中央は正立・大きめ・最前面、左右は傾けて背面に。
      const centerW = phoneW(cW, cH, 0.5, kind) * cW;
      const centerH = centerW / ratio;
      const sideW = phoneW(cW, cH, 0.42, kind) * cW;
      const sideH = sideW / ratio;
      return {
        caption: { x: cW * 0.06, y: cH * 0.06, width: cW * 0.88, height: cH * 0.18, align: "center" },
        deviceSecondary: {
          x: cW * 0.02,
          y: cH * 0.34,
          width: sideW,
          height: sideH,
          rotation: -14,
          zIndex: 1,
        },
        deviceTertiary: {
          x: cW - sideW - cW * 0.02,
          y: cH * 0.34,
          width: sideW,
          height: sideH,
          rotation: 14,
          zIndex: 2,
        },
        device: {
          x: (cW - centerW) / 2,
          y: cH * 0.42,
          width: centerW,
          height: centerH,
          zIndex: 3,
        },
      };
    }
    case "no-device":
      return {
        caption: { x: cW * 0.1, y: cH * 0.35, width: cW * 0.8, height: cH * 0.3, align: "center" },
      };
    default:
      return {};
  }
}

function rectFor(
  id: BuiltInElementId,
  slide: AppSSSlide,
  defaults: LayoutRects,
): (Rect & { align?: "center" | "left" }) | undefined {
  const saved = slide.transforms?.[id];
  const def = defaults[id];
  if (!def && !saved) return undefined;
  if (!saved) return def;
  return {
    x: saved.x,
    y: saved.y,
    width: saved.width,
    height: saved.height,
    // 位置・サイズはユーザー保存値を優先するが、回転・重なり順はレイアウトの既定値を引き継ぐ
    // （ユーザーが個別に回転させていれば saved.rotation が別途優先される。呼び出し側参照）
    rotation: def?.rotation,
    zIndex: def?.zIndex,
    align: (def as { align?: "center" | "left" } | undefined)?.align,
  };
}

// Inspector から現在の transform を参照するためのヘルパー
export function getElementTransform(
  slide: AppSSSlide,
  id: ElementId,
  kind: DeviceKind = "iphone",
): ElementTransform | undefined {
  if (id.startsWith("text:")) {
    const textId = id.slice("text:".length);
    return slide.textElements?.find((element) => element.id === textId)?.transform;
  }
  const defaults = getDefaultRects(slide.layout, kind);
  const rect = rectFor(id as BuiltInElementId, slide, defaults);
  if (!rect) return undefined;
  const saved = slide.transforms?.[id as BuiltInElementId];
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rotation: saved?.rotation ?? rect.rotation ?? 0,
    zIndex: saved?.zIndex ?? rect.zIndex ?? defaultElementZ(id as BuiltInElementId),
  };
}

function defaultElementZ(id: BuiltInElementId): number {
  if (id === "deviceSecondary") return 2;
  if (id === "deviceTertiary") return 2;
  if (id === "device") return 3;
  return 4;
}

// ---------- 透かし（無料書き出し用） ----------
// 課金の壁: 無料の書き出しには常にこの帯を焼き込む。透かし解除（有料）時は watermark=false で
// レンダーしないだけ（描画パイプライン自体は変わらないため export の安全性に影響しない）。
// filter:blur 等は使わず単色 rgba 背景のみで Safari の foreignObject バグを回避する。
function Watermark({ kind }: { kind: DeviceKind }) {
  const canvas = canvasFor(kind);
  const cW = canvas.w;
  const cH = canvas.h;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: cH * 0.055,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.78)",
        color: "#f8fafc",
        fontSize: cW * 0.03,
        fontWeight: 700,
        letterSpacing: "0.04em",
        // 全要素より確実に前面（テキスト要素の zIndex は 5+index）
        zIndex: 100,
      }}
    >
      Made with Code Tweet — AppSS
    </div>
  );
}

// ---------- 単一スライドキャンバス（書き出し・サムネ用） ----------

type Props = {
  slide: AppSSSlide;
  theme: Theme;
  backgroundStyle?: BackgroundStyle;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId?: ElementId | null;
  // CSS transform で縮小表示している場合の倍率（react-rnd のドラッグ座標補正用）
  previewScale?: number;
  hideEmpty?: boolean;
  // true の場合、下部に透かし帯を焼き込む（無料書き出し用）
  watermark?: boolean;
  // デバイス種別（既定 iPhone）。切替で iPad のキャンバス寸法・デバイス枠比を切り替える。
  device?: DeviceKind;
};

export function SlideCanvas({
  slide,
  theme,
  backgroundStyle = DEFAULT_BACKGROUND_STYLE,
  editable,
  edit,
  selectedElementId = null,
  previewScale = 1,
  hideEmpty,
  watermark,
  device = "iphone",
}: Props) {
  const handleBackgroundMouseDown = editable
    ? (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) edit?.onSelectElement?.(null);
      }
    : undefined;

  return (
    <div
      onMouseDown={handleBackgroundMouseDown}
      style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}
    >
      <SlideBackground slide={slide} theme={theme} backgroundStyle={backgroundStyle} />
      <SlideElements
        slide={slide}
        theme={theme}
        editable={editable}
        edit={edit}
        selectedElementId={selectedElementId}
        previewScale={previewScale}
        hideEmpty={hideEmpty}
        device={device}
      />
      {watermark && <Watermark kind={device} />}
    </div>
  );
}

// ---------- デッキ（横並びストリップ、各スライドは独立クリップ） ----------

export function DeckStrip({
  slides,
  theme,
  backgroundStyle = DEFAULT_BACKGROUND_STYLE,
  editable,
  edit,
  selectedElement = null,
  activeSlideId = null,
  previewScale = 1,
  hideEmpty,
  showGuides = false,
  device = "iphone",
}: {
  slides: AppSSSlide[];
  theme: Theme;
  backgroundStyle?: BackgroundStyle;
  editable?: boolean;
  edit?: DeckEditHandlers;
  selectedElement?: SelectedElement | null;
  activeSlideId?: string | null;
  previewScale?: number;
  hideEmpty?: boolean;
  showGuides?: boolean;
  device?: DeviceKind;
}) {
  const canvas = canvasFor(device);
  const cW = canvas.w;
  const cH = canvas.h;
  const totalW = Math.max(1, slides.length) * cW;

  return (
    <div style={{ width: totalW, height: cH, position: "relative", overflow: "hidden" }}>
      {slides.map((slide, index) => {
        const active = activeSlideId === slide.id;
        const selectedElementId =
          selectedElement?.slideId === slide.id ? selectedElement.elementId : null;
        const perSlideEdit: EditHandlers | undefined = editable
          ? {
              onLabelChange: (v) => edit?.onLabelChange?.(slide.id, v),
              onHeadlineChange: (v) => edit?.onHeadlineChange?.(slide.id, v),
              onTextElementTextChange: (id, v) => edit?.onTextElementTextChange?.(slide.id, id, v),
              onElementChange: (id, t) => edit?.onElementChange?.(slide.id, id, t),
              onSelectElement: (id) => {
                edit?.onSelectScreen?.(slide.id);
                edit?.onSelectElement?.(id ? { slideId: slide.id, elementId: id } : null);
              },
            }
          : undefined;
        return (
          <div
            key={slide.id}
            onMouseDown={(e) => {
              if (!editable || e.defaultPrevented) return;
              edit?.onSelectScreen?.(slide.id);
              if (e.target === e.currentTarget) edit?.onSelectElement?.(null);
            }}
            style={{
              position: "absolute",
              left: index * cW,
              top: 0,
              width: cW,
              height: cH,
              overflow: "hidden",
            }}
          >
            <SlideBackground slide={slide} theme={theme} backgroundStyle={backgroundStyle} />
            <SlideElements
              slide={slide}
              theme={theme}
              editable={editable}
              edit={perSlideEdit}
              selectedElementId={selectedElementId}
              previewScale={previewScale}
              hideEmpty={hideEmpty}
              device={device}
            />
            {showGuides && <ScreenGuide cW={cW} cH={cH} index={index} active={active} />}
          </div>
        );
      })}
    </div>
  );
}

function ScreenGuide({
  cW,
  cH,
  index,
  active,
}: {
  cW: number;
  cH: number;
  index: number;
  active: boolean;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        outline: `${active ? Math.max(4, cW * 0.003) : Math.max(2, cW * 0.0015)}px solid ${
          active ? "rgba(34, 211, 238, 0.95)" : "rgba(15, 23, 42, 0.22)"
        }`,
        outlineOffset: active ? -Math.max(4, cW * 0.003) : -Math.max(2, cW * 0.0015),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: cW * 0.035,
          top: cH * 0.024,
          borderRadius: cW * 0.018,
          padding: `${cH * 0.006}px ${cW * 0.018}px`,
          background: active ? "rgba(34, 211, 238, 0.92)" : "rgba(15, 23, 42, 0.72)",
          color: active ? "#0f172a" : "white",
          fontSize: Math.max(24, cW * 0.022),
          lineHeight: 1,
          fontWeight: 700,
        }}
      >
        {index + 1}
      </div>
    </div>
  );
}

// ---------- スライド内要素 ----------

function SlideElements({
  slide,
  theme,
  editable,
  edit,
  selectedElementId,
  previewScale,
  hideEmpty,
  device = "iphone",
}: {
  slide: AppSSSlide;
  theme: Theme;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId: ElementId | null;
  previewScale: number;
  hideEmpty?: boolean;
  device?: DeviceKind;
}) {
  const tcv = useTranslations("appssCanvas");
  const canvas = canvasFor(device);
  const cW = canvas.w;
  const cH = canvas.h;
  const inverted = !!slide.inverted;
  const defaults = getDefaultRects(slide.layout, device);
  const captionRect = rectFor("caption", slide, defaults);
  const deviceRect = rectFor("device", slide, defaults);
  const secondaryRect = rectFor("deviceSecondary", slide, defaults);
  const tertiaryRect = rectFor("deviceTertiary", slide, defaults);

  function renderCaption() {
    if (!captionRect) return null;
    const saved = slide.transforms?.caption;
    const rotation = saved?.rotation ?? captionRect.rotation ?? 0;
    const zIndex = saved?.zIndex ?? captionRect.zIndex ?? 4;
    return (
      <Movable
        rect={captionRect}
        boundsW={cW}
        boundsH={cH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.("caption", {
            ...t,
            rotation: t.rotation ?? rotation,
            zIndex: t.zIndex ?? zIndex,
          })
        }
        zIndex={zIndex}
        selected={selectedElementId === "caption"}
        onSelect={() => edit?.onSelectElement?.("caption")}
      >
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-start" }}>
          <Caption
            cW={cW}
            cH={cH}
            slide={slide}
            theme={theme}
            editable={editable}
            edit={edit}
            align={captionRect.align || "center"}
            inverted={inverted}
            onFocus={() => edit?.onSelectElement?.("caption")}
          />
        </div>
      </Movable>
    );
  }

  function renderDevice(
    id: "device" | "deviceSecondary" | "deviceTertiary",
    rect: Rect,
    src: string,
    extraStyle?: React.CSSProperties,
  ) {
    const saved = slide.transforms?.[id];
    const rotation = saved?.rotation ?? rect.rotation ?? 0;
    const zIndex = saved?.zIndex ?? rect.zIndex ?? defaultElementZ(id);
    return (
      <Movable
        rect={rect}
        boundsW={cW}
        boundsH={cH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(id, {
            ...t,
            rotation: t.rotation ?? rotation,
            zIndex: t.zIndex ?? zIndex,
          })
        }
        lockAspectRatio={bezelRatioFor(device)}
        zIndex={zIndex}
        allowOverflow
        selected={selectedElementId === id}
        onSelect={() => edit?.onSelectElement?.(id)}
      >
        <DeviceFrame
          device={device}
          src={src}
          hideEmpty={hideEmpty}
          style={{ width: "100%", height: "100%", ...extraStyle }}
        />
      </Movable>
    );
  }

  function renderTextElement(textElement: TextElement, index: number) {
    const elementId = toTextElementId(textElement.id);
    const rect = textElement.transform;
    const rotation = rect.rotation ?? 0;
    const zIndex = rect.zIndex ?? 5 + index;
    const textColor = textElement.color || (inverted ? theme.fgAlt : theme.fg);
    return (
      <Movable
        key={textElement.id}
        rect={rect}
        boundsW={cW}
        boundsH={cH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(elementId, {
            ...t,
            rotation: t.rotation ?? rotation,
            zIndex: t.zIndex ?? zIndex,
          })
        }
        zIndex={zIndex}
        selected={selectedElementId === elementId}
        onSelect={() => edit?.onSelectElement?.(elementId)}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent:
              textElement.align === "right"
                ? "flex-end"
                : textElement.align === "left"
                  ? "flex-start"
                  : "center",
            padding: `${Math.min(cW, cH) * 0.012}px`,
          }}
        >
          <EditableText
            value={textElement.text}
            editable={editable}
            multiline
            onChange={(value) => edit?.onTextElementTextChange?.(textElement.id, value)}
            onFocus={() => edit?.onSelectElement?.(elementId)}
            placeholder={tcv("textPlaceholder")}
            style={{
              width: "100%",
              color: textColor,
              fontSize: textElement.fontSize ?? Math.min(cW, cH) * 0.06,
              fontWeight: textElement.fontWeight ?? 700,
              lineHeight: 1.3,
              textAlign: textElement.align ?? "center",
              textShadow: inverted ? "0 2px 18px rgba(0,0,0,0.22)" : "0 2px 18px rgba(255,255,255,0.2)",
            }}
          />
        </div>
      </Movable>
    );
  }

  return (
    <>
      {secondaryRect &&
        renderDevice(
          "deviceSecondary",
          secondaryRect,
          slide.screenshotSecondaryRef || slide.screenshotRef,
          { opacity: 0.85 },
        )}
      {tertiaryRect &&
        renderDevice(
          "deviceTertiary",
          tertiaryRect,
          slide.screenshotTertiaryRef || slide.screenshotSecondaryRef || slide.screenshotRef,
          { opacity: 0.85 },
        )}
      {deviceRect && renderDevice("device", deviceRect, slide.screenshotRef)}
      {renderCaption()}
      {(slide.textElements || []).map(renderTextElement)}
    </>
  );
}

// ---------- Movable（react-rnd ラッパ） ----------

// はみ出し許可時でも、要素をつかんで戻せるだけの可視領域を残す
const MIN_VISIBLE_FRAC = 0.1;

function clampRect(r: Rect, boundsW: number, boundsH: number, allowOverflow = false) {
  if (allowOverflow) {
    const width = r.width;
    const height = r.height;
    const minVisX = Math.max(8, width * MIN_VISIBLE_FRAC);
    const minVisY = Math.max(8, height * MIN_VISIBLE_FRAC);
    const x = Math.max(-(width - minVisX), Math.min(r.x, boundsW - minVisX));
    const y = Math.max(-(height - minVisY), Math.min(r.y, boundsH - minVisY));
    return { x, y, width, height };
  }
  const width = Math.min(r.width, boundsW);
  const height = Math.min(r.height, boundsH);
  const x = Math.max(0, Math.min(r.x, boundsW - width));
  const y = Math.max(0, Math.min(r.y, boundsH - height));
  return { x, y, width, height };
}

function Movable({
  rect,
  boundsW,
  boundsH,
  editable,
  previewScale,
  onChange,
  children,
  lockAspectRatio,
  zIndex,
  rotation = 0,
  allowOverflow = false,
  selected = false,
  onSelect,
}: {
  rect: Rect;
  boundsW: number;
  boundsH: number;
  editable?: boolean;
  previewScale: number;
  onChange: (t: ElementTransform) => void;
  children: React.ReactNode;
  lockAspectRatio?: number | boolean;
  zIndex?: number;
  rotation?: number;
  allowOverflow?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const tcv = useTranslations("appssCanvas");
  const rotationRef = React.useRef(rotation);
  React.useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  // 回転は内側ラッパに適用し、Rnd の軸平行な矩形をドラッグ/リサイズ計算の基準に保つ
  const rotated = (
    <div
      onMouseDown={() => {
        if (editable) onSelect?.();
      }}
      style={{
        width: "100%",
        height: "100%",
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );

  // 非編集（書き出し・サムネ）は Rnd を介さず絶対配置のみ
  if (!editable) {
    return (
      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          zIndex,
        }}
      >
        {rotated}
      </div>
    );
  }

  const display = clampRect(rect, boundsW, boundsH, allowOverflow);
  const controlScale = Math.max(0.05, previewScale);

  function startRotate(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.();

    const root = e.currentTarget.closest(".rnd-editable") as HTMLElement | null;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const startAngle = pointerAngle(e.clientX, e.clientY, centerX, centerY);
    const startRotation = rotationRef.current;

    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      const nextRotation = normalizeRotation(
        startRotation + pointerAngle(event.clientX, event.clientY, centerX, centerY) - startAngle,
      );
      rotationRef.current = nextRotation;
      onChange({
        x: display.x,
        y: display.y,
        width: display.width,
        height: display.height,
        rotation: nextRotation,
        zIndex,
      });
    };
    const stopRotate = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopRotate);
      window.removeEventListener("pointercancel", stopRotate);
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", stopRotate, { once: true });
    window.addEventListener("pointercancel", stopRotate, { once: true });
  }

  return (
    <Rnd
      bounds={allowOverflow ? undefined : "parent"}
      scale={previewScale}
      lockAspectRatio={lockAspectRatio}
      position={{ x: display.x, y: display.y }}
      size={{ width: display.width, height: display.height }}
      onDragStart={() => onSelect?.()}
      onResizeStart={() => onSelect?.()}
      onDragStop={(_e, d) => {
        const next = clampRect(
          { x: d.x, y: d.y, width: display.width, height: display.height },
          boundsW,
          boundsH,
          allowOverflow,
        );
        onChange({ ...next, rotation, zIndex });
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        const next = clampRect(
          {
            x: position.x,
            y: position.y,
            width: parseFloat(ref.style.width),
            height: parseFloat(ref.style.height),
          },
          boundsW,
          boundsH,
          allowOverflow,
        );
        onChange({ ...next, rotation, zIndex });
      }}
      style={{ zIndex }}
      resizeHandleStyles={handleStyle}
      className={selected ? "rnd-editable rnd-selected" : "rnd-editable"}
    >
      {rotated}
      <button
        type="button"
        className="rnd-rotate-handle"
        style={{
          right: -14 / controlScale,
          top: -14 / controlScale,
          width: 28 / controlScale,
          height: 28 / controlScale,
        }}
        onPointerDown={startRotate}
        title={tcv("rotate")}
        aria-label={tcv("rotateElement")}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 14 / controlScale, height: 14 / controlScale }}
          aria-hidden
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>
    </Rnd>
  );
}

function pointerAngle(x: number, y: number, centerX: number, centerY: number) {
  return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
}

function normalizeRotation(degrees: number) {
  let next = degrees;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return Math.round(next);
}

const handleSize = 14;
const handleStyle: Record<string, React.CSSProperties> = {
  top: { height: handleSize },
  right: { width: handleSize },
  bottom: { height: handleSize },
  left: { width: handleSize },
  topRight: { width: handleSize, height: handleSize },
  bottomRight: { width: handleSize, height: handleSize },
  bottomLeft: { width: handleSize, height: handleSize },
  topLeft: { width: handleSize, height: handleSize },
};
