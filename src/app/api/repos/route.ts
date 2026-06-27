import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscriptionTier } from "@/lib/subscription";
import { getInstallationToken } from "@/lib/githubApp";

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
  const isPaid = tier === "paid";

  const admin = createAdminClient();
  const { data: installRow } = await admin
    .from("github_app_installations")
    .select("installation_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!installRow) {
    return Response.json(
      { error: "GitHub App が未接続です。設定画面から「GitHub を接続」してください。" },
      { status: 403 },
    );
  }

  const token = await getInstallationToken(Number(installRow.installation_id));
  if (!token) {
    return Response.json(
      { error: "GitHub App の接続が無効です。設定画面から接続し直してください。" },
      { status: 403 },
    );
  }

  let res: Response;
  try {
    res = await fetch("https://api.github.com/installation/repositories?per_page=100&sort=updated", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch {
    return Response.json({ error: "GitHub への接続に失敗しました。" }, { status: 502 });
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

  const data = (await res.json()) as { repositories?: GitHubRepo[] };
  const repositories = data.repositories ?? [];
  // 無料プランは公開リポジトリのみ（非公開 README 取得は Pro 機能のため）
  const visible = isPaid ? repositories : repositories.filter((r) => !r.private);
  const repos: RepoItem[] = visible.map((r) => ({
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
