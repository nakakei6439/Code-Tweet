# Code Tweet

README やプロジェクト説明を AI が分析し、X（旧 Twitter）向けのマーケティングポスト 5 件、または note.com に貼り付けられる Markdown Draft 1 本を生成する個人開発者向け Web アプリ。

- 本番 URL: https://code-tweet.vercel.app/
- ドキュメント索引: [docs/index.md](./docs/index.md)
- プロダクト概要: [docs/product.md](./docs/product.md)
- セットアップ: [docs/setup.md](./docs/setup.md)
- 運用メモ: [docs/operations.md](./docs/operations.md)
- 実装履歴: [docs/history.md](./docs/history.md)

## 現在の状態

本番稼働中。GitHub OAuth、README 取得、Code Tweet / note Draft のタブ式生成、利用制限、Stripe 課金、管理画面、Pro 向け生成履歴まで実装済みです。

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

- どちらも GitHub リポジトリ URL から README を取得できます。
- GitHub ログイン中はリポジトリ一覧から選択できます。
- 口調メモ、投稿・記事に載せる URL、ハッシュタグを任意指定できます。
- note Draft は短め、標準、長めの長さプリセットを選択できます。
- 生成回数は Code Tweet と note Draft で合算カウントされます。

### プランと制限

| 区分 | 生成回数 | README 文字数 | リポジトリ |
|---|---:|---:|---|
| ゲスト | 3 回まで | 1,000 文字 | 公開リポジトリ |
| 無料ログイン | 月 3 回 | 1,000 文字 | 公開リポジトリ、リポジトリ一覧選択 |
| Pro | 月 30 回 | 10,000 文字 | 公開・非公開リポジトリ |

Pro は月額 980 円。ログインユーザーの生成回数は月初にリセットされます。ゲスト利用は IP ハッシュ単位の累計です。

Pro ユーザーの生成履歴は、Code Tweet の生成結果を最新 50 件まで保存します。

機能、保存方針、KPI、リスクは [docs/product.md](./docs/product.md) に集約しています。

## よく使うコマンド

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run lint` | ESLint 実行 |
| `npm run test` | Vitest 実行 |
| `npx tsc --noEmit` | TypeScript 検証 |
| `npm run build` | 本番ビルド |
| `npm run verify:logs` | JSON ログ形式の検証 |
| `git diff --check` | 空白エラー確認 |

## 技術構成

- Next.js App Router 16、React 19、TypeScript
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
