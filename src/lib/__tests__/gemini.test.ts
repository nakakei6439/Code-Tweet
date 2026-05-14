import { describe, expect, it } from "vitest";
import { parseGeneratedTweets, reformatTweet } from "@/lib/gemini";

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
});
