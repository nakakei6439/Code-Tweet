import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, GEMINI_THINKING_OFF, generateContentWithRetry } from "./gemini";
import { BACKGROUND_STYLES, THEMES, isBackgroundStyle } from "./appss/constants";
import type { AppSSCopySlideIdea } from "@/types/appss";
import type { SlideLayout } from "./appss/types";

export const APPSS_MIN_SLIDES = 3;
export const APPSS_MAX_SLIDES = 6;
export const APPSS_DEFAULT_SLIDES = 5;

const LAYOUT_HINTS: SlideLayout[] = ["hero", "device-bottom", "device-top", "two-devices", "no-device"];

// AI がアプリの雰囲気からテーマを選ぶための説明。id は constants.ts の THEMES と一致。
const THEME_GUIDE: { id: string; vibe: string }[] = [
  { id: "simple-white", vibe: "清潔・信頼感。ユーティリティ/ビジネス/金融/生産性/ツール系" },
  { id: "pastel", vibe: "やわらかく親しみやすい。家計簿/ヘルスケア/子供/女性向け/日記系" },
  { id: "dark-neon", vibe: "先進的でクール。開発ツール/ガジェット/ゲーム/音楽/暗めのUI系" },
  { id: "washi", vibe: "和風で上質・落ち着き。和風/伝統/文化/瞑想/写真/読書系" },
  { id: "pop", vibe: "ポップで高彩度・元気。エンタメ/SNS/フード/若者向け系" },
];

export function buildAppSSCopyPrompt(
  appName: string,
  appDescription: string,
  features: string[],
  tone: string,
  slideCount: number,
): string {
  return `あなたは日本の App Store で上位に入るアプリのスクリーンショット広告文を数多く手がけてきたコピーライターです。
以下のアプリの App Store スクリーンショット用キャッチコピーを ${slideCount} スライド分作成してください。

【アプリ名】
${appName}

【アプリの説明】
${appDescription}
${features.length ? `\n【主な機能・特徴（優先順）】\n${features.map((f, i) => `${i + 1}. ${f}`).join("\n")}` : ""}
${tone ? `\n【トーン指示】\n${tone}` : ""}

【コピーの鉄則】
- 1スライド1アイデア。「〜と〜」のような複数訴求の同居は禁止
- 機能名の羅列ではなく、ユーザーが得る変化（ベネフィット）で書く
- HEADLINE は 1 行 5〜9 文字、最大 2 行。行の区切りは「／」で明示する
- 改行位置は意味の切れ目に置く。助詞の直後で不自然に切らない
- 体言止めと「〜できる」「〜しよう」を織り交ぜ、文体は統一する
- 英語はアプリ名・製品名のみ可。その他は日本語で書く
- LABEL は 4〜10 文字の短いアイキャッチ（例：かんたん操作、こだわり検索）

【スライド構成（この順で作る）】
1枚目: つかみ — アプリの核となる価値をひとことで（LAYOUT: hero）
2〜${slideCount - 1}枚目: 主要機能・差別化ポイントを 1 スライド 1 つずつ（LAYOUT: device-bottom / device-top / two-devices を交互に使い、同じレイアウトを連続させない）
${slideCount}枚目: 締め — 信頼感や行動喚起（例：今すぐ無料ではじめよう）（LAYOUT: no-device）

【配色テーマの選択】
このアプリの内容${tone ? "と上記トーン指示" : ""}に最も合う配色テーマを次から1つ選ぶ：
${THEME_GUIDE.map((t) => `- ${t.id}: ${t.vibe}`).join("\n")}

【背景スタイルの選択】
このアプリの雰囲気に最も合う背景装飾を次から1つ選ぶ：
${BACKGROUND_STYLES.map((s) => `- ${s.id}: ${s.vibe}`).join("\n")}

【強調ワード】
各スライドで、HEADLINE の中で最も訴求したい語句を1つだけ EMPHASIS に書く。
- EMPHASIS は HEADLINE に含まれる連続した部分文字列にする（改行「／」をまたがない、1〜6文字程度）
- アプリの価値が一番伝わるキーワードを選ぶ（例: HEADLINE「毎日が／ラクに」→ EMPHASIS: ラク）

【出力形式】
説明・前置き・空行は不要。まず1行目にテーマ、2行目に背景を「THEME: <id>」「BG: <id>」形式で出力し、続けて ${slideCount} ブロック出力する：

THEME: <上記テーマから選んだ id>
BG: <上記背景から選んだ id>
SLIDE: 1
LAYOUT: hero
LABEL: [ラベル]
HEADLINE: [1行目]／[2行目]
EMPHASIS: [強調ワード]

SLIDE: 2
LAYOUT: device-bottom
LABEL: [ラベル]
HEADLINE: [1行目]／[2行目]
EMPHASIS: [強調ワード]

（以下同様に SLIDE: ${slideCount} まで）`;
}

