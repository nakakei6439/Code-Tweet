"use client";

import { useApiErrorMessage } from "@/lib/useApiErrorMessage";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

type StripeAction = "portal" | "credits";

type Props = {
  action: StripeAction;
  children: string;
  className: string;
  disabled?: boolean;
  /** action="credits" のとき購入するパック id（creditPacks.ts の CreditPackId） */
  packId?: string;
};

const ENDPOINTS: Record<StripeAction, string> = {
  portal: "/api/stripe/portal",
  credits: "/api/stripe/credits",
};

export default function StripeActionButton({ action, children, className, disabled, packId }: Props) {
  const t = useTranslations("stripeButtons");
  const locale = useLocale();
  const resolveApiError = useApiErrorMessage();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (disabled || isPending) return;

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch(ENDPOINTS[action], {
        method: "POST",
        ...(action === "credits"
          ? {
              headers: { "Content-Type": "application/json" },
              // locale は Stripe の決済ページ言語と商品名に使う（サーバー側で検証する）。
              body: JSON.stringify({ packId, locale }),
            }
          : {}),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        setError(resolveApiError(data));
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(t("networkError"));
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
        {isPending ? t("redirecting") : children}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
