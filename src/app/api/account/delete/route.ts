import { apiError } from "@/lib/apiErrors";
import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionTier } from "@/lib/subscription";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("login_required", 401);
  }

  let confirmation: unknown;
  try {
    const body = await request.json();
    confirmation = body?.confirmation;
  } catch {
    return apiError("confirm_required", 400);
  }

  if (confirmation !== "DELETE") {
    return apiError("confirm_mismatch", 400);
  }

  const tier = await getSubscriptionTier(user.id);
  if (tier === "paid") {
    return Response.json(
      {
        error:
          "subscription_active",
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

  // auth.users の削除で subscriptions / usage_logs / user_credits / credit_grants など
  // user_id 参照の全テーブルが on delete cascade で連鎖削除される。
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    logError("account/delete", "failed to delete user", error, { userId: user.id });
    return Response.json(
      "delete_failed",
      { status: 500 },
    );
  }

  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
