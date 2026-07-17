"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteTweetGenerationItem } from "@/lib/generationHistory";
import { hasProAccess } from "@/lib/entitlements";

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
  if (!(await hasProAccess(user.id, user.email))) {
    return { ok: false, error: "生成履歴の削除はクレジット購入者向けの機能です。" };
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
