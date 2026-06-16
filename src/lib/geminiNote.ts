import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, GEMINI_THINKING_OFF, generateContentWithRetry, detectUrlType, formatScheduleLabel } from "@/lib/gemini";
import {
  DEFAULT_NOTE_LENGTH_PRESET,
  NOTE_LENGTH_PRESETS,
} from "@/lib/noteLengthPresets";
import type {
  NoteDraft,
  NoteLengthPreset,
  NoteRecommendedTime,
} from "@/types/note";

const TITLE_RE = /^\s*TITLE:\s*(.+)\s*$/m;
const TITLE_MAX_LENGTH = 32;
const HASHTAG_LINE_RE = /^\s*#\S+(?:\s+#\S+)+\s*$/m;
const SCHEDULE_RE =
  /SCHEDULE:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*\/\s*([^/\n]+?)\s*\/\s*([^\n]+)/g;
const SCHEDULE_LINE_RE = /^\s*SCHEDULE:.*$/gm;

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(HASHTAG_LINE_RE, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^---+\s*$/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function countPlainText(markdown: string): number {
  return stripMarkdown(markdown).length;
}

function buildNotePrompt(
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string,
  todayStr: string,
  lengthPreset: NoteLengthPreset,
): string {
  const { min, max } = NOTE_LENGTH_PRESETS[lengthPreset];
  return `あなたは個人開発者のプロダクトを紹介する note 記事を書くテクニカルライターです。
以下のプロジェクト説明をもとに、note.com にコピー＆ペーストして公開できる紹介記事の下書きを1本作成してください。

【最重要ルール（絶対厳守）】
- TITLE 行のタイトルは記号・空白も含めて必ず ${TITLE_MAX_LENGTH} 文字以内にする。${TITLE_MAX_LENGTH} 文字を超えるタイトルは絶対に出力しない。長くなりそうなら短くまとめ直す。
- 本文の長さは **プレーンテキスト換算で必ず ${min.toLocaleString("en-US")}〜${max.toLocaleString("en-US")} 字** に収める。プレーンテキスト換算とは、Markdown 記号（\`#\` \`##\` \`-\` \`*\` \`**\` \`>\` \`1.\` リンク記号 \`[](url)\` の \`[]()\` 部分等）と末尾のハッシュタグ行を除いた本文の字数。**上限 ${max.toLocaleString("en-US")} 字は絶対に超えない**。長くなりそうなら、各セクションを短く圧縮するか、箇条書きの項目数を減らす。書き終わったら自分で字数を見積もり、上限超過していたら削る。

【プロジェクト説明】
${projectText}
${toneMemo ? `\n【口調・トーン指示】\n${toneMemo}` : ""}
${url ? `\n【URL】\n${url}\nこのURLは「${detectUrlType(url)}」へのリンク。記事末尾の「## 最後に」セクションで1回だけ Markdown リンク \`[テキスト](URL)\` として埋め込む。本文中で URL を2回以上使わない。` : ""}
${hashtags ? `\n【ハッシュタグ（必須）】\n以下のハッシュタグを必ず記事末尾に1行で出力する：${hashtags}\nさらにプロダクト内容に合うハッシュタグを足して合計3〜5つにする。` : `\n【ハッシュタグ】\nプロダクトの内容に合うハッシュタグを3〜5つ生成し、記事末尾に1行で出力する。`}

【記事構成（この順番・見出しを必ず使う）】
1. リード文（200〜300字）：誰のどんな課題を解決するプロダクトかを端的に書く。見出しは付けない
2. \`## こんな課題はありませんか？\`：ターゲットが抱える課題を箇条書きで3つ前後
3. \`## 〇〇とは\`：プロダクト概要。〇〇はプロダクト名に置き換える
4. \`## 主な機能\`：箇条書きで3〜5個。各項目は「**機能名** — 説明」の形
5. \`## 使い方\`：番号付きリストで導入手順を3〜5ステップ
6. \`## こんな人におすすめ\`：箇条書きで3つ前後
7. \`## 最後に\`：読者への呼びかけ。${url ? "上記URLを Markdown リンクで1回だけ埋め込む。" : "リンクは含めない。"}
8. 末尾にハッシュタグ行（1行）

【Markdown ルール（note 対応記法のみ使う）】
- 使う：\`#\` \`##\` \`###\` / \`-\`（箇条書き） / \`1.\`（番号付き） / \`>\`（引用） / \`\`\`\`\`\`（コードブロック、必要な場合のみ） / \`[text](url)\`（リンク） / \`**bold**\` / \`---\`（区切り線、必要な場合のみ）
- 使わない：斜体 \`*x*\`、表（\`|\`）、HTML タグ、フロントマター（\`---\` のYAML）、画像
- 本文の長さ：プレーンテキスト換算で ${min.toLocaleString("en-US")}〜${max.toLocaleString("en-US")} 字（ハッシュタグ行除外、絶対に上限を超えない）。短めの目標の場合は各セクションを 2〜3 行で簡潔にまとめ、必要に応じて箇条書きの項目数も最小限にする
- 句点で改行し、段落の間は空行を入れて読みやすくする
- 「〇〇とは」の見出しでは必ずプロダクト名を入れる（プロジェクト説明から推測）

【おすすめ投稿時間（記事末尾に必ず出力）】
ハッシュタグ行の後に、この記事を note.com に公開するのに適した日時を3件、以下の形式で1行ずつ出力する：
SCHEDULE: YYYY-MM-DD HH:MM / カテゴリ / 理由（20文字以内）
- カテゴリは必ず「おすすめ」「プロモーション」「マーケティング」の3つをこの順番で1件ずつ使う。
- 日付は今日（${todayStr}）の翌日から7日以内。3件すべて異なる日時にする。
- note.com の読者行動に合わせて選ぶ（X とは異なる）。夜のゴールデンタイム 21〜23時、平日昼 12〜13時、土日の朝〜午前などが読まれやすい。記事のテーマ・ターゲット層に合わせて最適な日時と理由を選ぶ。
- これは投稿タイミングのメタ情報であり、本文の文字数には含めない（本文の字数制限には影響しない）。

【出力形式】
必ず以下の形式で出力する。前置き・説明・コードフェンスでの全体ラップ・引用符は一切付けない。

TITLE: 記事タイトル（必ず${TITLE_MAX_LENGTH}字以内・記号や空白を含めてカウント、内容を端的に表す）

[ここから記事本文を Markdown で書く]

#tag1 #tag2 #tag3

SCHEDULE: YYYY-MM-DD HH:MM / おすすめ / 理由
SCHEDULE: YYYY-MM-DD HH:MM / プロモーション / 理由
SCHEDULE: YYYY-MM-DD HH:MM / マーケティング / 理由

（今日の日付：${todayStr}。記事本文中に日付を入れる必要はない。）`;
}

function parseRecommendedTimes(text: string): NoteRecommendedTime[] {
  return Array.from(text.matchAll(SCHEDULE_RE)).map((match) => ({
    label: formatScheduleLabel(match[1], match[2]),
    category: match[3].trim(),
    reason: match[4].trim(),
  }));
}

function parseNoteOutput(text: string): NoteDraft {
  const trimmed = text.trim();
  const titleMatch = trimmed.match(TITLE_RE);
  if (!titleMatch) {
    throw new Error("note Draftを生成できませんでした。もう一度お試しください。");
  }
  const title = titleMatch[1].trim().replace(/^["「『]|["」』]$/g, "");
  const recommendedTimes = parseRecommendedTimes(trimmed);
  const markdown = trimmed
    .slice((titleMatch.index ?? 0) + titleMatch[0].length)
    .replace(SCHEDULE_LINE_RE, "")
    .replace(/^\s*\n+/, "")
    .trim();
  if (!markdown) {
    throw new Error("note Draftを生成できませんでした。もう一度お試しください。");
  }
  return {
    title,
    markdown,
    charCount: countPlainText(markdown),
    recommendedTimes,
  };
}

export async function generateNoteDraft(
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string,
  lengthPreset: NoteLengthPreset = DEFAULT_NOTE_LENGTH_PRESET,
): Promise<NoteDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません。");
  const ai = new GoogleGenAI({ apiKey });

  const today = new Date();
  const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  const { min: bodyMin, max: bodyMax } = NOTE_LENGTH_PRESETS[lengthPreset];

  const basePrompt = buildNotePrompt(projectText, toneMemo, url, hashtags, todayStr, lengthPreset);
  // note は長文のため出力枠を大きめに確保しつつ、thinking は無効化してレイテンシを抑える。
  const noteConfig = {
    thinkingConfig: GEMINI_THINKING_OFF,
    temperature: 0.8,
    maxOutputTokens: 8192,
  } as const;
  const first = await generateContentWithRetry(ai, {
    model: GEMINI_MODEL,
    contents: basePrompt,
    config: noteConfig,
  }, 3);
  if (!first.text) {
    throw new Error("Gemini API から本文が返りませんでした。もう一度お試しください。");
  }
  const firstNote = parseNoteOutput(first.text);
  const firstViolations = describeViolations(firstNote, bodyMin, bodyMax);
  if (firstViolations.length === 0) {
    return firstNote;
  }

  const retryPrompt = `${basePrompt}\n\n【再生成指示】\n${firstViolations.join("\n")}\nタイトルは ${TITLE_MAX_LENGTH} 字以内、本文は ${bodyMin.toLocaleString("en-US")}〜${bodyMax.toLocaleString("en-US")} 字（プレーンテキスト換算）に必ず収めてください。`;
  const retry = await generateContentWithRetry(ai, {
    model: GEMINI_MODEL,
    contents: retryPrompt,
    config: noteConfig,
  }, 1);
  if (!retry.text) {
    return firstNote;
  }
  try {
    const retryNote = parseNoteOutput(retry.text);
    return overage(retryNote, bodyMax) <= overage(firstNote, bodyMax)
      ? retryNote
      : firstNote;
  } catch {
    return firstNote;
  }
}

function describeViolations(note: NoteDraft, bodyMin: number, bodyMax: number): string[] {
  const issues: string[] = [];
  if (note.title.length > TITLE_MAX_LENGTH) {
    issues.push(`前回のタイトルは「${note.title}」で ${note.title.length} 字あり、上限 ${TITLE_MAX_LENGTH} 字を超えました。`);
  }
  if (note.charCount > bodyMax) {
    issues.push(`前回の本文（プレーンテキスト換算）は ${note.charCount} 字あり、上限 ${bodyMax} 字を超えました。${note.charCount - bodyMax} 字以上削ってください。`);
  } else if (note.charCount < bodyMin) {
    issues.push(`前回の本文（プレーンテキスト換算）は ${note.charCount} 字で、下限 ${bodyMin} 字に届きませんでした。`);
  }
  return issues;
}

function overage(note: NoteDraft, bodyMax: number): number {
  return Math.max(0, note.title.length - TITLE_MAX_LENGTH) + Math.max(0, note.charCount - bodyMax);
}
