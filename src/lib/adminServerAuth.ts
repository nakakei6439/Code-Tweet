import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookieValue } from "@/lib/adminSecurity";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function getVerifiedAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;
  if (!isAdminEmail(user.email)) return null;

  const cookieStore = await cookies();
  const hasAdminSession = await verifyAdminSessionCookieValue(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    user.email,
  );

  if (!hasAdminSession) return null;
  return user;
}

export async function requireVerifiedAdminUser() {
  const user = await getVerifiedAdminUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function redirectIfNotVerifiedAdmin(next = "/admin") {
  const user = await getVerifiedAdminUser();
  if (!user) {
    redirect(`/admin/verify?next=${encodeURIComponent(next)}`);
  }
  return user;
}
