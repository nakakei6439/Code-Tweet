"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NoteDraft } from "@/types/note";

interface NoteCardProps {
  note: NoteDraft;
}

type ViewMode = "preview" | "source";

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return cleaned.length > 0 ? cleaned : "note-draft";
}

const markdownComponents: Components = {
  h1: (props) => <h1 className="text-2xl font-semibold text-white mt-6 mb-3" {...props} />,
  h2: (props) => <h2 className="text-xl font-semibold text-white mt-6 mb-2 border-b border-gray-800 pb-1" {...props} />,
  h3: (props) => <h3 className="text-lg font-semibold text-white mt-4 mb-2" {...props} />,
  h4: (props) => <h4 className="text-base font-semibold text-white mt-4 mb-2" {...props} />,
  p: (props) => <p className="text-gray-200 leading-7 my-3" {...props} />,
  ul: (props) => <ul className="list-disc list-outside pl-6 my-3 space-y-1 text-gray-200" {...props} />,
  ol: (props) => <ol className="list-decimal list-outside pl-6 my-3 space-y-1 text-gray-200" {...props} />,
  li: (props) => <li className="leading-7" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="border-l-4 border-cyan-500/50 bg-cyan-500/5 pl-4 py-2 my-3 text-gray-300"
      {...props}
    />
  ),
  a: ({ href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-semibold text-white" {...props} />,
  em: (props) => <em className="italic text-gray-200" {...props} />,
  hr: (props) => <hr className="border-gray-800 my-6" {...props} />,
  code: ({ className, children, ...rest }) => {
    const isBlock = typeof className === "string" && className.startsWith("language-");
    if (isBlock) {
      return (
        <code className={`${className} text-gray-100 text-xs`} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code className="bg-gray-800 text-cyan-300 px-1.5 py-0.5 rounded text-xs" {...rest}>
        {children}
      </code>
    );
  },
  pre: (props) => (
    <pre
      className="bg-gray-950/80 border border-gray-800 rounded-lg p-4 my-3 overflow-x-auto text-xs leading-6"
      {...props}
    />
  ),
  table: (props) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full text-sm text-gray-200 border border-gray-800" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-gray-800/60 text-gray-300" {...props} />,
  th: (props) => <th className="px-3 py-2 text-left font-semibold border-b border-gray-800" {...props} />,
  td: (props) => <td className="px-3 py-2 border-b border-gray-900" {...props} />,
};

export default function NoteCard({ note }: NoteCardProps) {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [mode, setMode] = useState<ViewMode>("preview");

  const fullMarkdown = `# ${note.title}\n\n${note.markdown}\n`;

  async function handleCopyTitle() {
    await navigator.clipboard.writeText(note.title);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  }

  async function handleCopyBody() {
    await navigator.clipboard.writeText(note.markdown);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([fullMarkdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(note.title)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function tabClass(active: boolean) {
    return active
      ? "text-white border-cyan-500"
      : "text-gray-400 border-transparent hover:text-gray-200";
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="mb-4 rounded-lg border border-gray-700 bg-gray-950/60 px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-semibold">
            TITLE
          </span>
        </div>
        <h2 className="text-white text-lg sm:text-xl font-semibold leading-snug break-words">
          {note.title}
        </h2>
      </div>

      {note.recommendedTimes.length > 0 && (
        <div className="mb-4 rounded-lg border border-gray-700 bg-gray-950/60 px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4 shrink-0 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 6v6l4 2" />
            </svg>
            <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-semibold">
              おすすめ投稿時間
            </span>
          </div>
          <ul className="space-y-2">
            {note.recommendedTimes.map((time, i) => (
              <li key={i} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex shrink-0 rounded-md border border-cyan-800/60 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                    {time.category}
                  </span>
                  <span className="text-sm font-medium text-gray-200 tabular-nums">{time.label}</span>
                </div>
                <span className="text-xs text-gray-400 leading-5">{time.reason}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] text-gray-500 leading-4">
            note の「予約投稿」で上の日時を指定すると、ねらった時間に自動公開できます。
          </p>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("preview")}
            aria-pressed={mode === "preview"}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tabClass(mode === "preview")}`}
          >
            プレビュー
          </button>
          <button
            type="button"
            onClick={() => setMode("source")}
            aria-pressed={mode === "source"}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tabClass(mode === "source")}`}
          >
            Markdown
          </button>
        </div>
        <span className="shrink-0 text-gray-400 text-xs tabular-nums pr-1">
          本文 {note.charCount.toLocaleString("ja-JP")}字
        </span>
      </div>

      {mode === "preview" ? (
        <article className="bg-gray-950/40 border border-gray-800 rounded-lg p-5 max-h-[32rem] overflow-y-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {note.markdown}
          </ReactMarkdown>
        </article>
      ) : (
        <pre className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-gray-950/60 border border-gray-800 rounded-lg p-4 max-h-[32rem] overflow-y-auto">
          {note.markdown}
        </pre>
      )}

      <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950/40 p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-gray-400">
          <span className="font-semibold text-gray-300">投稿の手順</span>
          <span className="text-gray-600">①コピー → ②noteエディタを開く → ③貼り付け</span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-cyan-400">①</span>
          <button
            onClick={handleCopyBody}
            aria-live="polite"
            className={
              copiedBody
                ? "border border-green-500 text-green-400 text-xs px-3 py-1 rounded-md"
                : "border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 text-xs px-3 py-1 rounded-md transition-colors cursor-pointer"
            }
          >
            {copiedBody ? "コピーしました ✓" : "本文をコピー"}
          </button>
          <button
            onClick={handleCopyTitle}
            aria-live="polite"
            className={
              copiedTitle
                ? "border border-green-500 text-green-400 text-xs px-3 py-1 rounded-md"
                : "border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 text-xs px-3 py-1 rounded-md transition-colors cursor-pointer"
            }
          >
            {copiedTitle ? "コピーしました ✓" : "タイトルをコピー"}
          </button>
          <button
            onClick={handleDownload}
            className="border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white text-xs px-3 py-1 rounded-md transition-colors cursor-pointer"
          >
            .md ダウンロード
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-cyan-400">②</span>
          <a
            href="https://note.com/notes/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold text-sm px-4 py-2 rounded-md transition-colors"
          >
            noteエディタを開く
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5l-9 9M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
            </svg>
          </a>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500 leading-5">
        ③ noteエディタに貼り付けると、見出し・リスト・引用などのMarkdown記法は自動でリッチテキストに変換されます。タイトル欄には、上の「TITLE」からコピーした見出しを別途貼り付けてください。
      </p>
    </div>
  );
}
