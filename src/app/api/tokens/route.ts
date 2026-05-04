import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encryption";
import { getSubscriptionTier } from "@/lib/subscription";

export async function POST(request: Request): Promise<Response> {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストが不正です。" }, { status: 400 });
  }

  const token = body.token?.trim() ?? "";
  if (!token) {
    return Response.json({ error: "トークンを入力してください。" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const tier = await getSubscriptionTier(user.id);
  if (tier !== "paid") {
    return Response.json(
      { error: "PAT の登録は Pro プラン（月 980 円）でご利用いただけます。" },
      { status: 403 },
    );
  }

  // GitHub API で PAT の有効性を確認
  let ghRes: Response;
  try {
    ghRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
  } catch {
    return Response.json({ error: "GitHub への接続に失敗しました。" }, { status: 502 });
  }

  if (ghRes.status === 401) {
    return Response.json({ error: "PAT が無効です。トークンを確認してください。" }, { status: 400 });
  }
  if (!ghRes.ok) {
    return Response.json({ error: "PAT の検証に失敗しました。" }, { status: 400 });
  }

  // repo スコープの確認（classic PAT のみ X-OAuth-Scopes が返る）
  const scopes = ghRes.headers.get("x-oauth-scopes") ?? "";
  const hasRepoScope = scopes.split(",").map((s) => s.trim()).some((s) => s === "repo" || s === "public_repo");
  if (scopes && !hasRepoScope) {
    return Response.json(
      { error: `PAT に repo スコープがありません（現在のスコープ: ${scopes || "なし"}）。GitHub でトークンを再作成してください。` },
      { status: 400 },
    );
  }

  const { encrypted, iv, tag } = encrypt(token);

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
