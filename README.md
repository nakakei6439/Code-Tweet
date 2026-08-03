# Code Tweet

README やプロジェクト説明を AI が分析し、X（旧 Twitter）向けのマーケティングポスト 5 件、note.com に貼り付けられる Markdown Draft 1 本、または App Store 提出用スクリーンショット（App SS）を生成する個人開発者向け Web アプリ。

- 本番 URL: https://code-tweet.vercel.app/
- ドキュメント索引: [docs/index.md](./docs/index.md)
- プロダクト概要: [docs/product.md](./docs/product.md)
- セットアップ: [docs/setup.md](./docs/setup.md)
- 運用メモ: [docs/operations.md](./docs/operations.md)
- 実装履歴: [docs/history.md](./docs/history.md)

## 現在の状態

本番稼働中。GitHub OAuth、README 取得、Code Tweet / note Draft / App SS のタブ式生成、利用制限、Stripe 課金、管理画面、Pro 向け生成履歴まで実装済みです。

UI は 8 言語（日本語 / 英語 / スペイン語 / 簡体字中国語 / 繁体字中国語 / フランス語 / ドイツ語 / 韓国語）に対応しています。

短期では新機能追加より、Pro 課金者数の増加、計測、軽微な導線改善を優先します。

## クイックスタート

```bash
npm install
npm run dev
```

ローカル起動後、http://localhost:3000 を開きます。環境変数、Supabase、Stripe、GitHub OAuth、SQL 適用の詳細は [docs/setup.md](./docs/setup.md) を参照してください。

## 主要仕様

### 生成モード

| モード | 出力 | 主な用途 |
|---|---|---|
| Code Tweet | X 向けポスト 5 件 | README から 1 週間分の告知ポストを作る |
| note Draft | note.com 向け Markdown Draft 1 本 | プロダクト紹介記事の下書きを作る |
| App SS | App Store 提出用スクリーンショット PNG 一括書き出し | README からストア掲載用のスクショ広告を作る |

- いずれも GitHub リポジトリ URL から README を取得できます。
- GitHub ログイン中はリポジトリ一覧から選択できます。
- 口調メモ、投稿・記事に載せる URL、ハッシュタグを任意指定できます（App SS はトーン指示のみ）。
- note Draft は短め、標準、長めの長さプリセットを選択できます。
- note Draft は「①コピー → ②noteエディタを開く → ③貼り付け」の手順を画面に明示し、本文コピーから note 新規記事ページのワンクリック起動までを案内します。
- 生成したポストは「Xで投稿」ボタンから、本文入りの X 投稿画面をワンクリックで開けます（共有リンク方式・ログイン不要）。
- App SS は見出しコピー・強調ワード・テーマ配色/背景装飾を AI が一括生成します。テーマは「AIにおまかせ」でアプリ専用の配色パレットを都度生成することもできます。
- App SS のレイアウトはヒーロー・デバイス上/下・2台重ね・コラージュ（2枚/3枚）・見出しのみの7種、配色テーマ 11 種、日本語フォント 9 種、背景装飾 5 種から選べます。取り込んだスクショはブラウザの IndexedDB にのみ保存され、サーバーへは送信されません。
- App SS は README を読み込んだ時点で、アプリ名・説明・主な機能を AI が推定してフォームに自動入力します（無料・回数消費なし）。
- App SS の見出しコピーは 8 言語から生成言語を選べます。選んだ言語の文字体系に合うフォント（簡体字・繁体字・韓国語用の Noto Sans/Serif）へ自動で切り替わります。1 デッキにつき 1 言語です。
- App SS の書き出し（透かし入り）・エディタ編集は無料・無制限です。透かしを外した書き出しのみ生成回数を1回消費します。
- 生成回数は Code Tweet・note Draft・App SS（コピー生成・透かし解除書き出し）で合算カウントされます。
- 画面表示は 8 言語に対応しています。日本語は従来どおり接頭辞なし（`/pricing`）、他言語は `/en/pricing` のようにパスが付きます。
- X ポストと App SS の見出しコピーは 8 言語で生成できます。X ポストは生成後に「この内容を他の言語でも作る」から言語を追加できます（翻訳ではなく、同じ README からその言語で書き直します）。クレジットは 4 言語ごとに 1 回分を消費します。note Draft の生成言語は日本語のみです。

### プランと制限

| 区分 | 生成回数 | README 文字数 | リポジトリ |
|---|---:|---:|---|
| ゲスト | 3 回まで | 1,000 文字 | 公開リポジトリ |
| 無料ログイン | 月 3 回 | 1,000 文字 | 公開リポジトリ、リポジトリ一覧選択 |
| クレジット購入者 | 月 3 回 + 購入クレジット | 10,000 文字 | 公開・非公開リポジトリ |

クレジットパックは単発課金（10回 ¥100 / 30回 ¥300 / 50回 ¥500 / 100回 ¥700、定義は `src/lib/creditPacks.ts`）。購入クレジットに有効期限はなく、毎月の無料枠を使い切ったあとに 1 回ずつ消費されます。ログインユーザーの無料枠は月初にリセットされます。ゲスト利用は IP ハッシュ単位の累計です。旧 Pro サブスク（月額 500 円・月 30 回）は新規販売を停止し、既存契約者のみ継続しています。

クレジット購入者・サブスク契約者の生成履歴は、Code Tweet の生成結果を最新 50 件まで保存します。

機能、保存方針、KPI、リスクは [docs/product.md](./docs/product.md) に集約しています。

## よく使うコマンド

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run lint` | ESLint 実行 |
| `npm run test` | Vitest 実行 |
| `npx tsc --noEmit` | TypeScript 検証 |
| `npm run build` | 本番ビルド |
| `npm run check:i18n` | 未訳の日本語と翻訳キー欠落の検出 |
| `npm run verify:logs` | JSON ログ形式の検証 |
| `git diff --check` | 空白エラー確認 |

## 技術構成

- Next.js App Router 16、React 19、TypeScript
- next-intl（UI の 8 言語対応。`localePrefix: "as-needed"`）
- Tailwind CSS v4
- Supabase Auth / Database / RLS
- Gemini API `gemini-2.5-flash`
- Stripe Checkout / Webhook / Customer Portal
- Vercel Analytics、Speed Insights、Microsoft Clarity

主な環境変数は `GEMINI_API_KEY`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`GITHUB_PAT_ENCRYPTION_KEY`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_PRICE_ID`、`NEXT_PUBLIC_APP_URL`、`NEXT_PUBLIC_CLARITY_PROJECT_ID`、管理画面用の `ADMIN_*` です。

## 作者

- Keita Nakagawa（中川景太）
- GitHub: [@nakakei6439](https://github.com/nakakei6439)
- X: [@nakakei6439](https://x.com/nakakei6439)
- Zenn: [@nakakei6439](https://zenn.dev/nakakei6439)
