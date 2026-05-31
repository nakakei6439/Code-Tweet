import { GoogleGenAI } from "@google/genai";
import twitterText from "twitter-text";
import type { Tweet } from "@/types/tweet";

const TWEET_LIMIT = 280;
export const GEMINI_MODEL = "gemini-2.5-flash";

export function formatScheduleLabel(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dow = ["日", "月", "火", "水", "木", "金", "土"][new Date(year, month - 1, day).getDay()];
  return `${month}月${day}日（${dow}）${timeStr}`;
}
const MAX_REGENERATE_ATTEMPTS = 4;
const URL_LEAD_RE =
  /(App Storeで無料公開中|今すぐインストール|iPhoneで無料で使える|ダウンロードはこちら|詳しくはこちら|今すぐ試す|無料で使えます|コードを見る|OSSとして公開中|GitHubで公開中)/i;
const POST_MARKER_RE = /(?:^|\n)\s*(?:\d+[.)．:：]|[（(]\d+[）)]|ポスト\s*\d+[:：]?)\s*/;

export type ParsedGeneratedTweets = {
  drafts: string[];
  schedules: { label: string; reason: string }[];
};

export function countWeighted(text: string): number {
  return twitterText.parseTweet(text).weightedLength;
}

function splitUrlLead(leadIn: string): { body: string; lead: string } {
  const trimmed = leadIn.trim();
  const ctaMatch = trimmed.match(new RegExp(`${URL_LEAD_RE.source}[^\\n]*$`, "i"));

  if (!ctaMatch || ctaMatch.index === undefined) {
    return { body: "", lead: trimmed };
  }

  return {
    body: trimmed.slice(0, ctaMatch.index).trim(),
    lead: trimmed.slice(ctaMatch.index).trim(),
  };
}

function isUrlLeadLine(line: string): boolean {
  const trimmed = line.trim();
  return URL_LEAD_RE.test(trimmed) || /[→:：]$/.test(trimmed);
}

function uniqTags(tags: string[]): string {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).join(" ");
}

