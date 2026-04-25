import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import twitterText from "twitter-text";
import type { Tweet } from "@/types/tweet";

const TWEET_LIMIT = 280;
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

  const urlMatch = rest.match(/(https?:\/\/\S+?)([。、！？\s]*)$/);
  let url = "";
  if (urlMatch) {
    url = urlMatch[1];
    rest = rest.slice(0, urlMatch.index).trim();
  }

  return [rest, url, hashtags].filter(Boolean).join("\n\n");
}

function buildPrompt(projectText: string, toneMemo: string): string {
  return `あなたは個人開発者向けのTwitter/Xマーケティングの専門家です。
以下のプロジェクト説明を読み、そのプロダクトを宣伝するためのツイートを5件生成してください。

【プロジェクト説明】
${projectText}
${toneMemo ? `\n【口調・トーン指示】\n${toneMemo}` : ""}

【要件】
- 必ず5件のツイートを生成する
- 各ツイートは X の weighted length で 280 ウェイト以内に収める
- weighted length の計算ルール：半角英数記号=1、日本語・絵文字など全角文字=2、URL は実長を問わず 23 ウェイト固定
- ハッシュタグ・URL・改行を含めた合計を 280 ウェイト以内とする
- 余裕を持たせるため 260 ウェイトを目安に作成する（日本語のみなら約 130 文字、英語のみなら約 260 文字が目安）
- ハッシュタグは本文と改行して末尾に記載する（例：「本文\n#tag1 #tag2」）
- 以下のストーリーアークに沿って順番に生成する：
  1. プロジェクト紹介（何ができるアプリかを端的に伝える）
  2. 使い方・始め方（すぐ使えることを強調）
  3. 具体的なユースケース（誰にどんな場面で役立つか）
  4. ユーザーの声・共感（開発者あるあるの課題感）
  5. CTA・エンゲージメント（試してほしい呼びかけ）

【出力形式】
必ず以下の形式で出力する。番号とツイート本文のみ。説明・見出し・空行は不要。

1. [ツイート本文]
2. [ツイート本文]
3. [ツイート本文]
4. [ツイート本文]
5. [ツイート本文]`;
}

function buildShortenPrompt(
  originalText: string,
  currentWeight: number,
  projectText: string,
  toneMemo: string
): string {
  return `以下のツイートは X の weighted length が ${currentWeight} で、上限 280 ウェイトを超過しています。文意・トーン・ハッシュタグを保ったまま、260 ウェイト以内に収まるように短縮してください。

【プロジェクト説明（参考）】
${projectText}
${toneMemo ? `\n【口調・トーン指示】\n${toneMemo}` : ""}

【元のツイート】
${originalText}

【weighted length 計算ルール】
半角英数記号=1、日本語・絵文字など全角=2、URL は実長を問わず 23 ウェイト固定。

【出力形式】
短縮後のツイート本文のみを 1 行で返す。番号・引用符・説明・前置きは一切含めない。`;
}

async function regenerateOne(
  originalText: string,
  currentWeight: number,
  projectText: string,
  toneMemo: string,
  model: GenerativeModel
): Promise<string> {
  const result = await model.generateContent(
    buildShortenPrompt(originalText, currentWeight, projectText, toneMemo)
  );
  return result.response.text().trim().replace(/^["「『]|["」』]$/g, "").trim();
}

export async function generateTweets(
  projectText: string,
  toneMemo: string,
  apiKey: string
): Promise<Tweet[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent(buildPrompt(projectText, toneMemo));
  const text = result.response.text();

  const lines = text
    .split(/\n(?=\d+\.\s)/)
    .filter((block) => /^\d+\.\s/.test(block.trim()))
    .map((block) => block.replace(/^\d+\.\s+/, "").trim());

  if (lines.length < 5) {
    throw new Error("5件のツイートを生成できませんでした。もう一度お試しください。");
  }

  const drafts = lines.slice(0, 5);

  for (let i = 0; i < drafts.length; i++) {
    let current = reformatTweet(drafts[i]);
    let weight = countWeighted(current);
    let attempts = 0;
    while (weight > TWEET_LIMIT && attempts < MAX_REGENERATE_ATTEMPTS) {
      attempts++;
      try {
        const shortened = reformatTweet(
          await regenerateOne(current, weight, projectText, toneMemo, model)
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
    };
  });
}
