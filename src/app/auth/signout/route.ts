import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin, searchParams } = new URL(request.url);
  // ログアウト後も同じ言語のトップに戻す（?next=/en など）。外部への誘導は許さない。
  const next = getSafeNextPath(searchParams.get("next"), "/");
  return NextResponse.redirect(`${origin}${next}`, { status: 303 });
}

function getSafeNextPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
