"use client";
// AppSS — PNG 一括書き出し。
// html-to-image で実寸 DOM を PNG 化し、全サイズを JSZip で 1 つの zip にまとめる。
// Based on MIT-licensed https://github.com/ParthJadhav/app-store-screenshots
import { getFontEmbedCSS, toPng } from "html-to-image";
import JSZip from "jszip";

// React の render → ブラウザの layout/paint が落ち着くまで 2 フレーム待つ
export const waitForPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export async function waitForFonts() {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }
}

// 日本語フォントは unicode-range サブセットが多く、キャプチャ毎の埋め込み CSS 計算が
// 非常に重い。書き出し開始時に 1 回だけ計算し、全キャプチャで再利用する。
export async function computeFontEmbedCSS(el: HTMLElement): Promise<string | undefined> {
  try {
    return await getFontEmbedCSS(el);
  } catch {
    return undefined;
  }
}

// Safari は foreignObject の初回描画が空になることがあるため、
// 本番キャプチャ前に捨てキャプチャを 1 回実行しておく。
export async function warmupCapture(el: HTMLElement, fontEmbedCSS?: string) {
  try {
    await toPng(el, { pixelRatio: 1, cacheBust: false, fontEmbedCSS });
  } catch {
    /* warmup 失敗は無視して本番キャプチャに進む */
  }
}

export async function captureSlide(
  el: HTMLElement,
  sourceW: number,
  sourceH: number,
  exportW: number,
  exportH: number,
  fontEmbedCSS?: string,
): Promise<string> {
  // html-to-image はノードが (0,0) にある前提。出力サイズへの拡縮は
  // canvasWidth/canvasHeight に任せる（CSS transform だと端に透明の隙間が出る）。
  const prev = {
    left: el.style.left,
    top: el.style.top,
    position: el.style.position,
    transform: el.style.transform,
    transformOrigin: el.style.transformOrigin,
    zIndex: el.style.zIndex,
  };
  el.style.left = "0px";
  el.style.top = "0px";
  el.style.position = "absolute";
  el.style.transform = "none";
  el.style.transformOrigin = "top left";
  el.style.zIndex = "-1";
  try {
    const options = {
      width: sourceW,
      height: sourceH,
      canvasWidth: exportW,
      canvasHeight: exportH,
      pixelRatio: 1,
      cacheBust: false,
      backgroundColor: "#ffffff",
      fontEmbedCSS,
    };
    try {
      return await toPng(el, options);
    } catch {
      // 一度だけリトライ（Safari の一時的な描画失敗対策）
      await waitForPaint();
      return await toPng(el, options);
    }
  } finally {
    el.style.left = prev.left || "-99999px";
    el.style.top = prev.top || "0px";
    el.style.position = prev.position || "absolute";
    el.style.transform = prev.transform;
    el.style.transformOrigin = prev.transformOrigin;
    el.style.zIndex = prev.zIndex;
  }
}

export function createZip(): JSZip {
  return new JSZip();
}

export async function downloadZip(zip: JSZip, filename: string) {
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ぁ-んァ-ヶ一-龠ー]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "appss";
}

export function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
