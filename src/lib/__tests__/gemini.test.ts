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
