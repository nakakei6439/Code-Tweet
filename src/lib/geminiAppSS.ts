import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, GEMINI_THINKING_OFF, generateContentWithRetry } from "./gemini";
import { BACKGROUND_STYLES, THEMES, isBackgroundStyle, sanitizeHex } from "./appss/constants";
import type { AppSSCopySlideIdea, GeneratedPalette } from "@/types/appss";
import { DEFAULT_LOCALE, LOCALES, type LocaleId } from "@/lib/locales";
import { isWrongLanguage } from "@/lib/outputLanguage";
import type { BackgroundStyle, SlideLayout } from "./appss/types";

// 見出しコピーの生成試行回数。言語違いだったときの作り直しを 1 回だけ許す。
const MAX_COPY_ATTEMPTS = 2;

export const APPSS_MIN_SLIDES = 3;
export const APPSS_MAX_SLIDES = 6;
export const APPSS_DEFAULT_SLIDES = 5;

// 背景スタイルの「雰囲気」説明。UI には出さず Gemini への指示にだけ使うため、
// 表示名（constants.ts の nameKey）とは分けてプロンプト側に置いている。
const BACKGROUND_VIBES: Record<BackgroundStyle, string> = {
  soft: "やわらかい光のにじみ。万能・親しみ",
  plain: "装飾なしの上品なグラデ。ミニマル/ビジネス",
  grid: "細かなドット格子。テック/ツール/整然",
  spotlight: "上部からの光。プロダクトを主役に演出",
  stripes: "動きのある斜め帯。ポップ/エンタメ/元気",
};

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

// 言語ごとの作文ルール。文字幅が違うので見出しの長さ指定を変える。
// CJK は 1 行 5〜9 文字が収まりの目安だが、ラテン文字は同じ字数だと短すぎる。
const COPY_RULES: Record<LocaleId, { market: string; headlineLength: string; labelLength: string }> = {
  ja: { market: "日本", headlineLength: "1 行 5〜9 文字、最大 2 行", labelLength: "4〜10 文字" },
  en: { market: "US", headlineLength: "2–5 words per line, at most 2 lines", labelLength: "1–3 words" },
  es: { market: "スペイン語圏", headlineLength: "2–5 palabras por línea, máximo 2 líneas", labelLength: "1–3 palabras" },
  "zh-Hans": { market: "中国", headlineLength: "每行 5〜9 个字，最多 2 行", labelLength: "4〜10 个字" },
  "zh-Hant": { market: "台湾・香港", headlineLength: "每行 5〜9 個字，最多 2 行", labelLength: "4〜10 個字" },
  fr: { market: "フランス語圏", headlineLength: "2–5 mots par ligne, 2 lignes maximum", labelLength: "1–3 mots" },
  de: { market: "ドイツ語圏", headlineLength: "2–4 Wörter pro Zeile, höchstens 2 Zeilen", labelLength: "1–3 Wörter" },
  ko: { market: "韓国", headlineLength: "한 줄에 5〜9자, 최대 2줄", labelLength: "4〜10자" },
};

export function buildAppSSCopyPrompt(
  appName: string,
  appDescription: string,
  features: string[],
  tone: string,
  slideCount: number,
  locale: LocaleId = DEFAULT_LOCALE,
): string {
  const rule = COPY_RULES[locale];
  const lang = LOCALES[locale].promptName;
  return `あなたは${rule.market}の App Store で上位に入るアプリのスクリーンショット広告文を数多く手がけてきたコピーライターです。
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
- **LABEL と HEADLINE と EMPHASIS は必ず ${lang} で書く**（アプリ名・製品名だけは原語のままでよい）
- HEADLINE は ${rule.headlineLength}。行の区切りは「／」で明示する
- 改行位置は意味の切れ目に置く。単語や助詞の途中で不自然に切らない
- 文体は ${lang} として自然なものに統一する。直訳調にしない
- LABEL は ${rule.labelLength} の短いアイキャッチ

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
${BACKGROUND_STYLES.map((s) => `- ${s.id}: ${BACKGROUND_VIBES[s.id]}`).join("\n")}

【強調ワード】
各スライドで、HEADLINE の中で最も訴求したい語句を1つだけ EMPHASIS に書く。
- EMPHASIS は HEADLINE に含まれる連続した部分文字列にする（改行「／」をまたがない、短い語句）
- アプリの価値が一番伝わるキーワードを選ぶ（${lang} の HEADLINE から抜き出すこと）

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

（以下同様に SLIDE: ${slideCount} まで）${buildLanguageFooter(locale)}`;
}

// 指示文そのものが日本語なので、日本語 README 由来の説明を渡すとモデルは日本語で返しがちになる。
// 最後の指示ほど効くため、日本語以外を狙うときだけ英語の言語指定を末尾に足す。
// X ポスト側（gemini.ts の buildLanguageFooter）と同じ対処。
function buildLanguageFooter(locale: LocaleId): string {
  if (locale === DEFAULT_LOCALE) return "";
  const lang = LOCALES[locale].promptName;
  return `

CRITICAL — OUTPUT LANGUAGE
Write every LABEL, HEADLINE and EMPHASIS in ${lang}.
The app description above may be written in another language. Do NOT mirror its
language: translate the meaning and write only in ${lang}. App names and product
names may stay in their original script.
The keys THEME / BG / PALETTE / SLIDE / LAYOUT / LABEL / HEADLINE / EMPHASIS and
the id values stay exactly as shown above.`;
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
  locale: LocaleId = DEFAULT_LOCALE,
): Promise<AppSSCopyResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません。");
  const ai = new GoogleGenAI({ apiKey });

  // 見出しコピーは 1 本が短すぎて単体では言語判定できないため、全スライド分をまとめて判定する。
  // 言語違いなら丸ごと生成し直す（X ポストと違い、1 行だけ書き直しても他の行が残るため）。
  let last: AppSSCopyResult | undefined;
  for (let attempt = 0; attempt < MAX_COPY_ATTEMPTS; attempt++) {
    const result = await generateContentWithRetry(
      ai,
      {
        model: GEMINI_MODEL,
        contents: buildAppSSCopyPrompt(appName, appDescription, features, tone, slideCount, locale),
        config: {
          thinkingConfig: GEMINI_THINKING_OFF,
          maxOutputTokens: 1024,
        },
      },
      3,
    );

    const text = result.text;
    if (!text) {
      throw new Error("Gemini API から本文が返りませんでした。もう一度お試しください。");
    }
    const parsed: AppSSCopyResult = {
      slides: parseAppSSCopy(text, slideCount),
      recommendedThemeId: parseRecommendedTheme(text),
      recommendedBackgroundStyle: parseRecommendedBackground(text),
      generatedPalette: parseGeneratedPalette(text),
    };

    const combined = parsed.slides.map((s) => `${s.label} ${s.headline}`).join(" ");
    if (!isWrongLanguage(combined, locale)) return parsed;
    last = parsed;
  }
  // 直らなかった場合は最後の結果を返す。エディタ上でユーザーが直せるので、失敗させるより実害が小さい。
  return last!;
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
