"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthOverlay() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setIsPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "read:user user:email repo",
      },
    });
    if (error) {
      setError("ログインを開始できませんでした。少し時間をおいて再試行してください。");
      setIsPending(false);
    }
  }

  return (
    <div className="mb-6 bg-gray-900/60 backdrop-blur border border-gray-800 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex-1 text-sm text-gray-300">
        <span className="text-white font-medium">そのまま使えます（月 3 回まで）。</span>{" "}
        <span className="text-gray-400">GitHub ログインで月 10 回まで・リポジトリ一覧から選択も可能になります。</span>
      </div>
      <button
        onClick={handleLogin}
        disabled={isPending}
        className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer
          bg-white text-gray-900
          hover:bg-gray-100
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
        {isPending ? "リダイレクト中..." : "GitHub でログイン"}
      </button>
      {error && (
        <p className="text-red-400 text-xs sm:basis-full">{error}</p>
      )}
    </div>
  );
}
