import { createAdminClient } from "@/lib/supabase/admin";
import type { Tweet } from "@/types/tweet";

export const TWEET_GENERATION_HISTORY_LIMIT = 50;

export interface TweetGenerationRecord {
  id: string;
  tweets: Tweet[];
  sourceUrl: string | null;
  hashtags: string | null;
  createdAt: string;
}

export type TweetGenerationListResult =
  | { ok: true; records: TweetGenerationRecord[] }
  | { ok: false; records: []; reason: "unavailable" };

export interface TweetGenerationInsert {
  user_id: string;
  tweets: Tweet[];
  source_url: string | null;
  hashtags: string | null;
}

export function buildTweetGenerationInsert(
  userId: string,
  tweets: Tweet[],
  sourceUrl: string,
  hashtags: string,
): TweetGenerationInsert {
  return {
    user_id: userId,
    tweets,
    source_url: sourceUrl.trim() || null,
    hashtags: hashtags.trim() || null,
  };
}

export async function recordTweetGeneration(
  userId: string,
  tweets: Tweet[],
  sourceUrl: string,
  hashtags: string,
): Promise<void> {
  const admin = createAdminClient();
  const payload = buildTweetGenerationInsert(userId, tweets, sourceUrl, hashtags);
  const { error } = await admin.from("tweet_generations").insert(payload);
  if (error) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[generationHistory] tweet_generations insert failed");
    }
  }
}

function isRecommendedTime(value: unknown): value is Tweet["recommendedTime"] {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.label === "string" && typeof candidate.reason === "string";
}

function isTweet(value: unknown): value is Tweet {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.text === "string" &&
    typeof candidate.weightedLength === "number" &&
    typeof candidate.isOverLimit === "boolean" &&
    isRecommendedTime(candidate.recommendedTime)
  );
}

function parseTweets(value: unknown): Tweet[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isTweet);
}

export function removeTweetFromGenerationTweets(
  tweets: Tweet[],
  tweetId: number,
): { removed: boolean; remainingTweets: Tweet[] } {
  const remainingTweets = tweets.filter((tweet) => tweet.id !== tweetId);
  return {
    removed: remainingTweets.length !== tweets.length,
    remainingTweets,
  };
}

export async function listTweetGenerations(userId: string): Promise<TweetGenerationListResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tweet_generations")
    .select("id,tweets,source_url,hashtags,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(TWEET_GENERATION_HISTORY_LIMIT);

  if (error) {
    return { ok: false, records: [], reason: "unavailable" };
  }

  return {
    ok: true,
    records: (data ?? []).map((row) => ({
      id: String(row.id),
      tweets: parseTweets(row.tweets),
      sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
      hashtags: typeof row.hashtags === "string" ? row.hashtags : null,
      createdAt: String(row.created_at),
    })),
  };
}

export type DeleteTweetGenerationItemResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "unavailable" };

export async function deleteTweetGenerationItem(
  userId: string,
  generationId: string,
  tweetId: number,
): Promise<DeleteTweetGenerationItemResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tweet_generations")
    .select("id,tweets")
    .eq("id", generationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unavailable" };
  }
  if (!data) {
    return { ok: false, reason: "not_found" };
  }

  const tweets = parseTweets(data.tweets);
  const { removed, remainingTweets } = removeTweetFromGenerationTweets(tweets, tweetId);
  if (!removed) {
    return { ok: false, reason: "not_found" };
  }

  if (remainingTweets.length === 0) {
    const { error: deleteError } = await admin
      .from("tweet_generations")
      .delete()
      .eq("id", generationId)
      .eq("user_id", userId);

    return deleteError ? { ok: false, reason: "unavailable" } : { ok: true };
  }

  const { error: updateError } = await admin
    .from("tweet_generations")
    .update({ tweets: remainingTweets })
    .eq("id", generationId)
    .eq("user_id", userId);

  return updateError ? { ok: false, reason: "unavailable" } : { ok: true };
}
