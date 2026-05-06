"use client";

import { useEffect, useMemo, useState } from "react";
import type { RepoItem } from "@/app/api/repos/route";

type Props = {
  isOpen: boolean;
  isLoading: boolean;
  repos: RepoItem[] | null;
  error: string | null;
  onClose: () => void;
  onSelect: (htmlUrl: string) => void;
};

export default function RepoSelectorModal({ isOpen, isLoading, repos, error, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    if (!repos) return [];
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    );
  }, [repos, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden w-full max-w-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">自分のリポジトリから選ぶ</h3>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-800">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="リポジトリ名・説明で検索"
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <p className="text-gray-400 text-sm text-center py-12">読み込み中...</p>
          )}
          {error && (
            <p className="text-red-400 text-sm text-center py-12">{error}</p>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-12">
              {query ? "該当するリポジトリがありません" : "リポジトリが見つかりません"}
            </p>
          )}
          {!isLoading && !error && filtered.length > 0 && (
            <ul className="divide-y divide-gray-800">
              {filtered.map((r) => (
                <li key={r.full_name}>
                  <button
                    onClick={() => {
                      onSelect(r.html_url);
                      onClose();
                    }}
                    className="w-full text-left px-6 py-3 hover:bg-gray-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{r.full_name}</span>
                      {r.private && (
                        <span className="shrink-0 text-[10px] font-medium text-amber-400 bg-amber-950/50 border border-amber-800 px-1.5 py-0.5 rounded">
                          Private
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{r.description}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
