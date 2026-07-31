import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, GEMINI_THINKING_OFF, generateContentWithRetry } from "./gemini";
import { BACKGROUND_STYLES, THEMES, isBackgroundStyle, sanitizeHex } from "./appss/constants";
import type { AppSSCopySlideIdea, GeneratedPalette } from "@/types/appss";
import type { SlideLayout } from "./appss/types";

export const APPSS_MIN_SLIDES = 3;
export const APPSS_MAX_SLIDES = 6;
export const APPSS_DEFAULT_SLIDES = 5;

const LAYOUT_HINTS: SlideLayout[] = [
  "hero",
  "device-bottom",
  "device-top",
  "two-devices",
  "collage-duo",
  "collage-trio",
  "no-device",
];

// AI がアプリの雰囲気からテーマを選ぶための説明。id は constants.ts の THEMES と一致。
const THEME_GUIDE: { id: string; vibe: string }[] = [
  { id: "simple-white", vibe: "清潔・信頼感。ユーティリティ/ビジネス/金融/生産性/ツール系" },
  { id: "pastel", vibe: "やわらかく親しみやすい。家計簿/ヘルスケア/子供/女性向け/日記系" },
  { id: "dark-neon", vibe: "先進的でクール。開発ツール/ガジェット/ゲーム/音楽/暗めのUI系" },
  { id: "washi", vibe: "和風で上質・落ち着き。和風/伝統/文化/瞑想/写真/読書系" },
  { id: "pop", vibe: "ポップで高彩度・元気。エンタメ/SNS/フード/若者向け系" },
  { id: "ocean", vibe: "爽やかで清涼感。旅行/天気/水泳・アウトドア/学習系" },
  { id: "forest", vibe: "自然で健やか。フィットネス/ヘルスケア/農業・園芸/サステナ系" },
  { id: "sunset", vibe: "温かく情緒的。恋愛/日記/写真加工/ライフスタイル系" },
  { id: "mono", vibe: "洗練されたミニマル。デザインツール/高級/プロフェッショナル系" },
  { id: "midnight", vibe: "高級感・重厚。金融/セキュリティ/プレミアムサブスク系" },
  { id: "mocha", vibe: "落ち着いた温もり。カフェ/読書/手帳・ノート/趣味系" },
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
2〜${slideCount - 1}枚目: 主要機能・差別化ポイントを 1 スライド 1 つずつ（LAYOUT: device-bottom / device-top / two-devices / collage-duo / collage-trio を交互に使い、同じレイアウトを連続させない）
${slideCount}枚目: 締め — 信頼感や行動喚起（例：今すぐ無料ではじめよう）（LAYOUT: no-device）

【collage-duo の使いどころ】
2枚の画面を大胆に傾けて重ねるレイアウト。「Before/After」「使う前と後」「2つの機能を比較」など、
2枚を対比・並列で見せたいスライドに使うと効果的。

【collage-trio の使いどころ】
3枚の画面を扇状に並べるレイアウト。「3つの機能が揃っている」「豊富なテンプレート/選択肢」など、
量・種類の豊富さを一気に見せたいスライドに使う。デッキ全体で使うのは1回まで（多用すると煩雑になる）。

【配色フォント基調の選択】
このアプリの内容${tone ? "と上記トーン指示" : ""}に最も近い基調を次から1つ選ぶ（フォントの選定に使う）：
${THEME_GUIDE.map((t) => `- ${t.id}: ${t.vibe}`).join("\n")}

【配色パレットの生成（重要）】
既製テーマをそのまま使うのではなく、このアプリ専用の配色パレットを新しく生成する。
- bg（背景色）・fg（見出し等の文字色）・accent（強調色）・muted（補助色）を #RRGGBB 形式で出す
- bg と fg は必ず高コントラスト（明るい背景×濃い文字、または暗い背景×明るい文字）
- accent はアプリの個性が出る鮮やかな1色。App Store のサムネで目を引く色にする
- アプリのジャンル・雰囲気・トーンに合わせて毎回違う配色にする（無難な使い回しを避ける）

【背景スタイルの選択】
このアプリの雰囲気に最も合う背景装飾を次から1つ選ぶ：
${BACKGROUND_STYLES.map((s) => `- ${s.id}: ${s.vibe}`).join("\n")}

【強調ワード】
各スライドで、HEADLINE の中で最も訴求したい語句を1つだけ EMPHASIS に書く。
- EMPHASIS は HEADLINE に含まれる連続した部分文字列にする（改行「／」をまたがない、1〜6文字程度）
- アプリの価値が一番伝わるキーワードを選ぶ（例: HEADLINE「毎日が／ラクに」→ EMPHASIS: ラク）

【出力形式】
説明・前置き・空行は不要。まず基調・背景・パレットを次の3行で出力し、続けて ${slideCount} ブロック出力する：

THEME: <上記基調から選んだ id>
BG: <上記背景から選んだ id>
PALETTE: bg=#RRGGBB fg=#RRGGBB accent=#RRGGBB muted=#RRGGBB
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

// PALETTE 行から AI 生成パレットを取り出す。bg/fg/accent が有効な hex で揃った場合のみ返す。
// 例: "PALETTE: bg=#0f172a fg=#f8fafc accent=#22d3ee muted=#94a3b8"
export function parseGeneratedPalette(text: string): GeneratedPalette | undefined {
  const line = text.match(/PALETTE:\s*([^\n]+)/i)?.[1];
  if (!line) return undefined;
  const pick = (key: string) =>
    sanitizeHex(line.match(new RegExp(`${key}\\s*=\\s*(#[0-9a-fA-F]{3,6})`, "i"))?.[1]);
  const bg = pick("bg");
  const fg = pick("fg");
  const accent = pick("accent");
  if (!bg || !fg || !accent) return undefined;
  const muted = pick("muted");
  return { bg, fg, accent, ...(muted ? { muted } : {}) };
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
  generatedPalette?: GeneratedPalette;
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
    generatedPalette: parseGeneratedPalette(text),
  };
}

