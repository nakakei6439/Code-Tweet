import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encryption";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // GitHub OAuth の provider_token を user_tokens に暗号化保存
      const providerToken = data.session?.provider_token;
      const userId = data.session?.user?.id;
      if (providerToken && userId) {
        try {
          const { encrypted, iv, tag } = encrypt(providerToken);
          const admin = createAdminClient();
          await admin.from("user_tokens").upsert(
            {
              user_id: userId,
              github_pat_encrypted: encrypted,
              github_pat_iv: iv,
              github_pat_tag: tag,
              source: "github_oauth",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        } catch (e) {
          console.error("[auth/callback] failed to persist provider_token:", e);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
