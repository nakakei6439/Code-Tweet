import Link from "next/link";

export default function PatGuidePage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-gray-400 text-sm hover:text-white transition-colors mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          設定に戻る
        </Link>

        <h1 className="text-white text-2xl font-bold mb-2">GitHub PAT の取得方法</h1>
        <p className="text-gray-400 text-sm mb-10">
          プライベートリポジトリを使うには、GitHub の Personal Access Token（PAT）が必要です。
        </p>

        <div className="space-y-4">
          {[
            {
              step: 1,
              title: "GitHub の設定を開く",
              desc: "GitHub にログインし、右上のアイコン → Settings をクリック",
            },
            {
              step: 2,
              title: "Developer settings を開く",
              desc: "左サイドバーの一番下にある「Developer settings」をクリック",
            },
            {
              step: 3,
              title: "Personal access tokens を選ぶ",
              desc: "「Personal access tokens」→「Tokens (classic)」をクリック",
            },
            {
              step: 4,
              title: "新しいトークンを生成",
              desc: "「Generate new token」→「Generate new token (classic)」をクリック",
            },
            {
              step: 5,
              title: "設定を入力",
              desc: (
                <span>
                  Note に任意の名前（例：<code className="text-cyan-400 bg-gray-800 px-1 rounded text-xs">code-tweet</code>）を入力。
                  Expiration は任意。
                </span>
              ),
            },
            {
              step: 6,
              title: "repo スコープにチェック",
              desc: (
                <span>
                  「<code className="text-cyan-400 bg-gray-800 px-1 rounded text-xs">repo</code>」にチェックを入れる。
                  これがないとプライベートリポジトリにアクセスできません。
                </span>
              ),
            },
            {
              step: 7,
              title: "Generate token をクリック",
              desc: "ページ下部の「Generate token」ボタンをクリック",
            },
            {
              step: 8,
              title: "トークンをコピー",
              desc: (
                <span>
                  <code className="text-cyan-400 bg-gray-800 px-1 rounded text-xs">ghp_</code> から始まる文字列が表示されます。
                  この画面を閉じると二度と見られないので、すぐコピーしてください。
                </span>
              ),
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold">
                {step}
              </div>
              <div>
                <p className="text-white text-sm font-medium mb-1">{title}</p>
                <p className="text-gray-400 text-sm">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-amber-950/40 border border-amber-800/50 rounded-xl p-5">
          <p className="text-amber-400 text-sm font-medium mb-1">トークンをコピーしたら</p>
          <p className="text-amber-600 text-sm">設定ページの入力欄に貼り付けて「保存」してください。</p>
        </div>

        <Link
          href="/settings"
          className="mt-8 flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold
            bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
            text-white shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity"
        >
          設定ページに戻って PAT を登録する
        </Link>
      </div>
    </main>
  );
}
