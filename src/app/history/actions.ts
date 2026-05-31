"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteNoteGenerationItem, deleteTweetGenerationItem } from "@/lib/generationHistory";
import { getSubscriptionTier } from "@/lib/subscription";

export type DeleteHistoryTweetResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteHistoryTweet(
  generationId: string,
  tweetId: number,
): Promise<DeleteHistoryTweetResult> {
  const normalizedGenerationId = generationId.trim();
  if (!normalizedGenerationId || !Number.isInteger(tweetId)) {
    return { ok: false, error: "削除対象が不正です。" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です。" };
  }
  const tier = await getSubscriptionTier(user.id);
  if (tier !== "paid") {
    return { ok: false, error: "生成履歴の削除は Pro プランの機能です。" };
  }

  const result = await deleteTweetGenerationItem(user.id, normalizedGenerationId, tweetId);
  if (!result.ok) {
    return {
      ok: false,
      error: result.reason === "not_found"
        ? "削除対象が見つかりませんでした。"
        : "投稿案の削除に失敗しました。時間をおいて再度お試しください。",
    };
  }

  revalidatePath("/history");
  return { ok: true };
}

export async function deleteHistoryNote(generationId: string): Promise<DeleteHistoryTweetResult> {
  const normalizedGenerationId = generationId.trim();
  if (!normalizedGenerationId) {
    return { ok: false, error: "削除対象が不正です。" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です。" };
  }
  const tier = await getSubscriptionTier(user.id);
  if (tier !== "paid") {
    return { ok: false, error: "生成履歴の削除は Pro プランの機能です。" };
  }

  const result = await deleteNoteGenerationItem(user.id, normalizedGenerationId);
  if (!result.ok) {
    return {
      ok: false,
      error: result.reason === "not_found"
        ? "削除対象が見つかりませんでした。"
        : "note Draftの削除に失敗しました。時間をおいて再度お試しください。",
    };
  }

  revalidatePath("/history");
  return { ok: true };
}
