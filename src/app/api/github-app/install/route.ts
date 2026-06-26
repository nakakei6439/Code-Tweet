import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInstallUrl, getGithubAppConfig } from "@/lib/githubApp";

export const GITHUB_APP_STATE_COOKIE = "gh_app_state";

/**
 * GitHub App のインストールを開始する。
 * CSRF 対策の state を httpOnly Cookie に保存してから GitHub のインストール画面へ送る。
 */
export async function GET(request: Request): Promise<Response> {
  const { origin } = new URL(request.url);

  const config = getGithubAppConfig();
  if (!config) {
    return NextResponse.redirect(`${origin}/settings?github_app_error=not_configured`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/settings`);
  }

  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(buildInstallUrl(config.slug, state));
  response.cookies.set(GITHUB_APP_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
