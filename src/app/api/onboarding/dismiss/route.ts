import { cookies } from "next/headers";
import {
  ONBOARDING_COOKIE_MAX_AGE,
  ONBOARDING_COOKIE_NAME,
} from "@/lib/onboarding";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(ONBOARDING_COOKIE_NAME, "1", {
    maxAge: ONBOARDING_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  return new Response(null, { status: 204 });
}
