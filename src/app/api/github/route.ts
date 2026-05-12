import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import { getSubscriptionTier } from "@/lib/subscription";

function parseGitHubRepoUrl(input: string): { owner: string; repo: string } | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null;

  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !rawRepo) return null;

  const repo = rawRepo.replace(/\.git$/i, "");
  if (!repo) return null;

  return { owner, repo };
}

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
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let hasToken = false;
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
          const token = decrypt(
            tokenRow.github_pat_encrypted,
            tokenRow.github_pat_iv,
            tokenRow.github_pat_tag,
          );
          headers["Authorization"] = `Bearer ${token}`;
          hasToken = true;
        } catch {
          return Response.json(
            { error: "GitHub アクセストークンの読み込みに失敗しました。再ログインしてください。" },
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
      { error: "GitHub アクセストークンが無効です。再ログインしてください。" },
      { status: 401 },
    );
  }
  if (res.status === 403) {
    if (!user) {
      return Response.json(
        { error: "非公開リポジトリの README 取得は Pro プランの機能です。現在は公開リポジトリをご利用ください。" },
        { status: 403 },
      );
    }
    if (!isPaid) {
      return Response.json(
        { error: "非公開リポジトリの README 取得は Pro プランの機能です。現在は公開リポジトリをご利用ください。" },
        { status: 403 },
      );
    }
    if (!hasToken) {
      return Response.json(
        { error: "GitHub アクセストークンが見つかりません。再ログインしてください。" },
        { status: 403 },
      );
    }
    return Response.json(
      { error: "このリポジトリへのアクセス権がありません。" },
      { status: 403 },
    );
  }
  if (res.status === 404) {
    if (await publicRepoExists(owner, repo)) {
      return Response.json(
        { error: "README が見つかりません。公開リポジトリに README ファイルがあるか確認してください。" },
        { status: 404 },
      );
    }

    // GitHub はプライベートリポジトリへのアクセス権がない場合も 404 を返す
    if (hasToken) {
      return Response.json(
        { error: "リポジトリが見つかりません。URL を確認してください。" },
        { status: 404 },
      );
    }
    if (isPaid) {
      return Response.json(
        { error: "リポジトリが見つかりません。非公開リポジトリの場合は再ログインしてください。" },
        { status: 404 },
      );
    }
    if (user) {
      return Response.json(
        { error: "リポジトリが見つかりません。非公開リポジトリは Pro プランの機能です。" },
        { status: 404 },
      );
    }
    return Response.json(
      { error: "リポジトリが見つかりません。非公開リポジトリは Pro プランの機能です。" },
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
