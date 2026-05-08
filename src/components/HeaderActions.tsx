"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SubscriptionTier } from "@/lib/subscription";

type Props = {
  isAuthenticated: boolean;
  email: string | null;
  tier: SubscriptionTier | null;
};

export default function HeaderActions({ isAuthenticated, email, tier }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleLogin() {
    setIsPending(true);
    setIsOpen(false);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "read:user user:email repo",
      },
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="メニュー"
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl z-50">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          {isAuthenticated ? (
            <div className="p-2 space-y-0.5">
              {email && (
                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <p className="text-gray-500 text-xs truncate flex-1">{email}</p>
                  {tier === "paid" ? (
                    <span className="text-[10px] font-bold text-fuchsia-300 bg-fuchsia-950/60 border border-fuchsia-800 px-1.5 py-0.5 rounded">
                      Pro
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
                      Free
                    </span>
                  )}
                </div>
              )}
              {tier !== "paid" && (
                <Link
                  href="/pricing"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2 rounded-lg text-sm text-fuchsia-300 hover:bg-fuchsia-950/40 transition-colors"
                >
                  Pro プランを見る
                </Link>
              )}
              <Link
                href="/about"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Code Tweet とは
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                設定
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
                >
                  ログアウト
                </button>
              </form>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              <Link
                href="/about"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Code Tweet とは
              </Link>
              <button
                onClick={handleLogin}
                disabled={isPending}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  bg-white text-gray-900 hover:bg-gray-100
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                {isPending ? "..." : "GitHub でログイン"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
