"use client";
// AppSS — トップページ → /appss エディタへの受け渡し。
// トップで AI 生成したコピー案を sessionStorage に一時保存し、
// エディタ初期化時に消費して新規プロジェクトとして着地させる。
import { mergeWithDefaults } from "./storage";
import { projectFromCopy } from "./defaults";
import type { AppSSProject } from "./types";
import type { AppSSCopySlideIdea } from "@/types/appss";

const HANDOFF_KEY = "code-tweet:appss:handoff";

export function writeHandoff(
  appName: string,
  ideas: AppSSCopySlideIdea[],
  themeId?: string,
  backgroundStyle?: string,
  screenshotRefs?: string[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({ appName, ideas, themeId, backgroundStyle, screenshotRefs }),
    );
  } catch {
    /* sessionStorage 不可（プライベートブラウズ等）は握りつぶす */
  }
}

// ハンドオフがあれば読み出してプロジェクトを構築し、キーを消して返す。
// 一度きりの受け渡しなので必ず削除する。
export function consumeHandoff(): AppSSProject | null {
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
    };
    if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) return null;
    const screenshotRefs = Array.isArray(parsed.screenshotRefs)
      ? parsed.screenshotRefs.filter((r): r is string => typeof r === "string")
      : undefined;
    // projectFromCopy の出力も migrate 経路に通して不正値をサニタイズする
    return mergeWithDefaults(
      projectFromCopy(
        parsed.appName ?? "",
        parsed.ideas,
        parsed.themeId,
        parsed.backgroundStyle,
        screenshotRefs,
      ),
    );
  } catch {
    return null;
  }
}
