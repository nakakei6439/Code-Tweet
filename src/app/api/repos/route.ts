import { apiError } from "@/lib/apiErrors";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasProAccess } from "@/lib/entitlements";
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
    return apiError("login_required", 401);
  }

  // プライベートリポジトリの表示は perk 判定（サブスク / 管理者 / クレジット残高あり）。
  const isPaid = await hasProAccess(user.id, user.email);

  const admin = createAdminClient();
  const { data: installRow } = await admin
    .from("github_app_installations")
    .select("installation_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!installRow) {
    return apiError("github_app_not_connected", 403);
  }

  const token = await getInstallationToken(Number(installRow.installation_id));
  if (!token) {
    return apiError("github_app_invalid", 403);
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
    return apiError("github_connect_failed", 502);
  }

  if (!res.ok) {
    return apiError("repos_fetch_failed", 502);
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

  return Response.json({ repos, tier: isPaid ? "paid" : "free" });
}