// 出力から推奨テーマ id を取り出す。未検出/不正なら undefined。
export function parseRecommendedTheme(text: string): string | undefined {
  const m = text.match(/THEME:\s*([a-z-]+)/i);
  const id = m?.[1]?.toLowerCase();
  return id && THEMES[id] ? id : undefined;
}

// 出力から推奨背景スタイル id を取り出す。未検出/不正なら undefined。
export function parseRecommendedBackground(text: string): string | undefined {
  const m = text.match(/BG:\s*([a-z-]+)/i);
  const id = m?.[1]?.toLowerCase();
  return id && isBackgroundStyle(id) ? id : undefined;
}

export function parseAppSSCopy(text: string, slideCount: number): AppSSCopySlideIdea[] {
  const blocks = text.split(/(?:^|\n)\s*SLIDE:\s*\d+\s*/).filter((b) => b.trim());
  const slides: AppSSCopySlideIdea[] = [];

  for (const block of blocks) {
    const layoutMatch = block.match(/LAYOUT:\s*([a-z-]+)/i);
    const labelMatch = block.match(/LABEL:\s*([^\n]+)/);
    const headlineMatch = block.match(/HEADLINE:\s*([^\n]+)/);
    const emphasisMatch = block.match(/EMPHASIS:\s*([^\n]+)/);
    if (!headlineMatch) continue;

    const layoutRaw = (layoutMatch?.[1] || "").toLowerCase() as SlideLayout;
    const layoutHint = LAYOUT_HINTS.includes(layoutRaw) ? layoutRaw : "device-bottom";
    const label = (labelMatch?.[1] || "").trim().replace(/^[[［]|[\]］]$/g, "");
    // 「／」「/」を改行に変換（プロンプトで行区切りとして指示している）
    const headline = headlineMatch[1]
      .trim()
      .replace(/^[[［]|[\]］]$/g, "")
      .split(/[／/]/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
    if (!headline) continue;

    // 強調ワードは headline の部分文字列である場合のみ採用（一致しなければ無視）
    const emphasisRaw = (emphasisMatch?.[1] || "").trim().replace(/^[[［]|[\]］]$/g, "");
    const emphasis = emphasisRaw && headline.includes(emphasisRaw) ? emphasisRaw : undefined;

    slides.push({ label, headline, layoutHint, ...(emphasis ? { emphasis } : {}) });
  }

  if (slides.length < slideCount) {
    throw new Error("スライド案を生成できませんでした。もう一度お試しください。");
  }
  return slides.slice(0, slideCount);
}

export type AppSSCopyResult = {
  slides: AppSSCopySlideIdea[];
  recommendedThemeId?: string;
  recommendedBackgroundStyle?: string;
};

export async function generateAppSSCopy(
  appName: string,
  appDescription: string,
  features: string[],
  tone: string,
  slideCount: number,
): Promise<AppSSCopyResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません。");
  const ai = new GoogleGenAI({ apiKey });

  const result = await generateContentWithRetry(
    ai,
    {
      model: GEMINI_MODEL,
      contents: buildAppSSCopyPrompt(appName, appDescription, features, tone, slideCount),
      config: {
        thinkingConfig: GEMINI_THINKING_OFF,
        temperature: 0.85,
        maxOutputTokens: 1024,
      },
    },
    3,
  );

  const text = result.text;
  if (!text) {
    throw new Error("Gemini API から本文が返りませんでした。もう一度お試しください。");
  }
  return {
    slides: parseAppSSCopy(text, slideCount),
    recommendedThemeId: parseRecommendedTheme(text),
    recommendedBackgroundStyle: parseRecommendedBackground(text),
  };
}
