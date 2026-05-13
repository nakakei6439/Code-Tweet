"use client";

import { useState } from "react";

type StripeAction = "checkout" | "portal";

type Props = {
  action: StripeAction;
  children: string;
  className: string;
  disabled?: boolean;
};

const ENDPOINTS: Record<StripeAction, string> = {
  checkout: "/api/stripe/checkout",
  portal: "/api/stripe/portal",
};

export default function StripeActionButton({ action, children, className, disabled }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (disabled || isPending) return;

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch(ENDPOINTS[action], { method: "POST" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        setError(data?.error ?? "決済ページの作成に失敗しました。");
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
        disabled={disabled || isPending}
        className={className}
      >
        {isPending ? "移動中..." : children}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