// ---------- トップページ「READMEからスクショを作る」フォーム用：軽量アプリ情報推定 ----------
// スライド生成（1回消費）とは別の、無料・即時のGemini呼び出し。README読み込み直後に自動実行し、
// 「アプリ名」欄を仮入力するほか、アプリの説明・主な機能も推定して/appssエディタの
// 「AIコピー＆デザイン生成」パネルの初期値としてハンドオフ経由で引き継ぐ
// （間違っていればユーザーがその場で編集する前提）。
const MAX_EXTRACT_README_CHARS = 6000; // 推定に全文は不要。速度・コスト優先で先頭のみ渡す

export type AppSSExtractInfo = {
  appName?: string;
  appDescription?: string;
  features: string[];
};

export function buildAppSSInfoPrompt(readme: string): string {
  return `以下は、あるアプリの GitHub README です。次の3つを推定してください。

【README】
${readme.slice(0, MAX_EXTRACT_README_CHARS)}

【出力形式】
説明・前置きは不要。次の3行のみを出力する（推定が難しくても常識的に推測し、必ず埋める）：
APP_NAME: <正式名称。20文字以内>
APP_DESC: <アプリの説明。何ができて誰のどんな悩みを解決するか。100〜200文字程度>
FEATURES: <主な機能・特徴を3〜5個、「|」区切りで1行に>`;
}

export async function extractAppSSInfo(readme: string): Promise<AppSSExtractInfo> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません。");
  const ai = new GoogleGenAI({ apiKey });

  const result = await generateContentWithRetry(
    ai,
    {
      model: GEMINI_MODEL,
      contents: buildAppSSInfoPrompt(readme),
      config: {
        thinkingConfig: GEMINI_THINKING_OFF,
        temperature: 0.3,
        maxOutputTokens: 220,
      },
    },
    2, // 軽量な補助機能のためリトライ回数は控えめ
  );

  const text = result.text?.trim();
  if (!text) return { features: [] };

  const nameRaw = text.match(/APP_NAME:\s*([^\n]+)/i)?.[1]?.trim();
  const appName = nameRaw
    ? nameRaw.replace(/^["'「『]+|["'」』]+$/g, "").trim().slice(0, 50) || undefined
    : undefined;

  const descRaw = text.match(/APP_DESC:\s*([^\n]+)/i)?.[1]?.trim();
  const appDescription = descRaw ? descRaw.slice(0, 2000) : undefined;

  const featuresLine = text.match(/FEATURES:\s*([^\n]+)/i)?.[1];
  const features = (featuresLine || "")
    .split("|")
    .map((f) => f.trim())
    .filter(Boolean);

  return { appName, appDescription, features };
}
