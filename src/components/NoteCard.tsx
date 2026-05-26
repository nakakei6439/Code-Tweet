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
  const [copiedFull, setCopiedFull] = useState(false);
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

  async function handleCopyFullMarkdown() {
    await navigator.clipboard.writeText(fullMarkdown);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-semibold">
            TITLE
          </span>
          <button
            type="button"
            onClick={handleCopyTitle}
            aria-label="タイトルをコピー"
            aria-live="polite"
            className={
              copiedTitle
                ? "shrink-0 inline-flex items-center gap-1 border border-green-500 text-green-400 text-[10px] px-2 py-0.5 rounded-md"
                : "shrink-0 inline-flex items-center gap-1 border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white text-[10px] px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            }
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            {copiedTitle ? "✓" : "コピー"}
          </button>
        </div>
        <h2 className="text-white text-lg sm:text-xl font-semibold leading-snug break-words">
          {note.title}
        </h2>
      </div>

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

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <a
          href="https://note.com/notes/new"
          target="_blank"
          rel="noreferrer"
          className="border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white text-xs px-3 py-1 rounded-md transition-colors"
        >
          noteエディタを開く
        </a>
        <button
          onClick={handleDownload}
          className="border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white text-xs px-3 py-1 rounded-md transition-colors cursor-pointer"
        >
          .md ダウンロード
        </button>
        <button
          onClick={handleCopyFullMarkdown}
          aria-live="polite"
          className={
            copiedFull
              ? "border border-green-500 text-green-400 text-xs px-3 py-1 rounded-md"
              : "border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 text-xs px-3 py-1 rounded-md transition-colors cursor-pointer"
          }
        >
          {copiedFull ? "コピーしました ✓" : "Markdownコピー"}
        </button>
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
      </div>
      <p className="mt-3 text-xs text-gray-500 leading-5">
        noteエディタに貼り付けると、見出し・リスト・引用などのMarkdown記法は自動でリッチテキストに変換されます。タイトル欄には上の見出しを別途コピーしてください。
      </p>
    </div>
  );
}
