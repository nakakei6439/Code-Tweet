# Feature 3: ユーザー認証（Google ログイン）

← [概要に戻る](./step8-v2-overview.md)

**前提**: Feature 1 完了済み ✅ / Feature 4・5 の前提条件

---

## 目的

誰のデータかを識別するために必要。Feature 4（ポスト保存）の前提となる。
Google アカウントでログインできるようにする。

---

## 技術選定

- **採用: Supabase Auth**
- 理由: Feature 4 で Supabase DB を使う予定なので Auth と DB を一元管理できる
- Clerk は Next.js App Router との統合が容易だが、Supabase と併用すると管理が分散するため不採用

---

## タスク

### Supabase セットアップ（ブラウザ作業）

- [ ] Supabase でプロジェクトを新規作成（Feature 4 と共用）
- [ ] Supabase ダッシュボード → Authentication → Providers → Google を有効化
  - Google Cloud Console で OAuth クライアント ID・シークレットを取得して設定

### 環境変数の追加

- [ ] `.env.local` に以下を追加：
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  ```
- [ ] Vercel 環境変数にも同じ2つを追加（Production + Preview）

### コード実装（Claude に依頼）

- [ ] `src/lib/supabase.ts` を新規作成（クライアント初期化）
- [ ] `src/middleware.ts` を新規作成（`/history` への未ログインアクセスをリダイレクト）
- [ ] `src/app/layout.tsx` にヘッダーを追加（ログイン/ログアウトボタン）
- [ ] 未ログイン時のポリシー決定（どちらかを選ぶ）：
  - **A: 生成は誰でも可能、保存だけにログインが必要**（ハードルが低い）
  - **B: 生成自体にログインが必要**（利用者を把握できる）

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/supabase.ts` | **新規作成**：Supabase クライアント初期化 |
| `src/middleware.ts` | **新規作成**：`/history` の認証ガード |
| `src/app/layout.tsx` | ヘッダー（ログイン状態・ボタン）を追加 |
| `src/app/page.tsx` | ヘッダー表示に伴う調整 |

---

## 環境変数

| 変数名 | 保存場所 | 備考 |
|--------|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | ブラウザに公開される（問題なし） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | ブラウザに公開される（RLS で保護） |
