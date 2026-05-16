# Code Tweet

README やプロジェクト説明を AI が分析し、X（旧 Twitter）向けのマーケティングポストを 5 件生成する個人開発者向け Web アプリ。

- 本番 URL: https://code-tweet.vercel.app/
- ドキュメント索引: [`docs/index.md`](./docs/index.md)
- セットアップ: [`docs/setup.md`](./docs/setup.md)
- 運用メモ: [`docs/operations.md`](./docs/operations.md)

## 主な機能

- GitHub リポジトリ URL から README を取得
- テキスト直接入力で README や機能説明を貼り付け
- 紹介、使い方、ユースケース、共感、CTA の流れで 5 件生成
- 口調メモ、URL、ハッシュタグの任意指定
- App Store / Google Play / GitHub / Web URL のリード文を自動付与
- 関連ハッシュタグを最大 5 件まで補完
- 各ポストの推奨投稿日時と理由を提案
- `twitter-text` による X の 280 weighted length チェックと自動短縮
- GitHub OAuth ログイン、リポジトリ一覧選択、残り回数表示
- Pro ユーザー向けの生成履歴保存・削除（README本文は保存しない）
- Pro プランでプライベートリポジトリ対応
- Stripe Checkout / Webhook / Customer Portal による Pro 課金
- 管理画面で利用状況、プラン変更、ゲスト利用回数リセットを操作
- `/terms`、`/privacy`、`/contact`、`/about` を提供

## プランと制限

| 区分 | 生成回数 | README 文字数 | リポジトリ |
|---|---:|---:|---|
| ゲスト | 3 回まで | 1,000 文字 | 公開リポジトリ |
| 無料ログイン | 月 3 回 | 1,000 文字 | 公開リポジトリ、リポジトリ一覧選択 |
| Pro | 月 30 回 | 10,000 文字 | 公開・非公開リポジトリ |

Pro は月額 980 円。生成回数はログインユーザー単位で月初にリセットされる。ゲスト利用は IP ハッシュ単位の累計。

## 技術スタック

| 役割 | 採用 |
|---|---|
| フレームワーク | Next.js 16 App Router |
| UI | React 19 / TypeScript / Tailwind CSS v4 |
| AI | Gemini API `gemini-2.5-flash` / `@google/genai` |
| 認証 | Supabase Auth + GitHub OAuth |
| DB | Supabase |
| 決済 | Stripe Checkout / Webhook / Customer Portal |
| 文字数計算 | `twitter-text` |
| ホスティング | Vercel |

## セットアップ

```bash
npm install
npm run dev
```

ローカル起動後、http://localhost:3000 を開く。

## 環境変数

`.env.local` を作成する。

```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
GITHUB_PAT_ENCRYPTION_KEY=your_32byte_hex_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAILS=you@example.com
ADMIN_BASIC_USER=admin
ADMIN_BASIC_PASSWORD=strong_password
ADMIN_TOTP_SECRET=base32_totp_secret
ADMIN_SESSION_SECRET=random_session_secret
ADMIN_MAX_FAILED_ATTEMPTS=10
ADMIN_LOCKOUT_MINUTES=30
```

`GITHUB_PAT_ENCRYPTION_KEY` は 32 バイトの hex 文字列。

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| 変数名 | 用途 | 必須 |
|---|---|---|
| `GEMINI_API_KEY` | Gemini API キー | 必須 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | 必須 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key | 必須 |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側 DB 操作、利用ログ、管理処理 | 必須 |
| `GITHUB_PAT_ENCRYPTION_KEY` | GitHub OAuth token / PAT の暗号化 | 必須 |
| `STRIPE_SECRET_KEY` | Stripe API | 必須 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 署名検証 | 必須 |
| `STRIPE_PRICE_ID` | Pro プランの Price ID | 必須 |
| `NEXT_PUBLIC_APP_URL` | Stripe の戻り先 URL。未設定時はリクエスト origin を使用 | 任意 |
| `ADMIN_EMAILS` | `/admin` に入れる管理者メール。カンマ区切り可 | 任意 |
| `ADMIN_BASIC_USER` | 管理画面 Basic 認証ユーザー | 管理画面を使う場合必須 |
| `ADMIN_BASIC_PASSWORD` | 管理画面 Basic 認証パスワード | 管理画面を使う場合必須 |
| `ADMIN_TOTP_SECRET` | 管理画面 TOTP 検証用 secret | 管理画面を使う場合必須 |
| `ADMIN_SESSION_SECRET` | 管理画面セッション署名 secret | 管理画面を使う場合必須 |
| `ADMIN_MAX_FAILED_ATTEMPTS` | 管理画面ログイン失敗上限。未設定時 10 | 任意 |
| `ADMIN_LOCKOUT_MINUTES` | 管理画面ロック時間。未設定時 30 | 任意 |

