# Feature 4: ポスト保存・履歴

← [概要に戻る](./v2-00-overview.md)

**前提**: Feature 3（ユーザー認証）が完了していること

---

## 目的

生成したポストを保存し、後から見返せるようにする。
リピート利用の動機付けになる。

---

## タスク

### DB セットアップ（Supabase ダッシュボード作業）

- [ ] Supabase ダッシュボードの SQL Editor で以下を実行：

```sql
CREATE TABLE tweet_sets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  title      TEXT,
  source_url TEXT,
  tweets     JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tweet_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own data" ON tweet_sets
  USING (auth.uid() = user_id);
```

- [ ] RLS（行レベルセキュリティ）が有効になっていることを確認

### コード実装（Claude に依頼）

- [ ] `src/app/api/tweets/route.ts` を新規作成
  - `POST /api/tweets`：生成したポストセットを保存
  - `GET /api/tweets`：ログインユーザーの保存済み一覧を取得
- [ ] `src/app/page.tsx` に「このポストを保存する」ボタンを追加（生成完了後に表示）
- [ ] 保存時のタイトル入力 UI を追加（任意入力。空欄なら日時で自動命名）
- [ ] `src/app/history/page.tsx` を新規作成
  - 保存済みポストセットの一覧表示
  - 各セットを展開すると5件のポストが見られる

---

## DB スキーマ説明

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID | 主キー（自動生成） |
| `user_id` | UUID | ログインユーザーの ID（`auth.users` と紐づく） |
| `title` | TEXT | 任意のラベル（例：「Code Tweet の宣伝用」） |
| `source_url` | TEXT | GitHub URL（Feature 2 で取得した場合に記録） |
| `tweets` | JSONB | 生成された5件のポストを JSON で保存 |
| `created_at` | TIMESTAMPTZ | 保存日時（自動） |

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/app/api/tweets/route.ts` | **新規作成**：ポスト保存・取得 Route Handler |
| `src/app/history/page.tsx` | **新規作成**：保存済みポスト一覧ページ |
| `src/app/page.tsx` | 「保存する」ボタンとタイトル入力 UI を追加 |
