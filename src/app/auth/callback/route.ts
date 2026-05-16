import { NextResponse } from "next/server";
import { encrypt } from "@/lib/encryption";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.session?.provider_token && data.user) {
        const { encrypted, iv, tag } = encrypt(data.session.provider_token);
        const admin = createAdminClient();
        const { error: tokenError } = await admin
          .from("user_tokens")
          .upsert(
            {
              user_id: data.user.id,
              github_pat_encrypted: encrypted,
              github_pat_iv: iv,
              github_pat_tag: tag,
              source: "github_oauth",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        if (tokenError) {
          logError("auth/callback", "github oauth token upsert error", tokenError, { userId: data.user.id });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
