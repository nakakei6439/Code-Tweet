"use client";
// AppSS — 画像を dataURL としてメモリにプリロードするキャッシュ。
// html-to-image の書き出し時に画像 fetch の競合を避けるため、描画には常に img(ref) を使う。
// "idb:<id>" 参照は IndexedDB から、その他のパス（ベゼル等）は fetch で解決する。
// Based on MIT-licensed https://github.com/ParthJadhav/app-store-screenshots

import { getImage, IDB_PREFIX } from "./imageStore";

const cache = new Map<string, string>();
const failed = new Set<string>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchAsDataUrl(ref: string): Promise<string | null> {
  try {
    if (ref.startsWith(IDB_PREFIX)) {
      const blob = await getImage(ref);
      return blob ? await blobToDataUrl(blob) : null;
    }
    const resp = await fetch(ref);
    if (!resp.ok) return null;
    return await blobToDataUrl(await resp.blob());
  } catch {
    return null;
  }
}

export async function preloadImages(
  refs: string[],
  options: { retryFailed?: boolean } = {},
): Promise<void> {
  await Promise.all(
    refs
      .filter(Boolean)
      .filter((r) => !cache.has(r) && (options.retryFailed || !failed.has(r)))
      .map(async (r) => {
        const data = await fetchAsDataUrl(r);
        if (data) {
          cache.set(r, data);
          failed.delete(r);
        } else {
          failed.add(r);
        }
      }),
  );
}

export function img(ref: string | undefined): string {
  if (!ref) return "";
  if (ref.startsWith("data:")) return ref;
  if (failed.has(ref)) return "";
  // idb: 参照はブラウザが直接解決できないため、キャッシュ未解決なら空を返す
  return cache.get(ref) || (ref.startsWith(IDB_PREFIX) ? "" : ref);
}

export function setImage(ref: string, dataUrl: string) {
  cache.set(ref, dataUrl);
  failed.delete(ref);
}

export function didFail(ref: string | undefined): boolean {
  if (!ref) return false;
  if (ref.startsWith("data:")) return false;
  return failed.has(ref);
}
