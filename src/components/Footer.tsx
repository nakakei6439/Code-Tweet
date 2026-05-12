import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-900 bg-gray-950 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <p>Code Tweet はAI生成の下書きツールです。投稿前に内容を確認してください。</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/terms" className="hover:text-gray-300 transition-colors">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/contact" className="hover:text-gray-300 transition-colors">
            問い合わせ
          </Link>
        </nav>
      </div>
    </footer>
  );
}
