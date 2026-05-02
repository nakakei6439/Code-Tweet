# V2.1: 利用回数制限の導入 — 手動セットアップ手順

## このファイルの目的

V2.1 で実装した「ログイン任意化＋利用回数制限＋セキュリティ修正」を本番に反映するために、コード変更だけでは完結しない**手動作業**を順番に書く。

---

## 全体の流れ

1. ✅ コード実装（完了済み）
2. ⬜ Supabase でテーブルを作る（後述）
3. ⬜ `SUPABASE_SERVICE_ROLE_KEY` を環境変数に追加（後述）
4. ⬜ `GITHUB_TOKEN` を削除（後述）
5. ⬜ ローカルで動作確認
6. ⬜ 本番デプロイ
7. ⬜ 本番で動作確認

---

## 1. Supabase でテーブルを作る

### 1-1. Supabase ダッシュボードを開く

1. ブラウザで https://supabase.com/dashboard を開く
2. ログインする
3. **Code-Tweet のプロジェクト**を選択

### 1-2. SQL Editor を開く

1. 左サイドバーの **SQL Editor**（雷マークのアイコン）をクリック
2. 右上の **+ New query** をクリック

### 1-3. `usage_logs` テーブルを作る

以下の SQL を SQL Editor に貼り付けて、右下の **Run**（または ⌘ Enter）をクリック：

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX usage_logs_user_date_idx ON usage_logs (user_id, generated_at);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own logs"
  ON usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own logs"
  ON usage_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

成功すると `Success. No rows returned` と表示される。

### 1-4. `ip_usage_logs` テーブルを作る

新しいクエリで以下を実行：

```sql
CREATE TABLE ip_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ip_usage_logs_ip_date_idx ON ip_usage_logs (ip_hash, generated_at);

ALTER TABLE ip_usage_logs ENABLE ROW LEVEL SECURITY;
-- ポリシーは設定しない（service role のみアクセス可）
```

### 1-5. テーブルが作られたか確認

1. 左サイドバーの **Table Editor**（テーブルのアイコン）をクリック
2. `usage_logs` と `ip_usage_logs` の2つが一覧に出てくることを確認

---

## 2. `SUPABASE_SERVICE_ROLE_KEY` を環境変数に追加する

### なぜ必要か

`ip_usage_logs` テーブルは未ログインユーザー（Guest）の生成回数を IP ベースで数える。RLS の `auth.uid()` ベースの権限が使えないため、サーバーサイドからのみアクセスできる「Service Role Key」を使って書き込む。

このキーは**絶対にクライアントに渡してはいけない**（管理者権限を持つキーのため）。

### 2-1. Service Role Key を取得する

1. Supabase ダッシュボード → 該当プロジェクト
2. 左サイドバー一番下の **⚙ Project Settings** をクリック
3. **API** タブをクリック
4. **Project API keys** セクションに2つのキーが表示される：
   - `anon` `public` ← **これは違う**（既に使っている）
   - `service_role` `secret` ← **これが必要**
5. `service_role` の右側の **Reveal** をクリックしてキーを表示
6. **Copy** ボタンでコピー

### 2-2. ローカル `.env.local` に追加する

プロジェクトルートの `.env.local` を開いて、以下の行を追加：

```
SUPABASE_SERVICE_ROLE_KEY=コピーしたキーをここに貼り付け
```

例：
```
GEMINI_API_KEY=AIzaSy...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...   ← 追加
```

### 2-3. Vercel に追加する

1. ブラウザで https://vercel.com/dashboard を開く
2. **Code-Tweet** プロジェクトを選択
3. 上部の **Settings** タブをクリック
4. 左メニューの **Environment Variables** をクリック
5. **Key**：`SUPABASE_SERVICE_ROLE_KEY`
6. **Value**：先ほどコピーしたキー
7. **Environment**：**Production** と **Preview** の2つにチェック
   - Development には鍵マークが出てチェックできないが、それで正しい
   - Vercel が機密性の高い変数（Sensitive）と判定して Development への登録をブロックする仕様
   - ローカル開発は `.env.local` に直接書くため、Development へのチェックは不要
8. **Save** をクリック

---

## 3. `GITHUB_TOKEN` を削除する

### なぜ削除するか

現状、サーバーで開発者個人の `GITHUB_TOKEN`（Personal Access Token）を使って GitHub API にアクセスしている。これは「ログインしたユーザーが README 取得 API 経由で**開発者のプライベートリポジトリにアクセスできる**」という重大な脆弱性。

V2.1 では公開リポジトリのみ対応に絞り、`GITHUB_TOKEN` を削除する。

### 3-1. ローカル `.env.local` から削除

`.env.local` を開いて `GITHUB_TOKEN=...` の行を**完全に削除**する。

削除前：
```
GEMINI_API_KEY=AIzaSy...
GITHUB_TOKEN=ghp_xxxxxxxxxxxx   ← この行を削除
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
...
```

