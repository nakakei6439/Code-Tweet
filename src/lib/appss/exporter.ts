"use client";
// AppSS — PNG 一括書き出し。
// html-to-image で実寸 DOM を PNG 化し、全サイズを JSZip で 1 つの zip にまとめる。
// Based on MIT-licensed https://github.com/ParthJadhav/app-store-screenshots
import { getFontEmbedCSS, toPng } from "html-to-image";
import { flushSync } from "react-dom";
import JSZip from "jszip";

// Safari(WebKit) は SVG foreignObject への画像埋め込みで、初回描画時に
// 内側の画像（特に大きな data:URL）を取りこぼす既知バグがある。該当ブラウザでは
// スライドごとに捨てレンダリングして画像デコードを温めてから本番描画する。
export const IS_SAFARI =
  typeof navigator !== "undefined" &&
  /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);

// React の render → ブラウザの layout/paint が落ち着くまで 2 フレーム待つ
export const waitForPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

// 2026-09-07 スプリント 06 attempt 2: スプリント 03 / 06 で顕在化した
// 「React commit/paint と html-to-image キャプチャの非決定的レース」対策。
// React 18+ (本プロジェクトは React 19) の setState はバッチングされ、
// await をまたいでコミットが遅延しうる。さらに Next.js の Turbopack で
// コミット直後のレイアウト計算に数 ms 〜 数十 ms かかるケースもあるため、
// 単に二重 rAF (waitForPaint) を入れても「次のスライド/寸法に切り替わった
// 状態でキャプチャされる保証」は得られない。
// 対策:
//   1. setState を flushSync で同期コミット (DOM がこの呼び出し直後に更新)
//   2. オフスクリーンのルート要素に data-export-slide-id / data-export-w /
//      data-export-h を書き出しておき、実 DOM から読み戻して期待値と一致
//      するまで短い間隔でリトライする（上限つき）
//   3. 一致しないまま上限に達したら false を返し、呼び出し側で errors[] に
//      積む（壊れた PNG を zip に混入させない）
export type OffscreenExpectation = {
  slideId: string;
  width: number;
  height: number;
};

// 検証リトライの最大回数（各 16ms 待つので合計 ~0.5s）。Next.js + フォント
// ロードで重くなった環境でも 30 回 ≒ 480ms あれば、コミット後のレイアウト
// 計算をほぼ確実に吸収できる。超えたら "race で詰んだ" として呼び出し側に
// 報告する。
export const OFFSCREEN_VERIFY_MAX_ATTEMPTS = 30;
const OFFSCREEN_VERIFY_INTERVAL_MS = 16;

// 検証失敗時のデバッグ用に、ルート要素の実状態を読み取った形。
export type OffscreenObserved = {
  rootFound: boolean;
  attrSlideId: string | null;
  attrW: string | null;
  attrH: string | null;
  rectWidth: number | null;
  rectHeight: number | null;
};

// キャプチャ対象のオフスクリーン DOM を取得して、data-export-* 属性が
// expectation と一致するかを確認する。一致したら true、上限到達で false。
// 「ルート要素が存在しない」「属性が書かれていない」「期待値と違う」
// いずれも「まだ切り替わっていない」とみなして再試行する。
// 2026-09-12 attempt 3: 失敗時に「最後の観測値」を返すように拡張。
// `verifyOffscreenReady` は後方互換のため boolean を返す形式を残す。
export async function verifyOffscreenReady(
  expectation: OffscreenExpectation,
  getRoot: () => HTMLElement | null,
): Promise<boolean> {
  const result = await verifyOffscreenReadyWithDetails(expectation, getRoot);
  return result.ready;
}

// 失敗時のデバッグ用：期待値 or 最後の観測値（DOM から実際に読み戻した内容）
// の両方を含んだ構造体。呼び出し側で console.warn に使える。
export async function verifyOffscreenReadyWithDetails(
  expectation: OffscreenExpectation,
  getRoot: () => HTMLElement | null,
): Promise<{ ready: boolean; observed: OffscreenObserved }> {
  let lastObserved: OffscreenObserved = {
    rootFound: false,
    attrSlideId: null,
    attrW: null,
    attrH: null,
    rectWidth: null,
    rectHeight: null,
  };
  for (let attempt = 0; attempt < OFFSCREEN_VERIFY_MAX_ATTEMPTS; attempt++) {
    const el = getRoot();
    if (!el) {
      lastObserved = {
        rootFound: false,
        attrSlideId: null,
        attrW: null,
        attrH: null,
        rectWidth: null,
        rectHeight: null,
      };
      await delay(OFFSCREEN_VERIFY_INTERVAL_MS);
      continue;
    }
    const attrSlide = el.getAttribute("data-export-slide-id");
    const attrW = el.getAttribute("data-export-w");
    const attrH = el.getAttribute("data-export-h");
    const rect = el.getBoundingClientRect();
    lastObserved = {
      rootFound: true,
      attrSlideId: attrSlide,
      attrW,
      attrH,
      rectWidth: Math.round(rect.width),
      rectHeight: Math.round(rect.height),
    };
    if (
      attrSlide === expectation.slideId &&
      attrW === String(expectation.width) &&
      attrH === String(expectation.height) &&
      Math.round(rect.width) === expectation.width &&
      Math.round(rect.height) === expectation.height
    ) {
      return { ready: true, observed: lastObserved };
    }
    await delay(OFFSCREEN_VERIFY_INTERVAL_MS);
  }
  return { ready: false, observed: lastObserved };
}

