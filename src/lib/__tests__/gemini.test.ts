import { describe, expect, it } from "vitest";
import type { GoogleGenAI } from "@google/genai";
import {
  buildPrompt,
  countWeighted,
  dropTagsToFit,
  forceWithinLimit,
  generateContentWithRetry,
  startRequestBudget,
  formatScheduleLabel,
  parseGeneratedTweets,
  reformatTweet,
} from "@/lib/gemini";

describe("reformatTweet", () => {
  it("moves an inline URL to a trailing URL block and keeps required hashtags", () => {
    const result = reformatTweet(
      "READMEから投稿案を作れます。詳しくはこちら → https://example.com/product\n#個人開発",
      "#CodeTweet #個人開発",
      "https://example.com/product",
    );

    expect(result).toBe(
      [
        "READMEから投稿案を作れます。",
        "詳しくはこちら →\nhttps://example.com/product",
        "#個人開発 #CodeTweet",
      ].join("\n\n"),
    );
  });

  it("adds a default URL block when a required URL is missing", () => {
    const result = reformatTweet("ソースコードを公開しました。", "", "https://github.com/example/repo");

    expect(result).toBe("ソースコードを公開しました。\n\nGitHubで公開中 →\nhttps://github.com/example/repo");
  });

  it("caps hashtags at 3 while keeping user-specified tags", () => {
    const result = reformatTweet(
      "新機能をリリースしました。\n#AIツール #Web開発 #Next_js #個人開発あるある",
      "#CodeTweet #個人開発",
      "",
    );

    expect(result).toBe("新機能をリリースしました。\n\n#AIツール #CodeTweet #個人開発");
  });
});

describe("dropTagsToFit", () => {
  const body = "あ".repeat(132); // 264 ウェイト。タグを付けると 280 を超える

  it("上限を超えたら関連タグを末尾から削って収める", () => {
    const over = reformatTweet(`${body}\n#タグA #タグB #タグC`, "", "");
    expect(countWeighted(over)).toBeGreaterThan(280);

    const fitted = dropTagsToFit(over, "");
    expect(countWeighted(fitted)).toBeLessThanOrEqual(280);
    expect(fitted).toContain(body);
    expect(fitted).toContain("#タグA");
    expect(fitted).not.toContain("#タグC");
  });

  it("ユーザー指定タグは削らずに残す", () => {
    const over = reformatTweet(`${body}\n#関連タグ #CodeTweet`, "#CodeTweet", "");
    const fitted = dropTagsToFit(over, "#CodeTweet");

    expect(fitted).toContain("#CodeTweet");
    expect(fitted).not.toContain("#関連タグ");
  });

  it("上限内のポストはそのまま返す", () => {
    const text = "短い本文です。\n\n#タグA #タグB";
    expect(dropTagsToFit(text, "")).toBe(text);
  });
});