削除後：
```
GEMINI_API_KEY=AIzaSy...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
...
```

### 3-2. Vercel から削除

1. https://vercel.com/dashboard
2. **Code-Tweet** プロジェクト → **Settings** → **Environment Variables**
3. `GITHUB_TOKEN` の行を探す
4. 右側の **⋯**（三点メニュー）をクリック
5. **Remove** を選択
6. 確認ダイアログで **Remove** をクリック

### 3-3.（推奨）GitHub 側でトークンを失効させる

漏洩リスクを完全になくすため、GitHub 側でも該当トークンを失効させる：

1. https://github.com/settings/tokens を開く
2. 該当の Personal Access Token を探す（V2 開発時に作ったもの）
3. **Delete**（または **Revoke**）をクリック
4. 確認ダイアログで承認

---

## 4. ローカルで動作確認

### 4-1. Dev サーバーを再起動

`.env.local` を変更したので、dev サーバーを一度止めて再起動する：

```bash
# 既存の dev サーバーを止める（別ターミナルで起動中の場合は Ctrl+C）
# ポート 3000 が他で使われている場合：
lsof -ti:3000 | xargs kill -9

# 再起動
npm run dev
```

### 4-2. 未ログイン状態で動作確認

1. ブラウザで http://localhost:3000 を開く
2. 上部のログインバナーが**ソフトな案内**になっていることを確認（フォームはロックされていない）
3. 公開リポジトリの URL（例：`https://github.com/vercel/next.js`）を入力 → README 取得 → ポスト生成
4. **5回まで**生成できる
5. 6回目で「1日の生成上限（5回）に達しました」というエラーが出る

### 4-3. ログイン状態で動作確認

1. Google でログインする
2. ログインバナーが消える
3. 連続して生成 → **10回まで**できる
4. 11回目で「1日の生成上限（10回）に達しました」というエラーが出る

### 4-4. テーブルにレコードが入っているか確認

Supabase ダッシュボード → Table Editor で：
- `usage_logs`：ログイン後に生成すると `user_id` 付きのレコードが入る
- `ip_usage_logs`：未ログインで生成すると `ip_hash`（ハッシュ化された値）が入る

---

## 5. 本番デプロイ

### 5-1. Git コミット

```bash
git add -A
git commit -m "feat: V2.1 ログイン任意化＋利用制限＋GITHUB_TOKEN削除"
```

### 5-2. プッシュして Vercel に自動デプロイ

```bash
git push
```

Vercel ダッシュボードで Deployment が成功するのを待つ（約1〜2分）。

---

## 6. 本番で動作確認

### 6-1. 本番 URL で動作確認

1. https://code-tweet.vercel.app/ を開く
2. ローカルと同じ確認をする：
   - 未ログインで5回まで使える、6回目で429
   - ログインで10回まで、11回目で429

### 6-2. 環境変数の最終チェック

Vercel → Settings → Environment Variables で確認：

| 変数名 | 状態 |
|--------|------|
| `GEMINI_API_KEY` | ✅ あり |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ あり |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ あり |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ あり（**新規追加分**） |
| `GITHUB_TOKEN` | ❌ なし（**削除済み**） |

---

## トラブルシューティング

### Q. 「現在サービスが利用できません」というエラーが出る

A. Vercel の環境変数 `GEMINI_API_KEY` が設定されていない可能性。Vercel ダッシュボードで確認。

### Q. 未ログインで生成すると「IP アドレスを特定できませんでした」と出る

A. ローカル開発で起こりうる。本番（Vercel）では `x-forwarded-for` ヘッダが必ずあるので問題ない。ローカルで試す場合は一度ログインして使うか、リクエストヘッダーを偽装する。

### Q. 制限カウントがリセットされない

A. テーブルに古いレコードが溜まり続ける。気になる場合は Supabase の SQL Editor で以下を月1回実行：

```sql
DELETE FROM usage_logs WHERE generated_at < now() - INTERVAL '24 hours';
DELETE FROM ip_usage_logs WHERE generated_at < now() - INTERVAL '24 hours';
```

### Q. Service Role Key が漏洩したかも

A. Supabase ダッシュボード → Project Settings → API → **Roll** ボタンで新しいキーを生成し、Vercel と `.env.local` を更新する。

---

## 完了チェックリスト

- [ ] Supabase に `usage_logs` テーブルを作成
- [ ] Supabase に `ip_usage_logs` テーブルを作成
- [ ] `.env.local` に `SUPABASE_SERVICE_ROLE_KEY` を追加
- [ ] Vercel に `SUPABASE_SERVICE_ROLE_KEY` を追加
- [ ] `.env.local` から `GITHUB_TOKEN` を削除
- [ ] Vercel から `GITHUB_TOKEN` を削除
- [ ] GitHub 側で該当トークンを失効
- [ ] ローカルで未ログイン5回・ログイン10回の制限を確認
- [ ] 本番デプロイ
- [ ] 本番 URL で動作確認
