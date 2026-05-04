import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import { getSubscriptionTier } from "@/lib/subscription";

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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let hasPat = false;
  let isPaid = false;
  if (user) {
    const tier = await getSubscriptionTier(user.id);
    isPaid = tier === "paid";

    if (isPaid) {
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
          headers["Authorization"] = `Bearer ${pat}`;
          hasPat = true;
        } catch {
          return Response.json(
            { error: "PAT の読み込みに失敗しました。設定ページから再登録してください。" },
            { status: 500 },
          );
        }
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
        { error: "非公開リポジトリにはログインと Pro プラン（月 980 円）の登録が必要です。" },
        { status: 403 },
      );
    }
    if (!isPaid) {
      return Response.json(
        { error: "非公開リポジトリは Pro プラン（月 980 円）でご利用いただけます。" },
        { status: 403 },
      );
    }
    if (!hasPat) {
      return Response.json(
        { error: "非公開リポジトリには設定ページで PAT を登録してください。" },
        { status: 403 },
      );
    }
    return Response.json(
      { error: "このリポジトリへのアクセス権がありません。PAT のスコープに repo が含まれているか確認してください。" },
      { status: 403 },
    );
  }
  if (res.status === 404) {
    // GitHub はプライベートリポジトリへのアクセス権がない場合も 404 を返す
    if (hasPat) {
      return Response.json(
        { error: "リポジトリが見つかりません。URL を確認してください。" },
        { status: 404 },
      );
    }
    if (isPaid) {
      return Response.json(
        { error: "リポジトリが見つかりません。非公開リポジトリの場合は設定ページで PAT を登録してください。" },
        { status: 404 },
      );
    }
    if (user) {
      return Response.json(
        { error: "リポジトリが見つかりません。非公開リポジトリの場合は Pro プラン（月 980 円）が必要です。" },
        { status: 404 },
      );
    }
    return Response.json(
      { error: "リポジトリが見つかりません。非公開リポジトリの場合はログインと Pro プラン（月 980 円）が必要です。" },
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
