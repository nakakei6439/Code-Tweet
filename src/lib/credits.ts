import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

// 購入クレジットの残高を返す。行がない（未購入）場合は 0。
// エラー時は 0 を返す（残高が使えないだけで無料枠は生きる fail-open）。
export async function getCreditBalance(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logError("credits", "balance fetch error", error, { userId });
    return 0;
  }

  return data?.balance ?? 0;
}

// クレジットを付与する。stripe_event_id 単位で冪等（処理済みなら false）。
// 台帳 insert と残高加算は DB 関数内の 1 トランザクションで行われる。
export async function grantCredits(
  eventId: string,
  userId: string,
  credits: number,
  sessionId: string | null,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_credits", {
    p_event_id: eventId,
    p_user_id: userId,
    p_credits: credits,
    p_session_id: sessionId,
  });

  if (error) {
    logError("credits", "grant_credits rpc error", error, { eventId, userId, credits });
    throw error;
  }

  return data === true;
}

// クレジットを 1 消費する。残高不足なら false（減算は DB 側で atomic）。
export async function consumeCredit(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_credit", { p_user_id: userId });

  if (error) {
    logError("credits", "consume_credit rpc error", error, { userId });
    return false;
  }

  return data === true;
}
