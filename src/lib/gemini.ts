import { GoogleGenAI } from "@google/genai";
import twitterText from "twitter-text";
import type { Tweet } from "@/types/tweet";

const TWEET_LIMIT = 280;
const GEMINI_MODEL = "gemini-2.5-flash";

function formatScheduleLabel(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dow = ["日", "月", "火", "水", "木", "金", "土"][new Date(year, month - 1, day).getDay()];
  return `${month}月${day}日（${dow}）${timeStr}`;
}
const MAX_REGENERATE_ATTEMPTS = 4;

function countWeighted(text: string): number {
  return twitterText.parseTweet(text).weightedLength;
}

function reformatTweet(text: string): string {
  let rest = text.trim();

  const hashtagMatch = rest.match(/(?:\s*#\S+)+\s*$/);
  let hashtags = "";
  if (hashtagMatch) {
    hashtags = hashtagMatch[0].trim().split(/\s+/).join(" ");
    rest = rest.slice(0, hashtagMatch.index).trim();
  }

  // リード文と URL を別行として取り出す
  const urlLineMatch = rest.match(/([^\n]*?)\s*(https?:\/\/\S+?)([。、！？\s]*)$/);
  let urlBlock = "";
  if (urlLineMatch) {
    const leadIn = urlLineMatch[1].trim();
    const urlStr = urlLineMatch[2];
    urlBlock = leadIn ? `${leadIn}\n${urlStr}` : urlStr;
    rest = rest.slice(0, urlLineMatch.index).trim();
  }

  return [rest, urlBlock, hashtags].filter(Boolean).join("\n\n");
}

// 対応URL: App Store / Google Play / GitHub Pages / GitHub / その他Web
function detectUrlType(url: string): string {
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
- ハッシュタグはユーザー指定分を含め合計3〜5つにする（ハッシュタグ未指定の場合もプロダクトに関連するタグを3〜5つ生成する）
${url ? "" : "- URLが指定されていないため、URL・アプリストアURL・App Store・Google Play などのリンクや参照テキストを一切含めない"}
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

1. [ポスト本文]
SCHEDULE: YYYY-MM-DD HH:MM / 理由
2. [ポスト本文]
SCHEDULE: YYYY-MM-DD HH:MM / 理由
3. [ポスト本文]
SCHEDULE: YYYY-MM-DD HH:MM / 理由
4. [ポスト本文]
SCHEDULE: YYYY-MM-DD HH:MM / 理由
5. [ポスト本文]
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

  const SCHEDULE_RE = /SCHEDULE:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*\/\s*([^\n]+)/g;
  const POST_MARKER_RE = /(?:^|\n)\s*\d+\.\s+/;

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

    const beforeSched = text.slice(prevSchedEnd, schedStart);
    const currentMarker = beforeSched.match(POST_MARKER_RE);
    const bodyStart = currentMarker && currentMarker.index !== undefined
      ? currentMarker.index + currentMarker[0].length
      : 0;
    const body = beforeSched.slice(bodyStart).trim();

    const afterSched = text.slice(schedEnd, nextSchedStart);
    const nextMarker = afterSched.match(POST_MARKER_RE);
    const tailEnd = nextMarker && nextMarker.index !== undefined
      ? nextMarker.index
      : afterSched.length;
    const tail = afterSched.slice(0, tailEnd).trim();

    const content = tail ? body + "\n" + tail : body;

    drafts.push(content);
    schedules.push({
      label: formatScheduleLabel(sched[1], sched[2]),
      reason: sched[3].trim(),
    });
  }

  for (let i = 0; i < drafts.length; i++) {
    let current = reformatTweet(drafts[i]);
    let weight = countWeighted(current);
    let attempts = 0;
    while (weight > TWEET_LIMIT && attempts < MAX_REGENERATE_ATTEMPTS) {
      attempts++;
      try {
        const shortened = reformatTweet(
          await regenerateOne(current, weight, projectText, toneMemo, url, hashtags, ai)
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
