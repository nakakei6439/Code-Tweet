import { NextResponse } from "next/server";
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
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account/delete] failed to delete user:", error);
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
    console.error("[account/delete] subscriptions cleanup error:", subDeleteError);
  }

  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
