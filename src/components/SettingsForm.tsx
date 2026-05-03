"use client";

import { useState } from "react";
import Link from "next/link";


type Props = {
  hasPat: boolean;
};

export default function SettingsForm({ hasPat: initialHasPat }: Props) {
  const [hasPat, setHasPat] = useState(initialHasPat);
  const [token, setToken] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  async function handleSave() {
    if (!token.trim()) return;
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました。");
        return;
      }
      setToken("");
      setHasPat(true);
      setJustSaved(true);
    } catch {
      setError("ネットワークエラーが発生しました。");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch("/api/tokens", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "削除に失敗しました。");
        return;
      }
      setHasPat(false);
      setJustSaved(false);
    } catch {
      setError("ネットワークエラーが発生しました。");
    } finally {
      setIsPending(false);
    }
  }

  const inputBase =
    "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <div className="p-8 space-y-6">
        <div>
          <h2 className="text-white font-semibold text-base mb-1">GitHub Personal Access Token</h2>
          <p className="text-gray-400 text-sm">
            プライベートリポジトリの README を取得するために使用します。
            トークンはサーバーで暗号化して保存されます。
          </p>
          <div className="mt-3 flex items-start gap-2 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2.5">
            <svg className="text-amber-400 shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-amber-400 text-xs">
              GitHub でトークンを作成する際、スコープの{" "}
              <code className="bg-amber-900/50 px-1 rounded">repo</code>{" "}
              に必ずチェックを入れてください。チェックなしではプライベートリポジトリにアクセスできません。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">現在の状態：</span>
          {hasPat ? (
            <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded-full">
              登録済み
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-400 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">
              未登録
            </span>
          )}
        </div>

        {justSaved ? (
          <div className="space-y-4">
            <div className="border border-emerald-800 bg-emerald-950/50 rounded-xl px-5 py-4 flex items-start gap-3">
              <svg className="text-emerald-400 mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <div>
                <p className="text-emerald-400 text-sm font-medium">PAT を保存しました</p>
                <p className="text-emerald-600 text-xs mt-0.5">プライベートリポジトリの README を取得できます</p>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold
                bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
                text-white shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity"
            >
              ホームへ戻る
            </Link>
            <button
              onClick={() => setJustSaved(false)}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
            >
              引き続き設定する
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {hasPat ? "新しいトークンで上書き" : "トークンを登録"}
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                disabled={isPending}
                className={inputBase}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isPending || token.trim() === ""}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer
                  bg-gradient-to-r from-cyan-500 to-fuchsia-500
                  text-white shadow-lg shadow-cyan-500/20
                  hover:opacity-90
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isPending ? "処理中..." : "保存"}
              </button>

              {hasPat && (
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer
                    border border-red-800 text-red-400
                    hover:bg-red-950/50
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  削除
                </button>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="border border-red-800 bg-red-950/50 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
