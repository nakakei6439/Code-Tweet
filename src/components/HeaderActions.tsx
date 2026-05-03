"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Props = {
  isAuthenticated: boolean;
  email: string | null;
};

export default function HeaderActions({ isAuthenticated, email }: Props) {
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
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
                <p className="px-3 py-2 text-gray-500 text-xs truncate">{email}</p>
              )}
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
            <div className="p-2">
              <button
                onClick={handleLogin}
                disabled={isPending}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  bg-white text-gray-900 hover:bg-gray-100
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "..." : "Google でログイン"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
