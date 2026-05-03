"use client";

import { useState } from "react";

type Props = {
  hasPat: boolean;
};

export default function SettingsForm({ hasPat: initialHasPat }: Props) {
  const [hasPat, setHasPat] = useState(initialHasPat);
  const [token, setToken] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSave() {
    if (!token.trim()) return;
    setIsPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error ?? "保存に失敗しました。", ok: false });
        return;
      }
      setToken("");
      setHasPat(true);
      setMessage({ text: "Personal Access Token を保存しました。", ok: true });
    } catch {
      setMessage({ text: "ネットワークエラーが発生しました。", ok: false });
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    setIsPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tokens", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error ?? "削除に失敗しました。", ok: false });
        return;
      }
      setHasPat(false);
      setMessage({ text: "Personal Access Token を削除しました。", ok: true });
    } catch {
      setMessage({ text: "ネットワークエラーが発生しました。", ok: false });
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
            トークンはサーバーで暗号化して保存されます。スコープは{" "}
            <code className="text-cyan-400 text-xs bg-gray-800 px-1 py-0.5 rounded">repo</code>（読み取りのみ推奨）に設定してください。
          </p>
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

        {message && (
          <div
            className={`border rounded-lg px-4 py-3 text-sm ${
              message.ok
                ? "border-emerald-800 bg-emerald-950/50 text-emerald-400"
                : "border-red-800 bg-red-950/50 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
