import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";
import { GITHUB_APP_STATE_COOKIE } from "@/app/api/github-app/install/route";

/**
 * GitHub App インストール後の戻り先。
 * installation_id をログイン中ユーザーに紐付けて保存する。トークンは保存しない。
 */
export async function GET(request: Request): Promise<Response> {
  const { origin, searchParams } = new URL(request.url);
  const settingsUrl = `${origin}/settings`;

  const installationId = Number(searchParams.get("installation_id"));
  const state = searchParams.get("state");
  const setupAction = searchParams.get("setup_action");

  // CSRF: install 時に発行した state と一致するか確認
  const expectedState = request.headers.get("cookie")?.match(/(?:^|;\s*)gh_app_state=([^;]+)/)?.[1];

  function clearStateCookie(res: NextResponse): NextResponse {
    res.cookies.set(GITHUB_APP_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  if (!state || !expectedState || state !== expectedState) {
    return clearStateCookie(NextResponse.redirect(`${settingsUrl}?github_app_error=state`));
  }

  // アンインストール等で installation_id が無い場合は設定画面へ戻すだけ
  if (!Number.isInteger(installationId) || installationId <= 0) {
    return clearStateCookie(
      NextResponse.redirect(`${settingsUrl}?github_app=${setupAction === "request" ? "requested" : "noop"}`),
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return clearStateCookie(NextResponse.redirect(settingsUrl));
  }

  const admin = createAdminClient();
  const { error } = await admin.from("github_app_installations").upsert(
    {
      user_id: user.id,
      installation_id: installationId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    logError("github-app/callback", "installation upsert error", error, { userId: user.id });
    return clearStateCookie(NextResponse.redirect(`${settingsUrl}?github_app_error=save`));
  }

  return clearStateCookie(NextResponse.redirect(`${settingsUrl}?github_app=connected`));
}
