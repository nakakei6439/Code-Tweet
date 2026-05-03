import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";

export async function POST(request: Request): Promise<Response> {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストが不正です。" }, { status: 400 });
  }

  const match = (body.url ?? "").match(/^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) {
    return Response.json({ error: "GitHub のリポジトリ URL を入力してください。" }, { status: 400 });
  }

  const [, owner, repo] = match;
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };

  // ログイン済みの場合は PAT を Supabase から取得
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let hasPat = false;
  if (user) {
    const admin = createAdminClient();
    const { data: tokenRow } = await admin
      .from("user_tokens")
      .select("github_pat_encrypted, github_pat_iv, github_pat_tag")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenRow) {
      try {
        const pat = decrypt(
          tokenRow.github_pat_encrypted,
          tokenRow.github_pat_iv,
          tokenRow.github_pat_tag,
        );
        headers["Authorization"] = `token ${pat}`;
        hasPat = true;
      } catch {
        // 復号失敗は無視して公開アクセスにフォールバック
      }
    }
  }

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
  } catch {
    return Response.json({ error: "README の取得に失敗しました。" }, { status: 502 });
  }

  if (res.status === 401) {
    return Response.json(
      { error: "Personal Access Token が無効です。設定ページから再登録してください。" },
      { status: 401 },
    );
  }
  if (res.status === 403) {
    if (!user) {
      return Response.json(
        { error: "非公開リポジトリにはログインと PAT の登録が必要です。" },
        { status: 403 },
      );
    }
    if (!hasPat) {
      return Response.json(
        { error: "非公開リポジトリには設定ページで Personal Access Token を登録してください。" },
        { status: 403 },
      );
    }
    return Response.json({ error: "このリポジトリへのアクセス権がありません。" }, { status: 403 });
  }
  if (res.status === 404) {
    // GitHub は認証なし/権限なしのプライベートリポジトリも 404 で返す
    return Response.json(
      {
        error:
          "リポジトリが見つかりません。非公開リポジトリの場合はログインと PAT の登録が必要です。",
      },
      { status: 404 },
    );
  }
  if (!res.ok) {
    return Response.json({ error: "README の取得に失敗しました。" }, { status: 502 });
  }

  const data = await res.json();
  if (!data.content) {
    return Response.json({ error: "README が見つかりません。" }, { status: 404 });
  }

  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return Response.json({ content });
}
