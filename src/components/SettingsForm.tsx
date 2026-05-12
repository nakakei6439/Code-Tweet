"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import HomeLinkButton from "@/components/HomeLinkButton";

type Props = {
  hasToken: boolean;
  isPaid: boolean;
};

function AccountDeletionSection() {
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = confirmation === "DELETE" && !isDeleting;

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
        setError(data?.error ?? "アカウントの削除に失敗しました。時間をおいて再度お試しください。");
        setIsDeleting(false);
        setIsConfirmOpen(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("アカウントの削除に失敗しました。通信環境を確認して再度お試しください。");
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
            <h2 className="text-white font-semibold text-base mb-1">アカウントを削除</h2>
            <p className="text-gray-400 text-sm">
              アカウント、GitHub 連携情報、利用履歴、プラン情報を削除します。この操作は取り消せません。
            </p>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-gray-300 mb-2">
              削除するには DELETE と入力してください
            </span>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={isDeleting}
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
            {isDeleting ? "削除中..." : "アカウントを削除"}
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
                本当にアカウントを削除しますか？
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                これは誤操作を防ぐための最終確認です。削除を実行すると、アカウント情報と関連データは復元できません。
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-xs text-red-200">
                対象: アカウント、GitHub 連携情報、利用履歴、プラン情報
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeConfirmModal}
                  disabled={isDeleting}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-4 text-sm font-semibold
                    text-gray-100 transition-colors hover:border-gray-600 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedDelete}
                  disabled={isDeleting}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold
                    text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                >
                  {isDeleting ? "削除中..." : "削除を実行"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SettingsForm({ hasToken, isPaid }: Props) {
  if (!isPaid) {
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
              <h2 className="text-white font-semibold text-base">プライベートリポジトリ対応</h2>
              <span className="text-xs font-medium text-fuchsia-400 bg-fuchsia-950/50 border border-fuchsia-800 px-2 py-0.5 rounded-full">
                Pro（準備中）
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Pro プラン（¥980 / 月）は準備中です。公開後は、GitHub 連携で取得した非公開リポジトリの README も
              自動取得でき、リポジトリ一覧から選んで生成できる予定です。
            </p>
            <Link
              href="/pricing"
              className="block w-full py-3 rounded-lg text-sm font-semibold text-center cursor-pointer
                bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
                text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition-opacity"
            >
              Pro プランを見る
            </Link>
            <p className="text-gray-400 text-xs">
              ※ Pro プランの決済機能は近日公開予定です。
            </p>
          </div>
        </div>
        <AccountDeletionSection />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        <div className="p-8 space-y-5">
          <div>
            <h2 className="text-white font-semibold text-base mb-1">GitHub 連携</h2>
            <p className="text-gray-400 text-sm">
              GitHub ログイン時に取得したアクセストークンを暗号化して保存しています。
              プライベートリポジトリの README 取得とリポジトリ一覧表示に使用されます。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">連携状態：</span>
            {hasToken ? (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                連携済み
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full">
                再ログインが必要
              </span>
            )}
          </div>

          {!hasToken && (
            <div className="border border-amber-800/50 bg-amber-950/30 rounded-lg px-4 py-3 text-amber-300 text-xs">
              GitHub アクセストークンが保存されていません。一度ログアウトして GitHub で再ログインしてください。
            </div>
          )}

          <HomeLinkButton />
        </div>
      </div>
      <AccountDeletionSection />
    </div>
  );
}