function extractHashtags(text: string): string[] {
  return text.match(/#[^\s#]+/g) ?? [];
}

function getDefaultUrlLead(url: string): string {
  if (/apps\.apple\.com/i.test(url)) return "App Storeで無料公開中 →";
  if (/play\.google\.com/i.test(url)) return "今すぐインストール →";
  if (/github\.com|github\.io/i.test(url)) return "GitHubで公開中 →";
  return "詳しくはこちら →";
}

export function reformatTweet(text: string, requiredHashtags = "", requiredUrl = ""): string {
  let rest = text.trim();

  const requiredTags = extractHashtags(requiredHashtags);
  const inlineTags = extractHashtags(rest);
  const standaloneTags: string[] = [];
  rest = rest
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (/^(?:#\S+\s*)+$/.test(trimmed)) {
        standaloneTags.push(...trimmed.split(/\s+/));
        return false;
      }
      return true;
    })
    .join("\n")
    .trim();

  const hashtagMatch = rest.match(/(?:\s*#\S+)+\s*$/);
  let hashtags = uniqTags(standaloneTags);
  if (hashtagMatch) {
    hashtags = uniqTags([...standaloneTags, ...hashtagMatch[0].trim().split(/\s+/)]);
    rest = rest.slice(0, hashtagMatch.index).trim();
  }

  if (requiredTags.length > 0) {
    hashtags = uniqTags([...hashtags.split(/\s+/), ...requiredTags]);
  } else if (!hashtags && inlineTags.length > 0) {
    hashtags = uniqTags(inlineTags);
  }

  // リード文と URL を取り出し、AI が先頭や途中に置いた場合も末尾側へ正規化する。
  // 2 つ目以降の URL（同一 URL の重複含む）は本文から完全に除去する。
  const urlRe = /https?:\/\/\S+/;
  const urlLineMatch = rest.match(urlRe);
  let urlBlock = "";
  if (urlLineMatch) {
    const urlStr = urlLineMatch[0].replace(/[。、！？.,!?]+$/, "");
    const lines = rest.split("\n");
    const nextLines: string[] = [];
    let leadCaptured = false;
    let lead = "";

    for (const line of lines) {
      const match = line.match(urlRe);
      if (!match) {
        nextLines.push(line);
        continue;
      }

      const beforeUrl = line.slice(0, match.index).trim();
      const afterUrl = line.slice((match.index ?? 0) + match[0].length).trim();

      if (!leadCaptured) {
        leadCaptured = true;
        if (beforeUrl) {
          const split = splitUrlLead(beforeUrl);
          lead = split.lead;
          if (split.body) nextLines.push(split.body);
        } else {
          const prevContentIndex = [...nextLines].map((item) => item.trim()).findLastIndex(Boolean);
          if (prevContentIndex >= 0 && isUrlLeadLine(nextLines[prevContentIndex])) {
            lead = nextLines[prevContentIndex].trim();
            nextLines.splice(prevContentIndex, 1);
          }
        }
      } else {
        // 2 つ目以降の URL は本文から削除。直前のリード文行や同行内のリード文部分も合わせて捨てる。
        const prevContentIndex = [...nextLines].map((item) => item.trim()).findLastIndex(Boolean);
        if (prevContentIndex >= 0 && isUrlLeadLine(nextLines[prevContentIndex])) {
          nextLines.splice(prevContentIndex, 1);
        }
        if (beforeUrl) {
          const split = splitUrlLead(beforeUrl);
          if (split.body) nextLines.push(split.body);
        }
      }

      if (afterUrl && !/^[。、！？.,!?]+$/.test(afterUrl)) nextLines.push(afterUrl);
    }

    urlBlock = lead ? `${lead}\n${urlStr}` : urlStr;
    rest = nextLines.join("\n").trim();
  }

  if (requiredUrl) {
    const defaultLead = getDefaultUrlLead(requiredUrl);
    if (!urlBlock) {
      urlBlock = `${defaultLead}\n${requiredUrl}`;
    } else if (!urlBlock.includes(requiredUrl)) {
      const lead = urlBlock.split("\n")[0]?.trim();
      urlBlock = `${lead || defaultLead}\n${requiredUrl}`;
    }
  }

  return [rest, urlBlock, hashtags].filter(Boolean).join("\n\n");
}

function stripPostMarker(text: string): string {
  const marker = text.match(POST_MARKER_RE);
  if (!marker || marker.index === undefined) return text.trim();
  return text.slice(marker.index + marker[0].length).trim();
}

// SCHEDULE 行の後ろ（次ポストの番号マーカー手前まで）に Gemini が置いたハッシュタグ行だけを回収する。
// 本文・URL 等の他テキストは拾わず捨てる。番号マーカー行が出たらそこで打ち切る。
function extractTrailingHashtagLine(tail: string): string {
  const lines: string[] = [];
  for (const line of tail.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (POST_MARKER_RE.test(`\n${line}`)) break;
    if (/^(?:#\S+\s*)+$/.test(trimmed)) lines.push(trimmed);
  }
  return lines.join("\n");
}

export function parseGeneratedTweets(text: string): ParsedGeneratedTweets {
  const SCHEDULE_RE = /SCHEDULE:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*\/\s*([^\n]+)/g;
  const scheduleMatches = Array.from(text.matchAll(SCHEDULE_RE));
  if (scheduleMatches.length < 5) {
    throw new Error("5件のポストを生成できませんでした。もう一度お試しください。");
  }

  const drafts: string[] = [];
  const schedules: { label: string; reason: string }[] = [];

  for (let i = 0; i < 5; i++) {
    const sched = scheduleMatches[i];
    const schedStart = sched.index!;
    const schedEnd = schedStart + sched[0].length;
    const prevSchedEnd = i === 0 ? 0 : scheduleMatches[i - 1].index! + scheduleMatches[i - 1][0].length;
    const nextSchedStart = i + 1 < scheduleMatches.length ? scheduleMatches[i + 1].index! : text.length;

    // SCHEDULE 行をポスト本文の終端として扱う。SCHEDULE 行以降は次ポストの番号マーカーまで捨てる
    // ことで、Gemini が SCHEDULE 後に追加の本文・URL ブロックを書いてもポストに混入させない。
    let content = stripPostMarker(text.slice(prevSchedEnd, schedStart));
    if (!content) {
      throw new Error("5件のポストを生成できませんでした。もう一度お試しください。");
    }

    // ただしハッシュタグ行だけは SCHEDULE 行の後ろに置かれても回収し、本文末尾へ戻す
    // （Gemini が非決定的にハッシュタグ行を SCHEDULE 後に出力してもポストから消えないようにする）。
    const trailingTags = extractTrailingHashtagLine(text.slice(schedEnd, nextSchedStart));
    if (trailingTags) {
      content = `${content}\n${trailingTags}`;
    }

    drafts.push(content);
    schedules.push({
      label: formatScheduleLabel(sched[1], sched[2]),
      reason: sched[3].trim(),
    });
  }

  return { drafts, schedules };
}

// 対応URL: App Store / Google Play / GitHub Pages / GitHub / その他Web
export function detectUrlType(url: string): string {
  if (/apps\.apple\.com/i.test(url))  return "App Store（iOS アプリのダウンロードページ）";
  if (/play\.google\.com/i.test(url)) return "Google Play（Android アプリのダウンロードページ）";
  if (/github\.io/i.test(url))        return "GitHub Pages（デモまたはドキュメントサイト）";
  if (/github\.com/i.test(url))       return "GitHub（ソースコードまたはリポジトリページ）";
  return "Webアプリ・ランディングページ";
}

function buildPrompt(projectText: string, toneMemo: string, url: string, hashtags: string, todayStr: string): string {
  return `あなたは個人開発者向けのTwitter/Xマーケティングの専門家です。
以下のプロジェクト説明を読み、そのプロダクトを宣伝するためのポストを5件生成してください。

【プロジェクト説明】
${projectText}
${toneMemo ? `\n【口調・トーン指示】\n${toneMemo}` : ""}
${url ? `\n【URL（必須）】\n全ポストに必ず以下のURLを含める。省略・変形は一切不可：${url}\nこのURLは「${detectUrlType(url)}」へのリンク。URLは単独行に置き、その直前の行にURLの種別に合ったリード文を記載する。\n- App Store/Google Play → 「App Storeで無料公開中 →」「今すぐインストール →」「iPhoneで無料で使える →」など\n- GitHub → 「コードを見る →」「OSSとして公開中 →」「GitHubで公開中 →」など\n- Webアプリ → 「詳しくはこちら →」「今すぐ試す →」「無料で使えます →」など\n5件それぞれ異なるリード文を使うこと。同じフレーズを繰り返さない。` : ""}
${hashtags
  ? `\n【ハッシュタグ（必須）】\n以下のハッシュタグを必ず含め、さらにプロダクトに関連するハッシュタグを追加して合計3〜5つにする。指定タグの省略・変形は一切不可：${hashtags}`
  : `\n【ハッシュタグ（必須）】\nプロダクトの内容・ターゲット層に合ったハッシュタグを3〜5つ生成して各ポストの末尾に付ける`}

【要件】
- 必ず5件のポストを生成する
- 各ポストは X の weighted length で 280 ウェイト以内に収める
- weighted length の計算ルール：半角英数記号=1、日本語・絵文字など全角文字=2、URL は実長を問わず 23 ウェイト固定
- ハッシュタグ・URL・リード文・改行を含めた合計を 280 ウェイト以内とする
- 余裕を持たせるため 260 ウェイトを目安に作成する（日本語のみなら約 130 文字、英語のみなら約 260 文字が目安）
- 本文には読みやすさのために1〜2箇所の改行を入れる
- ハッシュタグは本文・URLと改行して末尾に記載する（例：「本文\n#tag1 #tag2 #tag3」）
- 本文中にハッシュタグを入れた場合でも、最後の行にハッシュタグ行を必ず作る
- ハッシュタグ行は本文末尾に 1 行だけ。本文中・URL の前後に追加のハッシュタグ行を書かない
- ハッシュタグ行はポスト本文の一部であり、必ず SCHEDULE: 行より前に置く。SCHEDULE: 行の後ろにハッシュタグを書かない
- ハッシュタグはユーザー指定分を含め合計3〜5つにする（ハッシュタグ未指定の場合もプロダクトに関連するタグを3〜5つ生成する）
${url ? `- URL は 1 ポストにつき 1 回のみ出力する。同じ URL も別の URL も、本文中に 2 回以上書かない\n- URL の直前リード文（例：「無料でダウンロード →」）も 1 ポストに 1 回のみ` : "- URLが指定されていないため、URL・アプリストアURL・App Store・Google Play などのリンクや参照テキストを一切含めない"}
- 1 ポストには本文を 1 つだけ書く。同一ポスト内に複数の本文パターン・複数の CTA・複数の段落構成を混在させない
- ストーリーアークの各段階は 1 ポスト内で 1 つだけ扱う。例えば「ユーザーの声・共感」と「CTA・エンゲージメント」を 1 ポストに同居させない
- SCHEDULE: 行はポスト本文の終端を示す。SCHEDULE: 行を出力したら、その後ろには何も書かず、次のポスト番号（例：2.）または出力終了まで空白以外の文字を入れない
- 以下のストーリーアークに沿って順番に生成する：
  1. プロジェクト紹介（何ができるアプリかを端的に伝える）
  2. 使い方・始め方（すぐ使えることを強調）
  3. 具体的なユースケース（誰にどんな場面で役立つか）
  4. ユーザーの声・共感（開発者あるあるの課題感）
  5. CTA・エンゲージメント（試してほしい呼びかけ）

【推奨投稿日時】
今日の日付：${todayStr}（翌日から7日以内の日付を指定すること）
各ポストの本文の直後の行に以下の形式で推奨投稿日時を出力する：
SCHEDULE: YYYY-MM-DD HH:MM / 理由（15文字以内）
- ポストの目的・ターゲット層・内容に合わせた日時を選ぶ
- 5件はすべて異なる日時にする

【出力形式】
必ず以下の形式で出力する。説明・見出し・空行は不要。
各ポストはハッシュタグ行で終わり、その直後の行に SCHEDULE: を置く（ハッシュタグ行は必ず SCHEDULE: 行より前）。

1. [ポスト本文]
#tag1 #tag2 #tag3
SCHEDULE: YYYY-MM-DD HH:MM / 理由
2. [ポスト本文]
#tag1 #tag2 #tag3
SCHEDULE: YYYY-MM-DD HH:MM / 理由
3. [ポスト本文]
#tag1 #tag2 #tag3
SCHEDULE: YYYY-MM-DD HH:MM / 理由
4. [ポスト本文]
#tag1 #tag2 #tag3
SCHEDULE: YYYY-MM-DD HH:MM / 理由
5. [ポスト本文]
#tag1 #tag2 #tag3
SCHEDULE: YYYY-MM-DD HH:MM / 理由`;
}

function buildShortenPrompt(
  originalText: string,
  currentWeight: number,
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string
): string {
  return `以下のポストは X の weighted length が ${currentWeight} で、上限 280 ウェイトを超過しています。文意・トーン・ハッシュタグを保ったまま、260 ウェイト以内に収まるように短縮してください。

【プロジェクト説明（参考）】
${projectText}
${toneMemo ? `\n【口調・トーン指示】\n${toneMemo}` : ""}
${url ? `\n【URL（省略・変形不可）】\n${url}\nURLは単独行に置き、直前の行のリード文も必ずそのまま保持する。` : ""}
${hashtags ? `\n【ハッシュタグ（省略・変形不可）】\n指定タグを含む全ハッシュタグを保持する（合計3〜5つ）：${hashtags}` : ""}

【元のポスト】
${originalText}

【weighted length 計算ルール】
半角英数記号=1、日本語・絵文字など全角=2、URL は実長を問わず 23 ウェイト固定。

【出力形式】
短縮後のポスト本文のみを返す。番号・引用符・説明・前置きは一切含めない。`;
}

async function regenerateOne(
  originalText: string,
  currentWeight: number,
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string,
  ai: GoogleGenAI
): Promise<string> {
  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildShortenPrompt(originalText, currentWeight, projectText, toneMemo, url, hashtags),
  });
  return (result.text ?? "").trim().replace(/^["「『]|["」』]$/g, "").trim();
}

export async function generateTweets(
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string
): Promise<Tweet[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません。");
  const ai = new GoogleGenAI({ apiKey });

  const today = new Date();
  const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildPrompt(projectText, toneMemo, url, hashtags, todayStr),
  });
  const text = result.text;
  if (!text) {
    throw new Error("Gemini API から本文が返りませんでした。もう一度お試しください。");
  }

  const { drafts, schedules } = parseGeneratedTweets(text);

  for (let i = 0; i < drafts.length; i++) {
    let current = reformatTweet(drafts[i], hashtags, url);
    let weight = countWeighted(current);
    let attempts = 0;
    while (weight > TWEET_LIMIT && attempts < MAX_REGENERATE_ATTEMPTS) {
      attempts++;
      try {
        const shortened = reformatTweet(
          await regenerateOne(current, weight, projectText, toneMemo, url, hashtags, ai),
          hashtags,
          url
        );
        const shortenedWeight = countWeighted(shortened);
        if (shortenedWeight <= TWEET_LIMIT && shortened.length > 0) {
          current = shortened;
          weight = shortenedWeight;
          break;
        }
        if (shortened.length > 0 && shortenedWeight < weight) {
          current = shortened;
          weight = shortenedWeight;
        }
      } catch {
        break;
      }
    }
    drafts[i] = current;
  }

  return drafts.map((text, i) => {
    const weightedLength = countWeighted(text);
    return {
      id: i + 1,
      text,
      weightedLength,
      isOverLimit: weightedLength > TWEET_LIMIT,
      recommendedTime: schedules[i],
    };
  });
}
