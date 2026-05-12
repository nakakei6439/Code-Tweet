import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminBasicAttemptIdentifier,
  getAdminLockState,
  getAdminSecurityConfig,
  recordAdminLoginFailure,
  resetAdminLoginFailures,
  verifyAdminSessionCookieValue,
  verifyBasicAuth,
} from "@/lib/adminSecurity";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminGateResponse = await enforceAdminGate(request);
    if (adminGateResponse) return adminGateResponse;
  }

  return await updateSession(request);
}

async function enforceAdminGate(request: NextRequest): Promise<NextResponse | null> {
  const config = getAdminSecurityConfig();
  if (!config) {
    return new NextResponse("Admin security is not configured.", { status: 503 });
  }

  const attemptIdentifier = getAdminBasicAttemptIdentifier();
  const lockState = await getAdminLockState(attemptIdentifier);
  if (lockState.locked) {
    return new NextResponse("Admin login is temporarily locked.", {
      status: 429,
      headers: lockState.lockedUntil
        ? { "Retry-After": secondsUntil(lockState.lockedUntil).toString() }
        : undefined,
    });
  }

  const authorization = request.headers.get("authorization");
  if (!verifyBasicAuth(authorization)) {
    if (authorization) {
      await recordAdminLoginFailure(attemptIdentifier);
    }
    return basicAuthRequiredResponse();
  }

  await resetAdminLoginFailures(attemptIdentifier);

  if (request.nextUrl.pathname.startsWith("/admin/verify")) {
    return null;
  }

  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const adminEmail = request.cookies.get("admin_email_hint")?.value;
  if (await verifyAdminSessionCookieValue(adminSession, adminEmail)) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/verify";
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

function basicAuthRequiredResponse(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Code Tweet Admin", charset="UTF-8"',
    },
  });
}

function secondsUntil(iso: string): number {
  return Math.max(1, Math.ceil((Date.parse(iso) - Date.now()) / 1000));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
