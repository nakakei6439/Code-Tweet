import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscriptionTier } from "@/lib/subscription";
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
    return Response.json({ error: "リクエストが不正です。" }, { status: 400 });
  }

  const parsed = parseGitHubRepoUrl(body.url ?? "");
  if (!parsed) {
    return Response.json({ error: "GitHub のリポジトリ URL を入力してください。" }, { status: 400 });
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
    const tier = await getSubscriptionTier(user.id);
    usageTier = tier;
    isPaid = tier === "paid";

    // Pro かつ GitHub App 接続済みなら、非公開リポジトリ用に installation トークンを付与する
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
    return Response.json({ error: "README の取得に失敗しました。" }, { status: 502 });
  }

  if (res.status === 401) {
    return Response.json(
      { error: "GitHub App の接続が無効です。設定画面から接続し直してください。" },
      { status: 401 },
    );
  }

  if (res.status === 403 || res.status === 404) {
    // 公開リポジトリなら未認証でも見えるはず。見えない＝非公開（または存在しない）
    if (await publicRepoExists(owner, repo)) {
      return Response.json(
        { error: "README が見つかりません。リポジトリに README ファイルがあるか確認してください。" },
        { status: 404 },
      );
    }
    if (!isPaid) {
      return Response.json(
        { error: "非公開リポジトリの README 取得は Pro プランの機能です。公開リポジトリをご利用ください。" },
        { status: 403 },
      );
    }
    if (!hasInstallation) {
      return Response.json(
        { error: "GitHub App が未接続です。設定画面から「GitHub を接続」してください。" },
        { status: 403 },
      );
    }
    return Response.json(
      {
        error:
          "リポジトリが見つからないか、GitHub App にこのリポジトリへのアクセスが許可されていません。GitHub のインストール設定で対象リポジトリを追加してください。",
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

  const readmePayload = buildReadmePayload(data, usageTier);
  if (!readmePayload.ok) {
    return Response.json(readmePayload.body, { status: readmePayload.status });
  }

  return Response.json(readmePayload);
}
