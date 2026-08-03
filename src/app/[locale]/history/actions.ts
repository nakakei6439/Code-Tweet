"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteTweetGenerationItem } from "@/lib/generationHistory";
import { hasProAccess } from "@/lib/entitlements";

export type DeleteHistoryTweetResult =
  | { ok: true }
  // 文言はクライアント側（historyPage 名前空間）で解決する。
  | { ok: false; code: DeleteHistoryErrorCode };

export type DeleteHistoryErrorCode =
  | "deleteInvalid"
  | "loginRequired"
  | "deletePaidOnly"
  | "deleteNotFound"
  | "deleteFailed";

export async function deleteHistoryTweet(
  generationId: string,
  tweetId: number,
): Promise<DeleteHistoryTweetResult> {
  const normalizedGenerationId = generationId.trim();
  if (!normalizedGenerationId || !Number.isInteger(tweetId)) {
    return { ok: false, code: "deleteInvalid" as const };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "loginRequired" as const };
  }
  if (!(await hasProAccess(user.id, user.email))) {
    return { ok: false, code: "deletePaidOnly" as const };
  }

  const result = await deleteTweetGenerationItem(user.id, normalizedGenerationId, tweetId);
  if (!result.ok) {
    return {
      ok: false,
      code: result.reason === "not_found" ? "deleteNotFound" : "deleteFailed",
    };
  }

  revalidatePath("/history");
  return { ok: true };
}
