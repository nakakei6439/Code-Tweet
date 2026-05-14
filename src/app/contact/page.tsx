import type { Metadata } from "next";
import StripePortalCard from "@/components/StripePortalCard";

export const metadata: Metadata = {
  title: "問い合わせ",
  description: "Code Tweet への問い合わせ先と解約手続きを案内します。",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          Contact
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          問い合わせ
        </h1>
        <p className="mt-6 text-sm leading-7 text-gray-400">
          不具合報告、要望、利用に関する相談は、以下の窓口から連絡してください。現時点では問い合わせフォームは用意せず、X と GitHub を窓口として運用しています。
        </p>

        <hr className="my-12 border-gray-800" />

        <div className="space-y-4">
          <StripePortalCard />
          <a
            href="https://x.com/nakakei6439"
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-gray-800 bg-gray-900/70 p-5 transition-colors hover:border-gray-700 hover:bg-gray-900"
          >
            <p className="text-sm font-semibold text-white">X で問い合わせる</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              急ぎの連絡や簡単な相談はこちらからお願いします。
            </p>
          </a>
          <a
            href="https://github.com/nakakei6439/Code-Tweet"
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-gray-800 bg-gray-900/70 p-5 transition-colors hover:border-gray-700 hover:bg-gray-900"
          >
            <p className="text-sm font-semibold text-white">GitHub を見る</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              リポジトリ、実装状況、Issue などを確認できます。
            </p>
          </a>
        </div>
      </article>
    </main>
  );
}
