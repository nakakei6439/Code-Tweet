"use client";
// AppSS — トップページ → /appss エディタへの受け渡し。
// トップで AI 生成したコピー案を sessionStorage に一時保存し、
// エディタ初期化時に消費して新規プロジェクトとして着地させる。
// appDescription/features は AppSSProject の永続スキーマには含めず、
// 「AIコピー＆デザイン生成」パネルの初期値としてのみ一度きり運ぶ（copyAssistantSeed）。
import { mergeWithDefaults } from "./storage";
import { projectFromCopy } from "./defaults";
import type { AppSSProject } from "./types";
import type { AppSSCopySlideIdea, GeneratedPalette } from "@/types/appss";

const HANDOFF_KEY = "code-tweet:appss:handoff";

export type ConsumedHandoff = {
  project: AppSSProject;
  appDescription: string;
  features: string[];
};

export function writeHandoff(
  appName: string,
  ideas: AppSSCopySlideIdea[],
  themeId?: string,
  backgroundStyle?: string,
  screenshotRefs?: string[],
  generatedPalette?: GeneratedPalette,
  appDescription?: string,
  features?: string[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({
        appName,
        ideas,
        themeId,
        backgroundStyle,
        screenshotRefs,
        generatedPalette,
        appDescription,
        features,
      }),
    );
  } catch {
    /* sessionStorage 不可（プライベートブラウズ等）は握りつぶす */
  }
}

// ハンドオフがあれば読み出してプロジェクトを構築し、キーを消して返す。
// 一度きりの受け渡しなので必ず削除する。
export function consumeHandoff(): ConsumedHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(HANDOFF_KEY);
    const parsed = JSON.parse(raw) as {
      appName?: string;
      ideas?: AppSSCopySlideIdea[];
      themeId?: string;
      backgroundStyle?: string;
      screenshotRefs?: string[];
      generatedPalette?: GeneratedPalette;
      appDescription?: string;
      features?: string[];
    };
    if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) return null;
    const screenshotRefs = Array.isArray(parsed.screenshotRefs)
      ? parsed.screenshotRefs.filter((r): r is string => typeof r === "string")
      : undefined;
    // projectFromCopy の出力も migrate 経路に通して不正値をサニタイズする
    const project = mergeWithDefaults(
      projectFromCopy(
        parsed.appName ?? "",
        parsed.ideas,
        parsed.themeId,
        parsed.backgroundStyle,
        screenshotRefs,
        parsed.generatedPalette,
      ),
    );
    const features = Array.isArray(parsed.features)
      ? parsed.features.filter((f): f is string => typeof f === "string")
      : [];
    return { project, appDescription: parsed.appDescription ?? "", features };
  } catch {
    return null;
  }
}
