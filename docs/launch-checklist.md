# 公開前チェックリスト

一般公開前に確認する項目。

## 環境変数

| 変数 | 確認内容 |
|---|---|
| `GEMINI_API_KEY` | Gemini API でポスト生成できる |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase の Project URL が入っている |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon public key が入っている |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側の利用回数記録に使える |
| `GITHUB_PAT_ENCRYPTION_KEY` | 32バイトのhex文字列で、OAuthトークン暗号化に使える |

## 外部サービス

| 項目 | 確認内容 |
|---|---|
| Supabase Auth | GitHub Provider が有効 |
| GitHub OAuth App | Supabase の callback URL が設定済み |
| Supabase Redirect URLs | `http://localhost:3000/auth/callback` と本番URLが設定済み |
| Supabase Tables | `usage_logs`, `ip_usage_logs`, `subscriptions`, `user_tokens` が作成済み |
| Vercel | 本番環境変数が `.env.local` と同等に設定済み |

## 手動確認

| 画面 | 確認内容 |
|---|---|
| `/` | 未ログインで月3回案内、フォーム、GitHubログイン導線が見える |
| `/about` | 初見でも何ができるか短時間で分かる |
| `/pricing` | Proが準備中であり、決済できるように見えすぎない |
| `/settings` | 未ログイン時にログイン案内が出る |
| 生成 | テキスト直接入力で5件生成できる |
| GitHub連携 | 公開リポジトリURLからREADME取得できる |
| レスポンシブ | スマホ幅でヘッダー、フォーム、生成カードが崩れない |

## リリース前コマンド

```bash
npm run lint
npm run build
```
