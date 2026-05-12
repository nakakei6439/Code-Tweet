import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-900 bg-gray-950 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <p>Code Tweet はAI生成の下書きツールです。投稿前に内容を確認してください。</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/about" className="hover:text-gray-300 transition-colors">
            Code Tweet とは
          </Link>
          <Link href="/pricing" className="hover:text-gray-300 transition-colors">
            プラン
          </Link>
          <a
            href="https://github.com/nakakei6439/Code-Tweet"
            className="hover:text-gray-300 transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://x.com/nakakei6439"
            className="hover:text-gray-300 transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            問い合わせ
          </a>
        </nav>
      </div>
    </footer>
  );
}
