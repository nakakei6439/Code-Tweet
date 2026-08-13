import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_LOGIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  getAdminSecurityConfig,
  verifyAdminLoginSessionCookieValue,
  verifyAdminSessionCookieValue,
} from "@/lib/adminSecurity";
import { routing } from "@/i18n/routing";
import { stripLocale } from "@/lib/locales";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const path = stripLocale(request.nextUrl.pathname);

  // ロケール解決より先に処理すべきもの（OAuth の取りこぼし救済と管理画面ゲート）。
  const oauthRescueResponse = rescueOAuthCodeOnHome(request, path);
  if (oauthRescueResponse) return oauthRescueResponse;

  if (path.startsWith("/admin")) {
    const adminGateResponse = await enforceAdminGate(request, path);
    if (adminGateResponse) return adminGateResponse;
  }

  // next-intl にロケールを解決させたうえで、その判断を保ったまま Supabase の
  // セッション更新 cookie を載せる。
  const intlResponse = intlMiddleware(request);
  const rewriteTarget = intlResponse.headers.get("x-middleware-rewrite");
  const isRedirect = !rewriteTarget && intlResponse.status >= 300 && intlResponse.status < 400;

  if (isRedirect) {
    // リダイレクトはブラウザが引き直すので、更新後の cookie を載せ替えるだけでよい。
    const refreshed = await updateSession(request);
    copyCookies(refreshed, intlResponse);
    return intlResponse;
  }

  const response = await updateSession(request, (req) =>
    rewriteTarget
      ? NextResponse.rewrite(new URL(rewriteTarget), { request: req })
      : NextResponse.next({ request: req }),
  );

  // next-intl 側が付けたロケール cookie と hreflang の Link ヘッダを引き継ぐ。
  copyCookies(intlResponse, response);
  const link = intlResponse.headers.get("link");
  if (link) response.headers.set("link", link);

  return response;
}

function copyCookies(from: NextResponse, to: NextResponse): void {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

function rescueOAuthCodeOnHome(request: NextRequest, path: string): NextResponse | null {
  const { nextUrl } = request;
  const code = nextUrl.searchParams.get("code");

  if (path !== "/" || !code || nextUrl.searchParams.has("error")) {
    return null;
  }

  const url = nextUrl.clone();
  url.pathname = "/auth/callback";
  url.search = "";
  url.searchParams.set("code", code);
  url.searchParams.set("next", getSafeNextPath(nextUrl.searchParams.get("next"), "/pricing"));
  return NextResponse.redirect(url);
}

function getSafeNextPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

async function enforceAdminGate(request: NextRequest, path: string): Promise<NextResponse | null> {
  const config = getAdminSecurityConfig();
  if (!config) {
    return new NextResponse("Admin security is not configured.", { status: 503 });
  }

  if (path === "/admin/login" || path.startsWith("/admin/verify")) {
    return null;
  }

  const loginSession = request.cookies.get(ADMIN_LOGIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminLoginSessionCookieValue(loginSession))) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const adminEmail = request.cookies.get("admin_email_hint")?.value;
  if (await verifyAdminSessionCookieValue(adminSession, adminEmail)) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/verify";
  url.searchParams.set("next", `${path}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // API・auth コールバックはロケールを持たないので除外する。
    // public/ 直下の検証ファイル（Google Search Console の google*.html など）や
    // robots.txt / sitemap.xml もロケールを持たない。ここで除外しないと
    // next-intl が /ja/... へ書き換えて 404 になり、所有権確認が静かに外れる。
    //
    // Next.js は matcher に静的な文字列リテラルしか許さないため定数に切り出せない。
    // 代わりに proxyMatcher.test.ts がこのファイルを読んでパターンを取り出し、
    // 境界を固定している。ここを変えたらテストも通るか確認すること。
    "/((?!api/|auth/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|txt|xml|ico|webmanifest)$).*)",
  ],
};
