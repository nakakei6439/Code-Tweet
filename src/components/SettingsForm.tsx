"use client";

import { useTranslations } from "next-intl";
import { useApiErrorMessage } from "@/lib/useApiErrorMessage";
import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import HomeLinkButton from "@/components/HomeLinkButton";

type Props = {
  isConnected: boolean;
  /** perk（旧 Pro 特典）の有無。GitHub App 連携 UI のゲートに使う。 */
  hasProAccess: boolean;
  /** Stripe サブスク契約中か。解約前のアカウント削除ブロックに使う。 */
  hasActiveSubscription: boolean;
  appConfigured: boolean;
};

function AccountDeletionSection({ hasActiveSubscription }: { hasActiveSubscription: boolean }) {
  const resolveApiError = useApiErrorMessage();
  const t = useTranslations("settingsForm");
  const tsb = useTranslations("stripeButtons");
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsCancel, setNeedsCancel] = useState(false);
  const [isPortalPending, setIsPortalPending] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const blockDelete = hasActiveSubscription || needsCancel;
  const canDelete = confirmation === "DELETE" && !isDeleting && !blockDelete;

  async function handleOpenPortal() {
    if (isPortalPending) return;
    setIsPortalPending(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setPortalError(resolveApiError(data));
        return;
      }
      window.location.href = data.url;
    } catch {
      setPortalError(tsb("networkError"));
    } finally {
      setIsPortalPending(false);
    }
  }

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !isDeleting) setIsConfirmOpen(false);
    }

    if (isConfirmOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isConfirmOpen, isDeleting]);

  function handleDeleteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canDelete) return;

    setError(null);
    setIsConfirmOpen(true);
  }

  async function handleConfirmedDelete() {
    if (!canDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });

      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(resolveApiError(data));
        if (data?.needsCancel) setNeedsCancel(true);
        setIsDeleting(false);
        setIsConfirmOpen(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError(t("deleteNetworkError"));
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  }

  function closeConfirmModal() {
    if (isDeleting) return;
    setIsConfirmOpen(false);
  }

  return (
    <>
      <div className="bg-gray-900/80 backdrop-blur-xl border border-red-950/70 rounded-2xl overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />
        <form onSubmit={handleDeleteSubmit} className="p-8 space-y-5">
          <div>
            <h2 className="text-white font-semibold text-base mb-1">{t("deleteTitle")}</h2>
            <p className="text-gray-400 text-sm">
              {t("deleteBody1")}
              {t("deleteBody2")}
            </p>
          </div>

          {blockDelete && (
            <div className="rounded-lg border border-amber-800/70 bg-amber-950/30 px-4 py-4 space-y-3">
              <p className="text-amber-200 text-xs font-semibold">
                {t("blockedTitle")}
              </p>
              <p className="text-amber-100/80 text-xs leading-5">
                {t("blockedBody")}
              </p>
              <button
                type="button"
                onClick={handleOpenPortal}
                disabled={isPortalPending}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-700 bg-amber-900/30 px-4 text-xs font-semibold
                  text-amber-100 transition-colors hover:bg-amber-900/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPortalPending ? tsb("redirecting") : t("openPortal")}
              </button>
              {portalError && (
                <p className="text-[11px] text-red-300">{portalError}</p>
              )}
            </div>
          )}

          <label className="block">
            <span className="block text-sm font-medium text-gray-300 mb-2">
              {t("confirmPrompt")}
            </span>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={isDeleting || blockDelete}
              autoComplete="off"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white
                outline-none transition-colors placeholder:text-gray-600 focus:border-red-500 disabled:opacity-60"
              placeholder="DELETE"
            />
          </label>

          {error && (
            <div className="border border-red-900/70 bg-red-950/30 rounded-lg px-4 py-3 text-red-300 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canDelete}
            className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-colors
              bg-red-600 hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
          >
            {isDeleting ? t("deleting") : t("deleteTitle")}
          </button>
        </form>
      </div>

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 backdrop-blur-sm p-4"
          onClick={closeConfirmModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-delete-confirm-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-red-950/80 bg-gray-900 shadow-2xl shadow-red-950/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            <div className="px-6 py-5 border-b border-gray-800">
              <h3 id="account-delete-confirm-title" className="text-white font-semibold">
                {t("confirmTitle")}
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                {t("confirmBody")}
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-xs text-red-200">
                {t("confirmScope")}
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeConfirmModal}
                  disabled={isDeleting}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-4 text-sm font-semibold
                    text-gray-100 transition-colors hover:border-gray-600 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedDelete}
                  disabled={isDeleting}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold
                    text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                >
                  {isDeleting ? t("deleting") : t("confirmDelete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SettingsForm({ isConnected, hasProAccess, hasActiveSubscription, appConfigured }: Props) {
  const t = useTranslations("settingsForm");
  const th = useTranslations("historyPage");
  if (!hasProAccess) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent" />
          <div className="p-8 space-y-4">
            <div className="flex items-center gap-3">
              <svg className="text-fuchsia-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <h2 className="text-white font-semibold text-base">{t("privateRepoTitle")}</h2>
              <span className="text-xs font-medium text-fuchsia-400 bg-fuchsia-950/50 border border-fuchsia-800 px-2 py-0.5 rounded-full">
                {t("paidBadge")}
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              {t("privateRepoBody")}
            </p>
            <Link
              href="/pricing"
              className="block w-full py-3 rounded-lg text-sm font-semibold text-center cursor-pointer
                bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
                text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition-opacity"
            >
              {th("viewPacks")}
            </Link>
            <p className="text-gray-400 text-xs">
              {t("afterPurchase")}
            </p>
          </div>
        </div>
        <AccountDeletionSection hasActiveSubscription={hasActiveSubscription} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GithubAppSection isConnected={isConnected} appConfigured={appConfigured} />
      <AccountDeletionSection hasActiveSubscription={hasActiveSubscription} />
    </div>
  );
}

function GithubAppSection({ isConnected, appConfigured }: { isConnected: boolean; appConfigured: boolean }) {
  const t = useTranslations("settingsForm");
  return (
    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <div className="p-8 space-y-6">
        <div>
          <h2 className="text-white font-semibold text-base mb-1">{t("githubAppTitle")}</h2>
          <p className="text-gray-400 text-sm">
            {t("githubAppBody1")}
            <code className="text-cyan-400 bg-gray-800/80 px-1 py-0.5 rounded mx-1">Contents: Read-only</code>
            {t("githubAppBody2")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{t("currentStatus")}</span>
          {isConnected ? (
            <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded-full">
              {t("connected")}
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-400 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">
              {t("notConnected")}
            </span>
          )}
        </div>

        <div className="border border-cyan-900/50 bg-cyan-950/20 rounded-lg p-4 space-y-2">
          <p className="text-cyan-200 text-xs font-semibold leading-6">
            {t("installIntro")}
          </p>
          <ol className="list-decimal list-inside text-xs text-gray-300 space-y-1 leading-6">
            <li>{t("installStep1a")}<span className="text-gray-200">Only select repositories</span>{t("installStep1b")}<span className="text-gray-200">All repositories</span>{t("installStep1c")}</li>
            <li>{t("installStep2a")}<code className="text-cyan-400 bg-gray-800/80 px-1 py-0.5 rounded">Contents: Read-only</code>{t("installStep2b")}</li>
            <li>{t("installStep3")}</li>
          </ol>
          <p className="text-gray-400 text-xs leading-5">
            {t("revokeNote")}
          </p>
        </div>

        {appConfigured ? (
          // 遷移先は Route Handler で、GitHub の install URL へサーバー側リダイレクトする。
          // next/link にすると client 遷移になって外部リダイレクトが壊れるため素の <a> を使う。
          // ルートを [locale] 配下へ移してから、この href をページ扱いする誤検知が出るので抑制する。
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/api/github-app/install"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold
              bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
              text-white shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity"
          >
            {isConnected ? t("reconfigure") : t("connect")}
          </a>
        ) : (
          <div className="border border-amber-800/70 bg-amber-950/30 rounded-lg px-4 py-3 text-amber-200 text-xs leading-5">
            {t("notConfigured")}
          </div>
        )}

        <HomeLinkButton />
      </div>
    </div>
  );
}
