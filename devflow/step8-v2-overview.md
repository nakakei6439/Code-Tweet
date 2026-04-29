# STEP 8: V2 機能実装 — 概要・インデックス

## V1 との差分サマリー

| 項目 | V1（現状） | V2（目標） |
|------|-----------|-----------|
| API キー | ユーザーが毎回入力 | サーバー管理（入力不要） |
| 入力方法 | テキスト手動コピペ | GitHub URL 貼り付けで README 自動取得 |
| ユーザー管理 | なし | Google ログイン |
| 生成履歴 | なし | 保存・閲覧可能 |
| 検索 | なし | 保存済みポストを検索 |

---

## 機能一覧と進捗

| 状態 | # | ファイル | 機能 |
|------|---|---------|------|
| ✅ 完了 | 1 | [step8-feature1-api-key.md](./step8-feature1-api-key.md) | サーバー管理 API キー |
| ✅ 完了 | 2 | [step8-feature2-github.md](./step8-feature2-github.md) | GitHub URL 連携 |
| ✅ 完了 | 3 | [step8-feature3-auth.md](./step8-feature3-auth.md) | ユーザー認証（Google ログイン） |
| 未着手 | 4 | [step8-feature4-history.md](./step8-feature4-history.md) | ポスト保存・履歴 |
| 未着手 | 5 | [step8-feature5-search.md](./step8-feature5-search.md) | 検索・フィルタ |

---

## 実装順序と依存関係

```
① サーバー管理 API キー ✅   ← 独立。完了済み
        ↓
② GitHub URL 連携            ← 独立。Feature 1 完了後に着手可能
        ↓
③ ユーザー認証               ← Feature 4・5 の前提
        ↓
④ ポスト保存・履歴           ← Feature 3（認証）が必要
        ↓
⑤ 検索・フィルタ             ← Feature 4（保存データ）が必要
```

Feature 1・2 は互いに独立しているため並行実装可能。

---

## 全体完了基準チェックリスト

- [x] API キーの入力なしでポスト生成ができる
- [x] GitHub リポジトリ URL を貼り付けると README が自動取得される
- [x] 存在しない URL・private リポジトリで適切なエラーが表示される
- [x] Google アカウントでログイン・ログアウトができる
- [ ] 生成したポストを「保存する」ボタンで保存できる
- [ ] `/history` でログインユーザーの保存済みポストを一覧表示できる
- [ ] 未ログインでは `/history` にアクセスできない（リダイレクト）
- [ ] 本番 URL（https://code-tweet.vercel.app/）で全機能が動作する

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

| バージョン | 機能 |
|-----------|------|
| V4 | スケジュール管理（投稿日時設定・一覧表示） |
| V5 | Claude API も選択可能に |
| V7 | Google AdSense 広告実装 |
| V8 | フリーミアム導入（無料：月3回 / 有料：無制限）・Stripe |
| V9 | Instagram・Threads など他 SNS 対応 |
