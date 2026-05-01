# STEP 8: V2 機能実装 — 概要・インデックス

## V1 との差分サマリー

| 項目 | V1 | V2（完了） |
|------|-----------|-----------|
| API キー | ユーザーが毎回入力 | サーバー管理（入力不要） ✅ |
| 入力方法 | テキスト手動コピペ | GitHub URL 貼り付けで README 自動取得 ✅ |
| ユーザー管理 | なし | Google ログイン ✅ |
| 推奨投稿日時 | なし | AI が自動生成してカードに表示 ✅ |
| 生成履歴 | なし | 保留（X の予約投稿で代替） |
| 検索 | なし | 保留 |

---

## 機能一覧と進捗

| 状態 | # | ファイル | 機能 |
|------|---|---------|------|
| ✅ 完了 | 1 | [v2-01-server-api-key.md](./v2-01-server-api-key.md) | サーバー管理 API キー |
| ✅ 完了 | 2 | [v2-02-github-url.md](./v2-02-github-url.md) | GitHub URL 連携 |
| ✅ 完了 | 3 | [v2-03-google-auth.md](./v2-03-google-auth.md) | ユーザー認証（Google ログイン） |
| 保留 | 4 | [v2-04-history.md](./v2-04-history.md) | ポスト保存・履歴 |
| 保留 | 5 | [v2-05-search.md](./v2-05-search.md) | 検索・フィルタ |

---

## 実装順序と依存関係

```
① サーバー管理 API キー ✅ 完了
        ↓
② GitHub URL 連携       ✅ 完了
        ↓
③ ユーザー認証          ✅ 完了
        ↓
④ ポスト保存・履歴      保留（X予約投稿で代替可能）
        ↓
⑤ 検索・フィルタ        保留（Feature 4 に依存）
```

---

## 全体完了基準チェックリスト

- [x] API キーの入力なしでポスト生成ができる
- [x] GitHub リポジトリ URL を貼り付けると README が自動取得される
- [x] 存在しない URL・private リポジトリで適切なエラーが表示される
- [x] Google アカウントでログイン・ログアウトができる
- [ ] ~~生成したポストを「保存する」ボタンで保存できる~~ ← 保留（X予約投稿で代替可能）
- [ ] ~~`/history` でログインユーザーの保存済みポストを一覧表示できる~~ ← 保留
- [ ] ~~未ログインでは `/history` にアクセスできない（リダイレクト）~~ ← 保留
- [x] 本番 URL（https://code-tweet.vercel.app/）で全機能が動作する

---

## トークン・シークレットの保存場所

**クライアント（ブラウザ）に秘密情報が渡ってはいけない。**

| トークン / キー | 保存場所 | アクセス可能な場所 | 備考 |
|---------------|---------|----------------|------|
| `GEMINI_API_KEY` | `.env.local` / Vercel 環境変数 | サーバーサイドのみ | `NEXT_PUBLIC_` を付けないこと |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` / Vercel 環境変数 | クライアント・サーバー両方 | anon キーなので公開 OK。RLS で保護 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` / Vercel 環境変数 | クライアント・サーバー両方 | 同上 |
| Supabase サービスロールキー | Vercel 環境変数のみ | サーバーサイドのみ | 絶対にクライアントに渡さない |
| ユーザーセッション（JWT） | httpOnly Cookie（`@supabase/ssr` が自動管理） | サーバーサイドのみ | XSS 対策 |
| `GITHUB_TOKEN`（オプション） | Vercel 環境変数のみ | サーバーサイドのみ | レート制限拡張が必要な場合のみ |

---

## 技術スタック追加分

| 役割 | 選定 | 追加タイミング |
|------|------|-------------|
| GitHub 連携 | GitHub REST API v3 | Feature 2 |
| 認証 + DB | Supabase Auth + Supabase DB | Feature 3 |
| Supabase SDK | `@supabase/supabase-js` + `@supabase/ssr` | Feature 3 |

---

## V2 完了後のロードマップ

| バージョン | 機能 | 備考 |
|-----------|------|------|
| V4 | 推奨投稿日時（AI 自動生成） | ✅ V2 内で実装済み |
| V5 | Claude API も選択可能に | 未着手 |
| V7 | Google AdSense 広告実装 | 未着手 |
| V8 | フリーミアム導入（無料：月3回 / 有料：無制限）・Stripe | 未着手 |
| V9 | Instagram・Threads など他 SNS 対応 | 未着手 |