// setState を含むコールバックを flushSync で同期コミットしてから、
// オフスクリーン DOM が期待状態になったかを確認するワンショットヘルパー。
// 失敗時は false（= 呼び出し側で errors[] に積む）。
// 2026-09-12 attempt 3: label 引数を追加。検証上限到達時に期待値と観測値を
// console.warn で出し、デバッグ・切り分けをしやすくした。
export async function commitAndVerifyOffscreen(
  expectation: OffscreenExpectation,
  commit: () => void,
  getRoot: () => HTMLElement | null,
  label?: string,
): Promise<boolean> {
  // 1) React state を同期コミット。commit() 内の setState が直ちに DOM に反映される。
  try {
    flushSync(() => {
      commit();
    });
  } catch {
    // flushSync が失敗した場合は rAF にフォールバックして最低限の遅延を入れる。
    await waitForPaint();
  }
  // 2) 念のため paint を 1 回挟み（Safari の場合レイアウトに 1f 必要）、
  // 3) 実 DOM の data-* 属性 + 寸法が expectation と一致するまで短い間隔で再確認。
  await waitForPaint();
  const { ready, observed } = await verifyOffscreenReadyWithDetails(expectation, getRoot);
  if (!ready) {
    // 失敗時の切り分け用: 期待値 / 観測値（DOM から実際に読み戻した値）/
    // ラベル（呼び出し元の文脈: "size loop/13inch" 等）を出す。サイレントで
    // errors[] に積まれると evaluator からのフィードバックループが遅くなるため
    // ここでは必ず console.warn を出す。
    console.warn("[commitAndVerifyOffscreen] verify timed out", {
      label: label ?? "(no label)",
      expected: expectation,
      observed,
    });
  }
  return ready;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// オフスクリーン要素内の画像は Safari が遅延デコードするため、キャプチャ前に
// 明示的にデコードしておく。これで html-to-image が生成する SVG 内の同一
// data:URL がデコード済みキャッシュにヒットし、画像が黒く抜けるのを防ぐ。
export async function decodeImages(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      try {
        if (img.decode) await img.decode();
      } catch {
        /* デコード失敗は無視（描画側でフォールバック） */
      }
    }),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// 書き出し結果が真っ黒／単色（＝Safari の描画失敗）かを縮小サンプルで判定する。
// 実データは PNG の data:URL なので canvas 読み出しは汚染されない。
// 反転（ダーク）背景の正常スライドは文字やデバイスで輝度差が大きいため誤検知しない。
export async function isMostlyBlank(dataUrl: string): Promise<boolean> {
  try {
    const img = await loadImage(dataUrl);
    const w = 48;
    const h = Math.max(1, Math.round((w * img.height) / img.width));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let minL = 255;
    let maxL = 0;
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (l < minL) minL = l;
      if (l > maxL) maxL = l;
    }
    // 全体が真っ黒、またはほぼ単色（輝度差が極小）なら描画失敗とみなす
    return maxL < 12 || maxL - minL < 4;
  } catch {
    return false;
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
    const render = async (): Promise<string> => {
      try {
        return await toPng(el, options);
      } catch {
        await waitForPaint();
        return await toPng(el, options);
      }
    };
    // 画像を先にデコードしてから描画する（Safari の遅延デコード対策）。
    await decodeImages(el);
    // Safari は同一 DOM の初回描画で画像を取りこぼす。捨てレンダリングで
    // 画像デコードを温めてから本番描画する（2 回目以降はデコード済みで正しく出る）。
    if (IS_SAFARI) {
      await render();
      await waitForPaint();
    }
    // 全体が真っ黒／単色だった場合の保険として最大3回まで再試行する。
    let last = await render();
    for (let attempt = 0; attempt < 2 && (await isMostlyBlank(last)); attempt++) {
      await waitForPaint();
      last = await render();
    }
    return last;
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