describe("parseGeneratedTweets", () => {
  it("extracts five drafts and schedule labels from Gemini output", () => {
    const raw = [
      "1. 最初の紹介文",
      "SCHEDULE: 2026-05-15 09:00 / 朝向け",
      "2. 使い方の紹介",
      "SCHEDULE: 2026-05-16 10:30 / 週末前",
      "3. ユースケース",
      "SCHEDULE: 2026-05-17 12:00 / 昼休み",
      "4. 共感ポスト",
      "SCHEDULE: 2026-05-18 19:00 / 夜向け",
      "5. 試してほしいCTA",
      "SCHEDULE: 2026-05-19 21:00 / 夜活",
    ].join("\n");

    const result = parseGeneratedTweets(raw);

    expect(result.drafts).toEqual([
      "最初の紹介文",
      "使い方の紹介",
      "ユースケース",
      "共感ポスト",
      "試してほしいCTA",
    ]);
    expect(result.schedules[0]).toEqual({ label: "5月15日（金）09:00", reason: "朝向け" });
    expect(result.schedules[4]).toEqual({ label: "5月19日（火）21:00", reason: "夜活" });
  });

  it("throws when fewer than five schedules are present", () => {
    expect(() => parseGeneratedTweets("1. 本文\nSCHEDULE: 2026-05-15 09:00 / 朝向け")).toThrow(
      "5件のポストを生成できませんでした。",
    );
  });

  it("recovers a hashtag line placed after the SCHEDULE line", () => {
    const raw = [
      "1. 最初の紹介文",
      "SCHEDULE: 2026-05-15 09:00 / 朝向け",
      "#個人開発 #エンジニア",
      "2. 使い方の紹介",
      "SCHEDULE: 2026-05-16 10:30 / 週末前",
      "#Webアプリ #個人開発",
      "3. ユースケース",
      "SCHEDULE: 2026-05-17 12:00 / 昼休み",
      "#プログラミング",
      "4. 共感ポスト",
      "SCHEDULE: 2026-05-18 19:00 / 夜向け",
      "#開発者あるある #個人開発",
      "5. 試してほしいCTA",
      "SCHEDULE: 2026-05-19 21:00 / 夜活",
      "#CodeTweet #個人開発",
    ].join("\n");

    const result = parseGeneratedTweets(raw);

    expect(result.drafts).toEqual([
      "最初の紹介文\n#個人開発 #エンジニア",
      "使い方の紹介\n#Webアプリ #個人開発",
      "ユースケース\n#プログラミング",
      "共感ポスト\n#開発者あるある #個人開発",
      "試してほしいCTA\n#CodeTweet #個人開発",
    ]);
  });

  it("keeps a hashtag line that appears before the SCHEDULE line", () => {
    const raw = [
      "1. 最初の紹介文",
      "#個人開発 #エンジニア",
      "SCHEDULE: 2026-05-15 09:00 / 朝向け",
      "2. 使い方の紹介",
      "#Webアプリ",
      "SCHEDULE: 2026-05-16 10:30 / 週末前",
      "3. ユースケース",
      "#プログラミング",
      "SCHEDULE: 2026-05-17 12:00 / 昼休み",
      "4. 共感ポスト",
      "#開発者あるある",
      "SCHEDULE: 2026-05-18 19:00 / 夜向け",
      "5. 試してほしいCTA",
      "#CodeTweet",
      "SCHEDULE: 2026-05-19 21:00 / 夜活",
    ].join("\n");

    const result = parseGeneratedTweets(raw);

    expect(result.drafts[0]).toBe("最初の紹介文\n#個人開発 #エンジニア");
    expect(result.drafts[4]).toBe("試してほしいCTA\n#CodeTweet");
  });

  it("does not pull stray body or URL written after the SCHEDULE line into the post", () => {
    const raw = [
      "1. 最初の紹介文",
      "SCHEDULE: 2026-05-15 09:00 / 朝向け",
      "詳しくはこちら → https://example.com/extra",
      "#個人開発",
      "2. 使い方の紹介",
      "SCHEDULE: 2026-05-16 10:30 / 週末前",
      "3. ユースケース",
      "SCHEDULE: 2026-05-17 12:00 / 昼休み",
      "4. 共感ポスト",
      "SCHEDULE: 2026-05-18 19:00 / 夜向け",
      "5. 試してほしいCTA",
      "SCHEDULE: 2026-05-19 21:00 / 夜活",
    ].join("\n");

    const result = parseGeneratedTweets(raw);

    // 余計な本文・URL は混入させず、ハッシュタグ行だけ回収する
    expect(result.drafts[0]).toBe("最初の紹介文\n#個人開発");
  });
});

// ---------- 多言語対応（Phase 3）----------
// reformatTweet は URL_LEAD_RE / getDefaultUrlLead / POST_MARKER_RE を通じて
// 日本語に依存していた。英語・韓国語・簡体字で本文が欠落しないことを固定する。

describe("reformatTweet — 多言語", () => {
  it("英語の本文で URL を末尾ブロックへ正規化する", () => {
    const text = "Just shipped my side project.\nCheck it out → https://example.com\nIt drafts posts for you.";
    const out = reformatTweet(text, "", "https://example.com", "en");

    expect(out).toContain("Just shipped my side project.");
    expect(out).toContain("It drafts posts for you.");
    expect(out).toContain("https://example.com");
    // URL は末尾ブロックへ移る
    expect(out.indexOf("https://example.com")).toBeGreaterThan(out.indexOf("It drafts posts for you."));
  });

  it("英語で必須 URL が無いとき英語のリード文を付ける", () => {
    const out = reformatTweet("A tiny tool for indie devs.", "", "https://apps.apple.com/app/id1", "en");

    expect(out).toContain("https://apps.apple.com/app/id1");
    // 日本語のリード文が混ざらない
    expect(out).not.toMatch(/[ぁ-んァ-ヶ一-龠]/);
  });

  it("韓国語の本文を欠落させない", () => {
    const text = "개인 개발로 만든 도구를 공개했습니다.\n지금 사용해 보기 → https://example.com";
    const out = reformatTweet(text, "", "https://example.com", "ko");

    expect(out).toContain("개인 개발로 만든 도구를 공개했습니다.");
    expect(out).toContain("https://example.com");
  });

  it("簡体字の本文とハッシュタグを保持する", () => {
    const text = "我做了一个小工具。\n#独立开发 #工具";
    const out = reformatTweet(text, "", "", "zh-Hans");

    expect(out).toContain("我做了一个小工具。");
    expect(out).toContain("#独立开发");
  });

  it("日本語は従来どおりのリード文を使う（既定ロケール）", () => {
    const out = reformatTweet("個人開発のツールを公開しました。", "", "https://apps.apple.com/app/id1");

    expect(out).toContain("App Storeで無料公開中");
  });
});

