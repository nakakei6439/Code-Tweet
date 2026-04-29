"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  isAuthenticated: boolean;
  email: string | null;
};

export default function HeaderActions({ isAuthenticated, email }: Props) {
  const [isPending, setIsPending] = useState(false);

  async function handleLogin() {
    setIsPending(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={handleLogin}
        disabled={isPending}
        className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
          bg-white text-gray-900 hover:bg-gray-100
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "..." : "ログイン"}
      </button>
    );
  }

  return (
    <form action="/auth/signout" method="post" className="flex items-center gap-3">
      <span className="text-gray-400 text-xs hidden sm:inline">{email}</span>
      <button
        type="submit"
        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
          border border-gray-700 text-gray-300 hover:bg-gray-800"
      >
        ログアウト
      </button>
    </form>
  );
}
