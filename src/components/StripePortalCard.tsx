"use client";

import { useState } from "react";

export default function StripePortalCard() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isPending) return;

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        setError(data?.error ?? "解約ページの作成に失敗しました。");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("通信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="block w-full rounded-xl border border-gray-800 bg-gray-900/70 p-5 text-left transition-colors hover:border-gray-700 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <p className="text-sm font-semibold text-white">
          {isPending ? "解約ページへ移動中..." : "サブスクリプションを解約する"}
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          Stripe カスタマーポータルへ移動し、サブスクリプションの解約・支払い方法の変更・領収書の確認ができます。ログイン状態のサブスクリプション契約者のみご利用いただけます。
        </p>
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
