"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: string;
  className: string;
  next?: string;
};

export default function GitHubLoginButton({ children, className, next = "/" }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isPending) return;

    setIsPending(true);
    setError(null);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: "read:user user:email",
      },
    });

    if (error) {
      setError("ログインを開始できませんでした。少し時間をおいて再試行してください。");
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={handleClick} disabled={isPending} className={className}>
        {isPending ? "リダイレクト中..." : children}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
