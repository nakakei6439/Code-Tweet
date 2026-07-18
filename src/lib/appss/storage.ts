"use client";
// AppSS — プロジェクトの localStorage 永続化 + undo/redo。
// Based on MIT-licensed https://github.com/ParthJadhav/app-store-screenshots
// 画像本体は IndexedDB(imageStore.ts) に置き、ここには "idb:<id>" 参照のみ保存する。
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PROJECT_SCHEMA_VERSION, STORAGE_KEY, THEMES, isBackgroundStyle } from "./constants";
import { makeDefaultProject, nid } from "./defaults";
import { consumeHandoff } from "./handoff";
import type {
  AppSSProject,
  AppSSSlide,
  ElementTransform,
  FontId,
  SlideLayout,
  TextElement,
} from "./types";

const HISTORY_LIMIT = 50;
// 連続編集（タイピング等）を1つの undo 単位にまとめる
const COALESCE_MS = 500;
const SAVE_DEBOUNCE_MS = 600;

const LAYOUTS: SlideLayout[] = ["hero", "device-bottom", "device-top", "two-devices", "no-device"];
const FONT_IDS: FontId[] = ["gothic", "maru", "mincho"];

export function cleanTransform(value: unknown): ElementTransform | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ElementTransform>;
  const required = [raw.x, raw.y, raw.width, raw.height];
  if (!required.every((n) => typeof n === "number" && Number.isFinite(n))) return undefined;
  return {
    x: raw.x!,
    y: raw.y!,
    width: Math.max(1, raw.width!),
    height: Math.max(1, raw.height!),
    ...(typeof raw.rotation === "number" && Number.isFinite(raw.rotation)
      ? { rotation: raw.rotation }
      : {}),
    ...(typeof raw.zIndex === "number" && Number.isFinite(raw.zIndex)
      ? { zIndex: raw.zIndex }
      : {}),
  };
}

function cleanTextElement(value: unknown): TextElement | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<TextElement>;
  if (typeof raw.id !== "string" || !raw.id.trim()) return undefined;
  const transform = cleanTransform(raw.transform);
  if (!transform) return undefined;
  return {
    id: raw.id,
    text: typeof raw.text === "string" ? raw.text : "",
    transform,
    ...(typeof raw.fontSize === "number" && Number.isFinite(raw.fontSize)
      ? { fontSize: raw.fontSize }
      : {}),
    ...(typeof raw.fontWeight === "number" && Number.isFinite(raw.fontWeight)
      ? { fontWeight: raw.fontWeight }
      : {}),
    ...(typeof raw.color === "string" ? { color: raw.color } : {}),
    ...(raw.align === "left" || raw.align === "center" || raw.align === "right"
      ? { align: raw.align }
      : {}),
  };
}

// data:URL を localStorage の JSON に入れると 5MB quota が即死するため、
// 参照として不正な値は保存前に空へ落とす（画像は IndexedDB に置く設計）。
function cleanScreenshotRef(value: unknown): string {
  if (typeof value !== "string") return "";
  if (value.startsWith("data:")) return "";
  return value;
}

export function migrateSlide(value: unknown): AppSSSlide | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<AppSSSlide>;
  const transforms = raw.transforms
    ? Object.fromEntries(
        Object.entries(raw.transforms)
          .map(([id, transform]) => [id, cleanTransform(transform)])
          .filter((entry): entry is [string, ElementTransform] => !!entry[1]),
      )
    : undefined;
  const textElements = Array.isArray(raw.textElements)
    ? raw.textElements.map(cleanTextElement).filter((t): t is TextElement => !!t)
    : undefined;

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : nid(),
    layout: LAYOUTS.includes(raw.layout as SlideLayout) ? (raw.layout as SlideLayout) : "device-bottom",
    label: typeof raw.label === "string" ? raw.label : "",
    headline: typeof raw.headline === "string" ? raw.headline : "",
    ...(typeof raw.emphasis === "string" && raw.emphasis.trim() ? { emphasis: raw.emphasis } : {}),
    screenshotRef: cleanScreenshotRef(raw.screenshotRef),
    ...(raw.screenshotSecondaryRef !== undefined
      ? { screenshotSecondaryRef: cleanScreenshotRef(raw.screenshotSecondaryRef) }
      : {}),
    ...(raw.inverted === true ? { inverted: true } : {}),
    ...(transforms && Object.keys(transforms).length > 0 ? { transforms } : {}),
    ...(textElements && textElements.length > 0 ? { textElements } : {}),
  };
}

export function mergeWithDefaults(parsed: unknown): AppSSProject {
  const defaults = makeDefaultProject();
  if (!parsed || typeof parsed !== "object") return defaults;
  const raw = parsed as Partial<AppSSProject>;
  const slides = Array.isArray(raw.slides)
    ? raw.slides.map(migrateSlide).filter((s): s is AppSSSlide => !!s)
    : [];
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    appName: typeof raw.appName === "string" && raw.appName.trim() ? raw.appName : defaults.appName,
    themeId: typeof raw.themeId === "string" && THEMES[raw.themeId] ? raw.themeId : defaults.themeId,
    fontId: FONT_IDS.includes(raw.fontId as FontId) ? (raw.fontId as FontId) : defaults.fontId,
    backgroundStyle: isBackgroundStyle(raw.backgroundStyle)
      ? raw.backgroundStyle
      : defaults.backgroundStyle,
    slides: slides.length > 0 ? slides : defaults.slides,
  };
}

function loadFromLocalStorage(): AppSSProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveToLocalStorage(state: AppSSProject): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

type Updater = AppSSProject | ((prev: AppSSProject) => AppSSProject);

const emptySubscribe = () => () => {};

export function useAppSSProject() {
  // 初期値は lazy initializer で決定（SSR 時はデフォルト）。
  // トップページからの受け渡し（handoff）> localStorage の WIP > デフォルト の優先順。
  // hydrated はサーバー描画時 false / クライアントで true になり、
  // ハイドレーション不一致を防ぐ（両者ともスピナーを描画してから編集UIへ）。
  const [state, _setState] = useState<AppSSProject>(
    () => consumeHandoff() ?? loadFromLocalStorage() ?? makeDefaultProject(),
  );
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // undo/redo 履歴は描画に影響しないため ref に保持
  const pastRef = useRef<AppSSProject[]>([]);
  const futureRef = useRef<AppSSProject[]>([]);
  const lastPushAt = useRef(0);

  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const result = saveToLocalStorage(state);
      if (result.ok) {
        setSavedAt(Date.now());
        setSaveError(null);
      } else {
        setSaveError(result.error);
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, hydrated]);

  const setState = useCallback((updater: Updater) => {
    _setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next === prev) return prev;
      const now = Date.now();
      if (now - lastPushAt.current > COALESCE_MS) {
        pastRef.current.push(prev);
        if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
        futureRef.current.length = 0;
      }
      lastPushAt.current = now;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    _setState((cur) => {
      const prev = pastRef.current.pop();
      if (prev === undefined) return cur;
      futureRef.current.push(cur);
      lastPushAt.current = 0;
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    _setState((cur) => {
      const next = futureRef.current.pop();
      if (next === undefined) return cur;
      pastRef.current.push(cur);
      lastPushAt.current = 0;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(makeDefaultProject());
  }, [setState]);

  return { state, setState, hydrated, savedAt, saveError, reset, undo, redo };
}
