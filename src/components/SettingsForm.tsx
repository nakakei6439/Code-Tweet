"use client";

import Link from "next/link";

type Props = {
  hasToken: boolean;
  isPaid: boolean;
};

export default function SettingsForm({ hasToken, isPaid }: Props) {
  if (!isPaid) {
    return (
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
              Pro 限定
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Pro プラン（月 980 円）では、GitHub 連携で取得した非公開リポジトリの README も
            自動取得できます。リポジトリ一覧から選んで生成も可能になります。
          </p>
          <Link
            href="/pricing"
            className="block w-full py-3 rounded-lg text-sm font-semibold text-center cursor-pointer
              bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
              text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition-opacity"
          >
            Pro プランへアップグレード
          </Link>
          <p className="text-gray-500 text-xs">
            ※ Pro プランの決済機能は近日公開予定です。
          </p>
        </div>
      </div>
    );
  }

  return (
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

        <Link
          href="/"
          className="block w-full py-3 rounded-lg text-sm font-semibold text-center cursor-pointer
            bg-gradient-to-r from-cyan-500 to-fuchsia-500
            text-white shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity"
        >
          ホームへ戻る
        </Link>
      </div>
    </div>
  );
}
