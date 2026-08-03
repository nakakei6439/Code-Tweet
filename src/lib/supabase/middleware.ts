import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase のセッションを更新し、更新後の cookie を載せたレスポンスを返す。
 *
 * レスポンスは `createResponse` で組み立てる。next-intl がロケール用の rewrite を返す場合、
 * その rewrite 先を保ったままレスポンスを作り直す必要があるため、生成をここに閉じ込めず
 * 呼び出し側から差し替えられるようにしている。
 *
 * cookie 更新時にレスポンスを作り直すのは Supabase SSR の作法。request.cookies を書き換えてから
 * 作り直すことで、同一リクエスト内の Server Component も更新後のトークンを読める。
 */
export async function updateSession(
  request: NextRequest,
  createResponse: (request: NextRequest) => NextResponse = (req) =>
    NextResponse.next({ request: req }),
) {
  let supabaseResponse = createResponse(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = createResponse(request);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
