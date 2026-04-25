import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Tweet } from "@/types/tweet";

function buildPrompt(projectText: string, toneMemo: string): string {
  return `あなたは個人開発者向けのTwitter/Xマーケティングの専門家です。
以下のプロジェクト説明を読み、そのプロダクトを宣伝するためのツイートを7件生成してください。

【プロジェクト説明】
${projectText}
${toneMemo ? `\n【口調・トーン指示】\n${toneMemo}` : ""}

【要件】
- 必ず7件のツイートを生成する
- 各ツイートは必ず280文字以内に収める
- ハッシュタグは本文と改行して末尾に記載する（例：「本文\n#tag1 #tag2」）
- 以下のストーリーアークに沿って順番に生成する：
  1. プロジェクト紹介（何ができるアプリかを端的に伝える）
  2. 使い方・始め方（すぐ使えることを強調）
  3. 具体的なユースケース（誰にどんな場面で役立つか）
  4. 技術的な優位性・こだわり（差別化ポイント）
  5. ユーザーの声・共感（開発者あるあるの課題感）
  6. 比較・優位性（既存の方法との違い）
  7. CTA・エンゲージメント（試してほしい呼びかけ）

【出力形式】
必ず以下の形式で出力する。番号とツイート本文のみ。説明・見出し・空行は不要。

1. [ツイート本文]
2. [ツイート本文]
3. [ツイート本文]
4. [ツイート本文]
5. [ツイート本文]
6. [ツイート本文]
7. [ツイート本文]`;
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

  if (lines.length < 7) {
    throw new Error("7件のツイートを生成できませんでした。もう一度お試しください。");
  }

  return lines.slice(0, 7).map((text, i) => ({ id: i + 1, text }));
}
