"use client";

import { useApiErrorMessage } from "@/lib/useApiErrorMessage";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function StripePortalCard() {
  const t = useTranslations("stripeButtons");
  const resolveApiError = useApiErrorMessage();
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
        disabled={isPending}
        className="block w-full rounded-xl border border-gray-800 bg-gray-900/70 p-5 text-left transition-colors hover:border-gray-700 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <p className="text-sm font-semibold text-white">
          {isPending ? t("cancelRedirecting") : t("cancelSubscription")}
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          {t("portalNote")}
        </p>
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
