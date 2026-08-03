"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_LOGIN_SESSION_COOKIE,
  createAdminLoginSessionCookieValue,
  getAdminBasicAttemptIdentifier,
  getAdminLockState,
  recordAdminLoginFailure,
  resetAdminLoginFailures,
  verifyAdminCredentials,
} from "@/lib/adminSecurity";

export async function submitAdminLogin(formData: FormData): Promise<void> {
  const next = sanitizeNextPath(String(formData.get("next") ?? "/admin"));
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const identifier = getAdminBasicAttemptIdentifier();
  const lockState = await getAdminLockState(identifier);
  if (lockState.locked) {
    redirect(`/admin/login?next=${encodeURIComponent(next)}&error=locked`);
  }

  if (!verifyAdminCredentials(username, password)) {
    const failureState = await recordAdminLoginFailure(identifier);
    redirect(
      `/admin/login?next=${encodeURIComponent(next)}&error=${failureState.locked ? "locked" : "invalid"}`,
    );
  }

  await resetAdminLoginFailures(identifier);

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_LOGIN_SESSION_COOKIE,
    await createAdminLoginSessionCookieValue(username),
    {
      httpOnly: true,
      maxAge: 60 * 60,
      path: "/admin",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );

  redirect(`/admin/verify?next=${encodeURIComponent(next)}`);
}

function sanitizeNextPath(value: string): string {
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  return value;
}
