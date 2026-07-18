"use client";
// AppSS — プロジェクトの書き出し/読み込み（JSON + 画像を 1 つの zip に）。
// 端末間の移動・バックアップ用。サーバーは介さない。
import JSZip from "jszip";
import { mergeWithDefaults } from "./storage";
import { getImage, IDB_PREFIX, putImage } from "./imageStore";
import { downloadZip, slugify, stamp } from "./exporter";
import type { AppSSProject } from "./types";

const PROJECT_JSON = "project.json";
const IMAGES_DIR = "images";

export async function exportProjectZip(state: AppSSProject): Promise<void> {
  const zip = new JSZip();
  zip.file(PROJECT_JSON, JSON.stringify(state, null, 2));

  const refs = new Set<string>();
  for (const slide of state.slides) {
    if (slide.screenshotRef?.startsWith(IDB_PREFIX)) refs.add(slide.screenshotRef);
    if (slide.screenshotSecondaryRef?.startsWith(IDB_PREFIX)) refs.add(slide.screenshotSecondaryRef);
    if (slide.screenshotTertiaryRef?.startsWith(IDB_PREFIX)) refs.add(slide.screenshotTertiaryRef);
  }
  for (const ref of refs) {
    const blob = await getImage(ref);
    if (blob) zip.file(`${IMAGES_DIR}/${ref.slice(IDB_PREFIX.length)}`, blob);
  }

  await downloadZip(zip, `${slugify(state.appName)}-appss-project-${stamp()}.zip`);
}

export async function importProjectZip(file: File): Promise<AppSSProject> {
  const zip = await JSZip.loadAsync(file);
  const projectEntry = zip.file(PROJECT_JSON);
  if (!projectEntry) {
    throw new Error("プロジェクトファイルではありません（project.json が見つかりません）");
  }
  const state = mergeWithDefaults(JSON.parse(await projectEntry.async("string")));

  // 画像を IndexedDB へ復元（putImage は内容ハッシュで採番するため参照が一致する）
  const imageFiles = zip.filter((path) => path.startsWith(`${IMAGES_DIR}/`) && !path.endsWith("/"));
  for (const entry of imageFiles) {
    const blob = await entry.async("blob");
    await putImage(blob);
  }

  return state;
}
