import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import { getSubscriptionTier } from "@/lib/subscription";

export interface RepoItem {
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  description: string | null;
  updated_at: string;
  html_url: string;
}

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const tier = await getSubscriptionTier(user.id);
  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("user_tokens")
    .select("github_pat_encrypted, github_pat_iv, github_pat_tag")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tokenRow) {
    return Response.json(
      { error: "GitHub アクセストークンが見つかりません。再ログインしてください。" },
      { status: 403 },
    );
  }

  let token: string;
  try {
    token = decrypt(
      tokenRow.github_pat_encrypted,
      tokenRow.github_pat_iv,
      tokenRow.github_pat_tag,
    );
  } catch {
    return Response.json(
      { error: "アクセストークンの読み込みに失敗しました。再ログインしてください。" },
      { status: 500 },
    );
  }

  const type = tier === "paid" ? "all" : "public";
  let res: Response;
  try {
    res = await fetch(
      `https://api.github.com/user/repos?type=${type}&sort=updated&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
  } catch {
    return Response.json({ error: "GitHub への接続に失敗しました。" }, { status: 502 });
  }

  if (res.status === 401) {
    return Response.json(
      { error: "アクセストークンが無効です。再ログインしてください。" },
      { status: 401 },
    );
  }
  if (!res.ok) {
    return Response.json({ error: "リポジトリ一覧の取得に失敗しました。" }, { status: 502 });
  }

  type GitHubRepo = {
    full_name: string;
    name: string;
    owner: { login: string };
    private: boolean;
    description: string | null;
    updated_at: string;
    html_url: string;
  };

  const data: GitHubRepo[] = await res.json();
  const repos: RepoItem[] = data.map((r) => ({
    full_name: r.full_name,
    name: r.name,
    owner: r.owner.login,
    private: r.private,
    description: r.description,
    updated_at: r.updated_at,
    html_url: r.html_url,
  }));

  return Response.json({ repos, tier });
}
