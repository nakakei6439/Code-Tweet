import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionTier } from "@/lib/subscription";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let confirmation: unknown;
  try {
    const body = await request.json();
    confirmation = body?.confirmation;
  } catch {
    return Response.json({ error: "確認文字列を入力してください。" }, { status: 400 });
  }

  if (confirmation !== "DELETE") {
    return Response.json({ error: "確認文字列が一致しません。" }, { status: 400 });
  }

  const tier = await getSubscriptionTier(user.id);
  if (tier === "paid") {
    return Response.json(
      {
        error:
          "Pro プラン契約中はアカウントを削除できません。先に Stripe カスタマーポータルから解約してください（解約直後は反映まで少し時間がかかる場合があります）。",
        needsCancel: true,
      },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  const { error: historyDeleteError } = await admin
    .from("tweet_generations")
    .delete()
    .eq("user_id", user.id);
  if (historyDeleteError) {
    logError("account/delete", "tweet_generations cleanup error", historyDeleteError, { userId: user.id });
  }

  const { error: tokenDeleteError } = await admin
    .from("user_tokens")
    .delete()
    .eq("user_id", user.id);
  if (tokenDeleteError) {
    logError("account/delete", "user_tokens cleanup error", tokenDeleteError, { userId: user.id });
  }

  const { error: installDeleteError } = await admin
    .from("github_app_installations")
    .delete()
    .eq("user_id", user.id);
  if (installDeleteError) {
    logError("account/delete", "github_app_installations cleanup error", installDeleteError, { userId: user.id });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    logError("account/delete", "failed to delete user", error, { userId: user.id });
    return Response.json(
      { error: "アカウントの削除に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }

  const { error: subDeleteError } = await admin
    .from("subscriptions")
    .delete()
    .eq("user_id", user.id);
  if (subDeleteError) {
    logError("account/delete", "subscriptions cleanup error", subDeleteError, { userId: user.id });
  }

  const { error: usageDeleteError } = await admin
    .from("usage_logs")
    .delete()
    .eq("user_id", user.id);
  if (usageDeleteError) {
    logError("account/delete", "usage_logs cleanup error", usageDeleteError, { userId: user.id });
  }

  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