describe("formatScheduleLabel — 多言語", () => {
  it("日本語は従来の表記を保つ", () => {
    expect(formatScheduleLabel("2026-05-13", "20:30", "ja")).toBe("5月13日（水）20:30");
  });

  it("英語はロケールに沿った曜日表記になる", () => {
    const label = formatScheduleLabel("2026-05-13", "20:30", "en");

    expect(label).toContain("20:30");
    expect(label).not.toMatch(/[ぁ-んァ-ヶ一-龠]/);
  });

  it("韓国語でも日本語の曜日配列を使わない", () => {
    const label = formatScheduleLabel("2026-05-13", "20:30", "ko");

    expect(label).toContain("20:30");
    expect(label).not.toMatch(/[ぁ-んァ-ヶ]/);
  });
});

describe("buildPrompt — 多言語", () => {
  const base = ["A tiny CLI tool.", "", "", "", "2026年5月13日"] as const;

  it("既定は日本語で書くよう指示する", () => {
    const prompt = buildPrompt(...base);

    expect(prompt).toContain("**Japanese**");
    expect(prompt).toContain("1 文字 2 ウェイト");
  });

  it("英語では英語で書くよう指示し、ラテン文字の字数目安に変える", () => {
    const prompt = buildPrompt(...base, "en");

    expect(prompt).toContain("**English**");
    // ラテン文字は 1 文字 1 ウェイトなので目安字数が倍になる
    expect(prompt).toContain("1 文字 1 ウェイト");
  });

  it("韓国語では CJK の字数目安を使う", () => {
    const prompt = buildPrompt(...base, "ko");

    expect(prompt).toContain("**Korean**");
    expect(prompt).toContain("1 文字 2 ウェイト");
  });

  it("URL のリード例が生成言語のものになる", () => {
    const prompt = buildPrompt("A tool.", "", "https://apps.apple.com/app/id1", "", "2026年5月13日", "de");

    expect(prompt).toContain("Kostenlos im App Store");
    expect(prompt).not.toContain("App Storeで無料公開中");
  });
});

describe("forceWithinLimit — 280 ウェイトの保証", () => {
  it("上限内のポストはそのまま返す", () => {
    const text = "短い本文\n\nGitHubで公開中 →\nhttps://example.com\n\n#tag";
    expect(forceWithinLimit(text)).toBe(text);
  });

  it("超過したポストは本文だけを削って 280 以内にし、URL とハッシュタグを残す", () => {
    const long = "가".repeat(200);
    const text = `${long}\n\nGitHub에서 보기 →\nhttps://example.com/x\n\n#tag1 #tag2`;
    expect(countWeighted(text)).toBeGreaterThan(280);
    const result = forceWithinLimit(text);
    expect(countWeighted(result)).toBeLessThanOrEqual(280);
    expect(result).toContain("https://example.com/x");
    expect(result).toContain("#tag1 #tag2");
  });
});

describe("buildPrompt — 書き出しの切り口", () => {
  it("数字の切り口は説明にある数字に限定する", () => {
    const prompt = buildPrompt("p", "", "", "", "2026年1月1日", "ja", () => 0);
    expect(prompt).not.toContain("具体的な数字から始める\n");
    expect(prompt).toContain("数字を創作しない");
  });
});

describe("generateContentWithRetry — 時間上限", () => {
  it("応答が返らない呼び出しは打ち切り、予算内で例外にする（ハングしない）", async () => {
    let calls = 0;
    const ai = {
      models: {
        generateContent: (params: { config?: { abortSignal?: AbortSignal } }) =>
          new Promise((_, reject) => {
            calls++;
            params.config?.abortSignal?.addEventListener("abort", () => reject(params.config?.abortSignal?.reason));
          }),
      },
    } as unknown as GoogleGenAI;
    startRequestBudget(ai, 6_000);
    const started = Date.now();
    await expect(generateContentWithRetry(ai, { model: "m", contents: "x" }, 2)).rejects.toThrow();
    expect(calls).toBeGreaterThanOrEqual(1);
    expect(Date.now() - started).toBeLessThan(8_000);
  }, 15_000);
});
