import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"), "/");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // ログインは識別のみに使用する。リポジトリ用トークンは保存せず、
      // 非公開リポジトリへのアクセスは GitHub App（installation トークン）で行う。
      //
      // ファネル用の sign_up は「新規登録」だけで送りたいので、初回サインインを判定する。
      // Supabase は初回サインイン（＝登録）時に created_at と last_sign_in_at を同時刻に打つため、
      // 両者がほぼ一致していれば新規登録とみなす（クライアント側で ?signup=1 を検知して送信）。
      const redirectUrl = new URL(`${origin}${next}`);
      if (isNewSignUp(data.user)) {
        redirectUrl.searchParams.set("signup", "1");
      }
      return NextResponse.redirect(redirectUrl.toString());
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}

function isNewSignUp(user: { created_at?: string; last_sign_in_at?: string | null } | null): boolean {
  if (!user?.created_at) return false;
  const createdAt = new Date(user.created_at).getTime();
  if (Number.isNaN(createdAt)) return false;
  // last_sign_in_at 未設定なら初回とみなす。設定済みでも created_at と 5 秒以内なら初回登録。
  if (!user.last_sign_in_at) return true;
  const lastSignIn = new Date(user.last_sign_in_at).getTime();
  if (Number.isNaN(lastSignIn)) return true;
  return Math.abs(lastSignIn - createdAt) < 5000;
}

function getSafeNextPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
