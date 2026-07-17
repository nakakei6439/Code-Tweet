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
| `STRIPE_SECRET_KEY` | Stripe API（クレジットパック販売・既存サブスク） | 必須 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 署名検証 | 必須 |
| `STRIPE_PRICE_ID` | 旧 Pro プランの Price ID（既存契約者の維持用。新規販売は停止） | 必須 |
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
4. Supabase の `Authentication > URL Configuration` で Redirect URLs に `http://localhost:3000/auth/callback` と `https://code-tweet.vercel.app/auth/callback` を追加する。`/auth/callback` まで含める必要があり、トップ URL だけではローカルログインが本番トップへ戻ることがある。
5. Stripe で月額 500 円の Price を作成し、`STRIPE_PRICE_ID` に設定する（旧 Pro プラン。既存契約者の維持用）。クレジットパックは `src/lib/creditPacks.ts` の定数から `price_data` をインライン指定するため、Stripe 側での商品作成は不要。
6. Stripe Webhook に `/api/stripe/webhook` を登録し、署名 secret を `STRIPE_WEBHOOK_SECRET` に設定する。購読イベントに `checkout.session.completed` と `customer.subscription.*` を含める（クレジット付与も同じ `checkout.session.completed` を使う）。
7. Supabase SQL Editor で [database.sql](./database.sql) を適用する。利用制限、購読状態、クレジット残高（`user_credits` / `credit_grants` / RPC 関数）、GitHub 連携、管理画面ログインロック、生成履歴のテーブルと RLS を含む。

## クレジットパック（単発課金）

- パック定義（回数・金額）は `src/lib/creditPacks.ts` に集約。変更はこのファイルだけでよい。
- 購入 → `/api/stripe/credits` が `mode: "payment"` の Checkout Session を作成 → webhook の `checkout.session.completed` で `grant_credits` RPC が残高に加算する。`credit_grants.stripe_event_id`（主キー）が冪等性ガードで、リトライ再送でも二重付与されない。
- 消費は生成成功時のみ。毎月の無料枠（free 3回 / 旧 Pro 契約者 30回）を使い切ったあとに 1 回ずつ `consume_credit` RPC で減算する。
- クレジット残高が 1 以上あるユーザーは旧 Pro 特典（README 10,000 文字・生成履歴・プライベートリポジトリ）を利用できる。`ADMIN_EMAILS` の管理者は無課金で常に Pro 相当。

### ローカルで webhook を試す（stripe listen）

```bash
stripe login                                  # 初回のみ
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

表示される `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に一時設定して `npm run dev` を再起動する。
Test モードのキー（`sk_test_...`）とテストカード `4242 4242 4242 4242` で購入し、Supabase の `user_credits.balance` と `credit_grants` を確認する。
冪等性は `stripe events resend <event_id>` で同一イベントを再送し、残高が増えないことで確認できる。
検証後は `.env.local` を元に戻す（`subscriptions` テーブルに Test モードの customer が残ると本番で No such customer エラーになるため掃除する）。

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
