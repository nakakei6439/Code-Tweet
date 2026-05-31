import { describe, expect, it } from "vitest";
import {
  buildNoteGenerationInsert,
  buildTweetGenerationInsert,
  removeTweetFromGenerationTweets,
} from "@/lib/generationHistory";
import type { NoteDraft } from "@/types/note";
import type { Tweet } from "@/types/tweet";

const tweets: Tweet[] = [
  {
    id: 1,
    text: "READMEからX投稿を作れます。",
    weightedLength: 18,
    isOverLimit: false,
    recommendedTime: { label: "5月15日（金）09:00", reason: "朝向け" },
  },
  {
    id: 2,
    text: "履歴から1件ずつ削除できます。",
    weightedLength: 18,
    isOverLimit: false,
    recommendedTime: { label: "5月15日（金）12:00", reason: "昼向け" },
  },
];

const note: NoteDraft = {
  title: "Code Tweetの紹介",
  markdown: "## できること\n\nREADMEから紹介記事を作れます。",
  charCount: 25,
};

describe("buildTweetGenerationInsert", () => {
  it("stores only generated tweets and short optional metadata", () => {
    const payload = buildTweetGenerationInsert(
      "user-1",
      tweets,
      " https://github.com/example/repo ",
      " #個人開発 ",
    );

    expect(payload).toEqual({
      user_id: "user-1",
      generation_type: "tweet",
      tweets,
      note: null,
      source_url: "https://github.com/example/repo",
      hashtags: "#個人開発",
    });
    expect(payload).not.toHaveProperty("projectText");
    expect(payload).not.toHaveProperty("toneMemo");
  });

  it("stores blank optional metadata as null", () => {
    expect(buildTweetGenerationInsert("user-1", tweets, " ", "").source_url).toBeNull();
    expect(buildTweetGenerationInsert("user-1", tweets, "", " ").hashtags).toBeNull();
  });
});

describe("buildNoteGenerationInsert", () => {
  it("stores only generated note draft and short optional metadata", () => {
    const payload = buildNoteGenerationInsert(
      "user-1",
      note,
      " https://github.com/example/repo ",
      " #note ",
    );

    expect(payload).toEqual({
      user_id: "user-1",
      generation_type: "note",
      tweets: [],
      note,
      source_url: "https://github.com/example/repo",
      hashtags: "#note",
    });
    expect(payload).not.toHaveProperty("projectText");
    expect(payload).not.toHaveProperty("toneMemo");
    expect(payload).not.toHaveProperty("lengthPreset");
  });

  it("stores blank optional metadata as null", () => {
    expect(buildNoteGenerationInsert("user-1", note, " ", "").source_url).toBeNull();
    expect(buildNoteGenerationInsert("user-1", note, "", " ").hashtags).toBeNull();
  });
});

describe("removeTweetFromGenerationTweets", () => {
  it("removes only the matching tweet from a generation", () => {
    const result = removeTweetFromGenerationTweets(tweets, 1);

    expect(result.removed).toBe(true);
    expect(result.remainingTweets).toEqual([tweets[1]]);
  });

  it("leaves an empty list when the last tweet is removed", () => {
    const result = removeTweetFromGenerationTweets([tweets[0]], 1);

    expect(result.removed).toBe(true);
    expect(result.remainingTweets).toEqual([]);
  });

  it("does not remove anything when the tweet is not found", () => {
    const result = removeTweetFromGenerationTweets(tweets, 999);

    expect(result.removed).toBe(false);
    expect(result.remainingTweets).toEqual(tweets);
  });
});
