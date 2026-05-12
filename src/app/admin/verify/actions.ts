"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionCookieValue,
  getAdminLockState,
  getAdminTotpAttemptIdentifier,
  recordAdminLoginFailure,
  resetAdminLoginFailures,
  verifyTotp,
} from "@/lib/adminSecurity";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function verifyAdminTotp(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const next = sanitizeNextPath(String(formData.get("next") ?? "/admin"));

  if (!user) {
    redirect(`/admin/verify?next=${encodeURIComponent(next)}&error=login`);
  }
  if (!isAdminEmail(user.email)) {
    redirect("/");
  }

  const identifier = getAdminTotpAttemptIdentifier(user.email ?? user.id);
  const lockState = await getAdminLockState(identifier);
  if (lockState.locked) {
    redirect(`/admin/verify?next=${encodeURIComponent(next)}&error=locked`);
  }

  let isValid = false;
  try {
    isValid = await verifyTotp(String(formData.get("code") ?? ""));
  } catch {
    isValid = false;
  }

  if (!isValid) {
    const failureState = await recordAdminLoginFailure(identifier);
    redirect(`/admin/verify?next=${encodeURIComponent(next)}&error=${failureState.locked ? "locked" : "invalid"}`);
  }

  await resetAdminLoginFailures(identifier);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, await createAdminSessionCookieValue(user.email ?? user.id), {
    httpOnly: true,
    maxAge: 60 * 60,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.set("admin_email_hint", (user.email ?? user.id).trim().toLowerCase(), {
    httpOnly: true,
    maxAge: 60 * 60,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(next);
}

function sanitizeNextPath(value: string): string {
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  return value;
}
