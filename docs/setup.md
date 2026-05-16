# Code Tweet セットアップ

## ローカル起動

```bash
npm install
npm run dev
```

起動後、http://localhost:3000 を開きます。

Chrome でローカルデバッグする場合は、既存プロファイル `DEBUG` を使います。

```bash
open -na "Google Chrome" --args --profile-directory="Profile 8" http://localhost:3000
```

## 環境変数

`.env.local` を作成します。サーバー専用キーに `NEXT_PUBLIC_` を付けないでください。

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

`GITHUB_PAT_ENCRYPTION_KEY` は 32 バイトの hex 文字列です。

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
| `NEXT_PUBLIC_APP_URL` | Stripe の戻り先 URL。未設定時は request origin を使用 | 任意 |
| `ADMIN_EMAILS` | `/admin` に入れる管理者メール。カンマ区切り可 | 任意 |
| `ADMIN_BASIC_USER` | 管理画面 Basic 認証ユーザー | 管理画面を使う場合必須 |
| `ADMIN_BASIC_PASSWORD` | 管理画面 Basic 認証パスワード | 管理画面を使う場合必須 |
| `ADMIN_TOTP_SECRET` | 管理画面 TOTP secret | 管理画面を使う場合必須 |
| `ADMIN_SESSION_SECRET` | 管理画面セッション署名 secret | 管理画面を使う場合必須 |
| `ADMIN_MAX_FAILED_ATTEMPTS` | 管理画面ログイン失敗上限。未設定時 10 | 任意 |
| `ADMIN_LOCKOUT_MINUTES` | 管理画面ロック時間。未設定時 30 | 任意 |

## 外部サービス

1. Supabase プロジェクトを作成し、Project URL、anon key、service role key を取得する。
2. Supabase Auth で GitHub Provider を有効化する。
3. GitHub OAuth App の callback URL に `https://<Project Ref>.supabase.co/auth/v1/callback` を設定する。
4. Supabase Redirect URLs に `http://localhost:3000/auth/callback` と本番 URL の `/auth/callback` を追加する。
5. Stripe で月額 980 円の Price を作成し、`STRIPE_PRICE_ID` に設定する。
6. Stripe Webhook に `/api/stripe/webhook` を登録し、署名 secret を `STRIPE_WEBHOOK_SECRET` に設定する。
7. Supabase SQL Editor で [database.sql](./database.sql) を適用する。利用制限、購読状態、GitHub 連携、管理画面ログインロック、生成履歴のテーブルと RLS を含む。

## リリース前コマンド

```bash
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

ログ検証が必要な場合は以下も実行します。

```bash
npm run verify:logs
```