サーバー専用キーに `NEXT_PUBLIC_` を付けないこと。`NEXT_PUBLIC_` が付く値はブラウザに公開される。

## 外部サービス設定

1. Supabase プロジェクトを作成し、Project URL / anon key / service role key を取得する。
2. Supabase Auth で GitHub Provider を有効化する。
3. GitHub OAuth App の callback URL に `https://<Project Ref>.supabase.co/auth/v1/callback` を設定する。
4. Supabase の Redirect URLs に `http://localhost:3000/auth/callback` と本番 URL の `/auth/callback` を追加する。
5. Stripe で月額 980 円の Price を作成し、`STRIPE_PRICE_ID` に設定する。
6. Stripe Webhook に `/api/stripe/webhook` を登録し、署名 secret を `STRIPE_WEBHOOK_SECRET` に設定する。

Supabase の SQL は [`docs/database.sql`](./docs/database.sql) に集約している。利用制限、購読状態、GitHub 連携、管理画面ログインロック、生成履歴を fresh project に適用できる。

## 使い方

1. GitHub リポジトリ URL を入力して README を取得する、または説明文を直接貼り付ける。
2. 必要に応じて口調メモ、URL、ハッシュタグを入力する。
3. 「ポストを生成する」を押す。
4. 生成された 5 件をコピーし、推奨日時を参考に投稿する。
5. 上限を増やす場合は GitHub でログインし、必要に応じて Pro にアップグレードする。

## 主要構成

```text
src/
  app/
    api/generate/route.ts          # Gemini 生成、制限チェック
    api/github/route.ts            # README 取得
    api/repos/route.ts             # GitHub リポジトリ一覧
    api/tokens/route.ts            # Pro 向け PAT 登録・削除
    api/stripe/*                   # Checkout / Portal / Webhook
    auth/callback/route.ts         # GitHub OAuth callback
    admin/                         # 管理画面
    pricing/page.tsx               # 料金表
    settings/page.tsx              # プラン、PAT、アカウント削除
  components/
    GenerateForm.tsx               # 生成フォーム
    RepoSelectorModal.tsx          # リポジトリ選択
    Header.tsx / HeaderActions.tsx # ナビゲーション
  lib/
    gemini.ts                      # プロンプト、生成、短縮
    rateLimit.ts                   # 利用制限
    usage.ts                       # 残り回数
    stripe.ts                      # Stripe helper
    adminSecurity.ts               # 管理画面認証
    supabase/                      # Supabase clients
  proxy.ts                         # Supabase セッション更新
```

`src/proxy.ts` は Next.js 16 の proxy。全画面・API リクエストで Supabase の cookie を更新する。

## スクリプト

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm start` | 本番ビルドの起動 |
| `npm run lint` | ESLint 実行 |

## 現在の状態

本番稼働中。Vercel デプロイ、GitHub OAuth、利用制限、Pro プラン、Stripe 課金、管理画面、生成履歴まで実装済み。今後の拡張候補は Claude API 選択、他 SNS 対応、エラー監視。

詳細な変更履歴は [`docs/history.md`](./docs/history.md) を参照。

## 作者

- Keita Nakagawa（中川景太）
- GitHub: [@nakakei6439](https://github.com/nakakei6439)
- X: [@nakakei6439](https://x.com/nakakei6439)
- Zenn: [@nakakei6439](https://zenn.dev/nakakei6439)
