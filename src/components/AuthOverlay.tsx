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
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError("ログインを開始できませんでした。少し時間をおいて再試行してください。");
      setIsPending(false);
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center pt-24 px-4 pointer-events-none">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl shadow-cyan-500/10 pointer-events-auto">
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        <div className="p-8 flex flex-col items-center gap-5 text-center">
          <div className="text-3xl">🔒</div>
          <div>
            <p className="text-white font-semibold text-lg">ログインして始めましょう</p>
            <p className="text-gray-400 text-sm mt-2">
              ポスト生成には Google アカウントでのログインが必要です
            </p>
          </div>
          <button
            onClick={handleLogin}
            disabled={isPending}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all cursor-pointer
              bg-white text-gray-900
              hover:bg-gray-100
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.61z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            {isPending ? "リダイレクト中..." : "Google でログイン"}
          </button>
          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
