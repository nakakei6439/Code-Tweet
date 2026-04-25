import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import twitterText from "twitter-text";
import type { Tweet, RecommendedTime } from "@/types/tweet";

const TWEET_LIMIT = 280;

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
以下のプロジェクト説明を読み、そのプロダクトを宣伝するためのツイートを5件生成してください。

【プロジェクト説明】
${projectText}
${toneMemo ? `\n【口調・トーン指示】\n${toneMemo}` : ""}
${url ? `\n【URL（必須）】\n全ツイートに必ず以下のURLを含める。省略・変形は一切不可：${url}\nこのURLは「${detectUrlType(url)}」へのリンク。URLは単独行に置き、その直前の行にURLの種別に合ったリード文を記載する。\n- App Store/Google Play → 「App Storeで無料公開中 →」「今すぐインストール →」「iPhoneで無料で使える →」など\n- GitHub → 「コードを見る →」「OSSとして公開中 →」「GitHubで公開中 →」など\n- Webアプリ → 「詳しくはこちら →」「今すぐ試す →」「無料で使えます →」など\n5件それぞれ異なるリード文を使うこと。同じフレーズを繰り返さない。` : ""}
${hashtags ? `\n【ハッシュタグ（必須）】\n以下のハッシュタグを必ず含め、さらにプロダクトに関連するハッシュタグを追加して合計3つ以上にする。指定タグの省略・変形は一切不可：${hashtags}` : ""}

【要件】
- 必ず5件のツイートを生成する
- 各ツイートは X の weighted length で 280 ウェイト以内に収める
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
今日の日付：${todayStr}（この日より後の日付を指定すること）
各ツイートの本文の直後の行に以下の形式で推奨投稿日時を出力する：
SCHEDULE: YYYY-MM-DD HH:MM / 理由（15文字以内）
- ツイートの目的・ターゲット層・内容に合わせた日時を選ぶ
- 5件はすべて異なる日時にする

【出力形式】
必ず以下の形式で出力する。説明・見出し・空行は不要。

1. [ツイート本文]
SCHEDULE: YYYY-MM-DD HH:MM / 理由
2. [ツイート本文]
SCHEDULE: YYYY-MM-DD HH:MM / 理由
3. [ツイート本文]
SCHEDULE: YYYY-MM-DD HH:MM / 理由
4. [ツイート本文]
SCHEDULE: YYYY-MM-DD HH:MM / 理由
5. [ツイート本文]
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
  return `以下のツイートは X の weighted length が ${currentWeight} で、上限 280 ウェイトを超過しています。文意・トーン・ハッシュタグを保ったまま、260 ウェイト以内に収まるように短縮してください。

【プロジェクト説明（参考）】
${projectText}
${toneMemo ? `\n【口調・トーン指示】\n${toneMemo}` : ""}
${url ? `\n【URL（省略・変形不可）】\n${url}\nURLは単独行に置き、直前の行のリード文も必ずそのまま保持する。` : ""}
${hashtags ? `\n【ハッシュタグ（省略・変形不可）】\n指定タグを含む全ハッシュタグを保持する（合計3〜5つ）：${hashtags}` : ""}

【元のツイート】
${originalText}

【weighted length 計算ルール】
半角英数記号=1、日本語・絵文字など全角=2、URL は実長を問わず 23 ウェイト固定。

【出力形式】
短縮後のツイート本文のみを返す。番号・引用符・説明・前置きは一切含めない。`;
}

async function regenerateOne(
  originalText: string,
  currentWeight: number,
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string,
  model: GenerativeModel
): Promise<string> {
  const result = await model.generateContent(
    buildShortenPrompt(originalText, currentWeight, projectText, toneMemo, url, hashtags)
  );
  return result.response.text().trim().replace(/^["「『]|["」』]$/g, "").trim();
}

export async function generateTweets(
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string,
  apiKey: string
): Promise<Tweet[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const today = new Date();
  const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  const result = await model.generateContent(buildPrompt(projectText, toneMemo, url, hashtags, todayStr));
  const text = result.response.text();

  const SCHEDULE_RE = /SCHEDULE:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*\/\s*(.+)/;

  const blocks = text
    .split(/\n(?=\d+\.\s)/)
    .filter((block) => /^\d+\.\s/.test(block.trim()));

  if (blocks.length < 5) {
    throw new Error("5件のツイートを生成できませんでした。もう一度お試しください。");
  }

  const drafts: string[] = [];
  const schedules: { label: string; reason: string }[] = [];

  for (const block of blocks.slice(0, 5)) {
    const raw = block.replace(/^\d+\.\s+/, "").trim();
    const m = raw.match(SCHEDULE_RE);
    drafts.push(m ? raw.slice(0, raw.indexOf(m[0])).trim() : raw);
    schedules.push(
      m
        ? { label: formatScheduleLabel(m[1], m[2]), reason: m[3].trim() }
        : { label: "—", reason: "" }
    );
  }

  for (let i = 0; i < drafts.length; i++) {
    let current = reformatTweet(drafts[i]);
    let weight = countWeighted(current);
    let attempts = 0;
    while (weight > TWEET_LIMIT && attempts < MAX_REGENERATE_ATTEMPTS) {
      attempts++;
      try {
        const shortened = reformatTweet(
          await regenerateOne(current, weight, projectText, toneMemo, url, hashtags, model)
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
