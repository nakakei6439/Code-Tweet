import { apiError } from "@/lib/apiErrors";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/entitlements";
import { buildReadmePayload, parseGitHubRepoUrl } from "@/lib/githubReadme";
import { getInstallationToken } from "@/lib/githubApp";
import type { UsageTier } from "@/types/usage";

async function publicRepoExists(owner: string, repo: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_request", 400);
  }

  const parsed = parseGitHubRepoUrl(body.url ?? "");
  if (!parsed) {
    return apiError("repo_url_required", 400);
  }

  const { owner, repo } = parsed;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let usageTier: UsageTier = "guest";
  let isPaid = false;
  let hasInstallation = false;
  if (user) {
    // 文字数上限・プライベートリポ対応は perk 判定（サブスク / 管理者 / クレジット残高あり）。
    const { perkTier } = await getEntitlements(user.id, user.email);
    usageTier = perkTier;
    isPaid = perkTier === "paid";

    // perk あり かつ GitHub App 接続済みなら、非公開リポジトリ用に installation トークンを付与する
    if (isPaid) {
      const admin = createAdminClient();
      const { data: installRow } = await admin
        .from("github_app_installations")
        .select("installation_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (installRow) {
        const token = await getInstallationToken(Number(installRow.installation_id));
        if (token) {
          (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
          hasInstallation = true;
        }
      }
    }
  }

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
  } catch {
    return apiError("readme_fetch_failed", 502);
  }

  if (res.status === 401) {
    return Response.json(
      "github_app_invalid",
      { status: 401 },
    );
  }

  if (res.status === 403 || res.status === 404) {
    // 公開リポジトリなら未認証でも見えるはず。見えない＝非公開（または存在しない）
    if (await publicRepoExists(owner, repo)) {
      return Response.json(
        "readme_not_found",
        { status: 404 },
      );
    }
    if (!isPaid) {
      return Response.json(
        "private_repo_paid_only",
        { status: 403 },
      );
    }
    if (!hasInstallation) {
      return Response.json(
        "github_app_not_connected",
        { status: 403 },
      );
    }
    return Response.json(
      {
        error:
          "repo_not_accessible",
      },
      { status: 404 },
    );
  }

  if (!res.ok) {
    return apiError("readme_fetch_failed", 502);
  }

  const data = await res.json();
  if (!data.content) {
    return apiError("readme_not_found", 404);
  }

  const readmePayload = buildReadmePayload(data, usageTier);
  if (!readmePayload.ok) {
    return Response.json(readmePayload.body, { status: readmePayload.status });
  }

  return Response.json(readmePayload);
}
