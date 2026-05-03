import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encryption";

export async function POST(request: Request): Promise<Response> {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストが不正です。" }, { status: 400 });
  }

  if (!body.token || typeof body.token !== "string" || body.token.trim() === "") {
    return Response.json({ error: "トークンを入力してください。" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { encrypted, iv, tag } = encrypt(body.token.trim());

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_tokens")
    .upsert(
      {
        user_id: user.id,
        github_pat_encrypted: encrypted,
        github_pat_iv: iv,
        github_pat_tag: tag,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return Response.json({ error: "保存に失敗しました。" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_tokens")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: "削除に失敗しました。" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
