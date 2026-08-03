"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { localePath, type LocaleId } from "@/lib/locales";

type Props = {
  children: string;
  className: string;
  next?: string;
};

export default function GitHubLoginButton({ children, className, next = "/" }: Props) {
  const t = useTranslations("githubLogin");
  const locale = useLocale() as LocaleId;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isPending) return;

    setIsPending(true);
    setError(null);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    // next はロケール接頭辞のないパスで渡ってくるので、ここで現在の言語に合わせる。
    callbackUrl.searchParams.set("next", localePath(locale, next));

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: "read:user user:email",
      },
    });

    if (error) {
      setError(t("error"));
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={handleClick} disabled={isPending} className={className}>
        {isPending ? t("redirecting") : children}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
