import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_LOGIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  getAdminSecurityConfig,
  verifyAdminLoginSessionCookieValue,
  verifyAdminSessionCookieValue,
} from "@/lib/adminSecurity";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const oauthRescueResponse = rescueOAuthCodeOnHome(request);
  if (oauthRescueResponse) return oauthRescueResponse;

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminGateResponse = await enforceAdminGate(request);
    if (adminGateResponse) return adminGateResponse;
  }

  return await updateSession(request);
}

function rescueOAuthCodeOnHome(request: NextRequest): NextResponse | null {
  const { nextUrl } = request;
  const code = nextUrl.searchParams.get("code");

  if (nextUrl.pathname !== "/" || !code || nextUrl.searchParams.has("error")) {
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

async function enforceAdminGate(request: NextRequest): Promise<NextResponse | null> {
  const config = getAdminSecurityConfig();
  if (!config) {
    return new NextResponse("Admin security is not configured.", { status: 503 });
  }

  const path = request.nextUrl.pathname;

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
