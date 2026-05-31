import { logWarn } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NoteDraft } from "@/types/note";
import type { Tweet } from "@/types/tweet";

export const TWEET_GENERATION_HISTORY_LIMIT = 50;
export type GenerationHistoryType = "tweet" | "note";

interface BaseGenerationRecord {
  id: string;
  generationType: GenerationHistoryType;
  sourceUrl: string | null;
  hashtags: string | null;
  createdAt: string;
}

export interface TweetGenerationRecord extends BaseGenerationRecord {
  generationType: "tweet";
  tweets: Tweet[];
}

export interface NoteGenerationRecord extends BaseGenerationRecord {
  generationType: "note";
  note: NoteDraft;
}

export type GenerationHistoryRecord = TweetGenerationRecord | NoteGenerationRecord;

export type TweetGenerationListResult =
  | { ok: true; records: GenerationHistoryRecord[] }
  | { ok: false; records: []; reason: "unavailable" };

export interface TweetGenerationInsert {
  user_id: string;
  generation_type: "tweet";
  tweets: Tweet[];
  note: null;
  source_url: string | null;
  hashtags: string | null;
}

export interface NoteGenerationInsert {
  user_id: string;
  generation_type: "note";
  tweets: [];
  note: NoteDraft;
  source_url: string | null;
  hashtags: string | null;
}

type LegacyTweetGenerationInsert = Omit<TweetGenerationInsert, "generation_type" | "note">;

function normalizeOptionalMetadata(value: string): string | null {
  return value.trim() || null;
}

export function buildTweetGenerationInsert(
  userId: string,
  tweets: Tweet[],
  sourceUrl: string,
  hashtags: string,
): TweetGenerationInsert {
  return {
    user_id: userId,
    generation_type: "tweet",
    tweets,
    note: null,
    source_url: normalizeOptionalMetadata(sourceUrl),
    hashtags: normalizeOptionalMetadata(hashtags),
  };
}

export function buildNoteGenerationInsert(
  userId: string,
  note: NoteDraft,
  sourceUrl: string,
  hashtags: string,
): NoteGenerationInsert {
  return {
    user_id: userId,
    generation_type: "note",
    tweets: [],
    note,
    source_url: normalizeOptionalMetadata(sourceUrl),
    hashtags: normalizeOptionalMetadata(hashtags),
  };
}

function buildLegacyTweetGenerationInsert(payload: TweetGenerationInsert): LegacyTweetGenerationInsert {
  return {
    user_id: payload.user_id,
    tweets: payload.tweets,
    source_url: payload.source_url,
    hashtags: payload.hashtags,
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
  let { error } = await admin.from("tweet_generations").insert(payload);
  if (error) {
    const retry = await admin.from("tweet_generations").insert(buildLegacyTweetGenerationInsert(payload));
    error = retry.error;
  }
  if (error) {
    if (process.env.NODE_ENV === "production") {
      logWarn("generationHistory", "tweet_generations insert failed", { userId });
    }
    return;
  }
  await pruneOldTweetGenerations(userId);
}

export async function recordNoteGeneration(
  userId: string,
  note: NoteDraft,
  sourceUrl: string,
  hashtags: string,
): Promise<void> {
  const admin = createAdminClient();
  const payload = buildNoteGenerationInsert(userId, note, sourceUrl, hashtags);
  const { error } = await admin.from("tweet_generations").insert(payload);
  if (error) {
    if (process.env.NODE_ENV === "production") {
      logWarn("generationHistory", "note generation insert failed", { userId });
    }
    return;
  }
  await pruneOldTweetGenerations(userId);
}

async function pruneOldTweetGenerations(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: cutoff, error: cutoffError } = await admin
    .from("tweet_generations")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(TWEET_GENERATION_HISTORY_LIMIT - 1, TWEET_GENERATION_HISTORY_LIMIT - 1)
    .maybeSingle();

  if (cutoffError || !cutoff?.created_at) {
    if (cutoffError && process.env.NODE_ENV === "production") {
      logWarn("generationHistory", "tweet_generations cleanup lookup failed", { userId });
    }
    return;
  }

  const { error: deleteError } = await admin
    .from("tweet_generations")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", cutoff.created_at);

  if (deleteError && process.env.NODE_ENV === "production") {
    logWarn("generationHistory", "tweet_generations cleanup failed", { userId });
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

function isNoteDraft(value: unknown): value is NoteDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.markdown === "string" &&
    typeof candidate.charCount === "number"
  );
}

function parseGenerationRow(row: Record<string, unknown>): GenerationHistoryRecord | null {
  const base = {
    id: String(row.id),
    sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
    hashtags: typeof row.hashtags === "string" ? row.hashtags : null,
    createdAt: String(row.created_at),
  };

  if (row.generation_type === "note") {
    if (!isNoteDraft(row.note)) return null;
    return {
      ...base,
      generationType: "note",
      note: row.note,
    };
  }

  return {
    ...base,
    generationType: "tweet",
    tweets: parseTweets(row.tweets),
  };
}

function parseLegacyTweetGenerationRow(row: Record<string, unknown>): TweetGenerationRecord {
  return {
    id: String(row.id),
    generationType: "tweet",
    tweets: parseTweets(row.tweets),
    sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
    hashtags: typeof row.hashtags === "string" ? row.hashtags : null,
    createdAt: String(row.created_at),
  };
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
    .select("id,generation_type,tweets,note,source_url,hashtags,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(TWEET_GENERATION_HISTORY_LIMIT);

  if (error) {
    const { data: legacyData, error: legacyError } = await admin
      .from("tweet_generations")
      .select("id,tweets,source_url,hashtags,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(TWEET_GENERATION_HISTORY_LIMIT);

    if (legacyError) {
      return { ok: false, records: [], reason: "unavailable" };
    }

    return {
      ok: true,
      records: (legacyData ?? []).map((row) => parseLegacyTweetGenerationRow(row as Record<string, unknown>)),
    };
  }

  return {
    ok: true,
    records: (data ?? [])
      .map((row) => parseGenerationRow(row as Record<string, unknown>))
      .filter((record): record is GenerationHistoryRecord => record !== null),
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

export async function deleteNoteGenerationItem(
  userId: string,
  generationId: string,
): Promise<DeleteTweetGenerationItemResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tweet_generations")
    .select("id")
    .eq("id", generationId)
    .eq("user_id", userId)
    .eq("generation_type", "note")
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unavailable" };
  }
  if (!data) {
    return { ok: false, reason: "not_found" };
  }

  const { error: deleteError } = await admin
    .from("tweet_generations")
    .delete()
    .eq("id", generationId)
    .eq("user_id", userId)
    .eq("generation_type", "note");

  return deleteError ? { ok: false, reason: "unavailable" } : { ok: true };
}
