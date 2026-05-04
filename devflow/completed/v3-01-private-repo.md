# V3: GitHub プライベートリポジトリ対応

← [devflow 索引に戻る](../README.md)

**完了日**: 2026-05-04

---

## 目的

V2.1 で `GITHUB_TOKEN`（サーバー共有トークン）を削除し、公開リポジトリ専用になった。
V3 ではログイン済みユーザーが自分の **GitHub Personal Access Token (PAT)** を登録することで、プライベートリポジトリの README も取得できるようにする。

---

## 実装方針

- PAT はサーバーが **AES-256-GCM** で暗号化して Supabase に保存（クライアントに復号値を返さない）
- README 取得時はサーバーが Supabase から PAT を取り出し、GitHub API の `Authorization: Bearer` ヘッダーに付与
- ゲストユーザーはプライベートリポジトリ使用不可（ログイン必須）
- PAT 保存前に GitHub `/user` エンドポイントで有効性・スコープを検証

---

## Supabase マイグレーション

SQL Editor で実行：

```sql
CREATE TABLE user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_pat_encrypted TEXT NOT NULL,
  github_pat_iv TEXT NOT NULL,
  github_pat_tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_tokens" ON user_tokens
  FOR ALL USING (auth.uid() = user_id);
```

---

## 環境変数

| 変数名 | 用途 | 生成方法 |
|--------|------|---------|
| `GITHUB_PAT_ENCRYPTION_KEY` | PAT の AES-256-GCM 暗号化キー（32バイト = 64文字の16進数） | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

`.env.local` と Vercel 環境変数の両方に追加すること。

---

## 新規・変更ファイル

| ファイル | 変更 | 内容 |
|---------|------|------|
| `src/lib/encryption.ts` | 新規 | AES-256-GCM 暗号化/復号ユーティリティ |
| `src/app/api/tokens/route.ts` | 新規 | PAT の登録（POST）・削除（DELETE）。保存前に GitHub で有効性・スコープ検証 |
| `src/app/settings/page.tsx` | 新規 | 設定ページ（Server Component・ログイン必須）。PAT 管理 + 8ステップ取得ガイド |
| `src/components/SettingsForm.tsx` | 新規 | PAT 登録・削除フォーム（Client Component）。保存後に完了パネルとホームへ戻るボタンを表示 |
| `src/app/api/github/route.ts` | 変更 | ログイン済みユーザーの PAT を Supabase から取得して GitHub API 認証に使用。エラーを認証状態・PAT 有無で 4 パターンに分岐 |
| `src/components/Header.tsx` | 変更 | ハンバーガーメニュー対応（`Code Tweet` をセンタリング） |
| `src/components/HeaderActions.tsx` | 変更 | ハンバーガーアイコン → ドロップダウン（設定・ログイン/ログアウト）に刷新 |
| `src/app/layout.tsx` | 変更 | `body` に `bg-gray-950` を追加（設定ページの背景を統一） |

---

## エラーハンドリング（`/api/github`）

| 状況 | ステータス | メッセージ |
|------|---------|---------|
| PAT 復号失敗 | 500 | PAT の読み込みに失敗しました。設定ページから再登録してください |
| GitHub 401 | 401 | Personal Access Token が無効です。設定ページから再登録してください |
| 403・未ログイン | 403 | 非公開リポジトリにはログインと PAT の登録が必要です |
| 403・PAT 未登録 | 403 | 非公開リポジトリには設定ページで PAT を登録してください |
| 403・PAT 登録済み | 403 | このリポジトリへのアクセス権がありません。repo スコープを確認してください |
| 404・PAT 登録済み | 404 | リポジトリが見つかりません。URL を確認してください |
| 404・ログイン済み・PAT なし | 404 | リポジトリが見つかりません。非公開の場合は設定ページで PAT を登録してください |
| 404・未ログイン | 404 | リポジトリが見つかりません。非公開の場合はログインと PAT の登録が必要です |

---

## PAT の要件

- **種類**: Classic Token（`ghp_` で始まる文字列）推奨
- **スコープ**: `repo` にチェック必須（これがないとプライベートリポジトリにアクセスできない）
- **検証**: 保存時に GitHub `/user` API で有効性確認・`X-OAuth-Scopes` でスコープ確認

---

## トークン管理フロー

```
[ユーザーが /settings で PAT 入力]
        ↓
POST /api/tokens
  ① GitHub /user で有効性・スコープ検証
  ② AES-256-GCM で暗号化
  ③ Supabase user_tokens に upsert
        ↓
[ユーザーがプライベートリポジトリ URL を入力して「README を取得」]
        ↓
POST /api/github
  ① createClient で user session 取得
  ② admin client で user_tokens を検索
  ③ 復号して Authorization: Bearer {PAT} をセット
  ④ GitHub API 呼び出し → README を返す
```
