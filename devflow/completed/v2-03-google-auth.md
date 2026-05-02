# Feature 3: ユーザー認証（Google ログイン）✅

← [概要に戻る](./v2-00-overview.md)

**前提**: Feature 1 完了済み ✅
**ステータス**: 実装完了（Policy B / UX B 採用）

---

## 目的

誰のデータかを識別するために必要。Feature 4（ポスト保存）の前提となる。
副次的に「リンクを知っていれば誰でも Gemini API を消費できる」状態を解消する。

---

## 採用方針（確定）

| 項目 | 採用 | 理由 |
|------|------|------|
| 認証基盤 | **Supabase Auth** | Feature 4 で Supabase DB を使うため一元管理 |
| プロバイダ | **Google OAuth のみ** | 個人開発者ターゲットの Web 利用が中心 |
| Policy | **B: 生成自体にログイン必須** | API キー悪用防止が主目的 |
| 未ログイン UX | **B: トップ画面でフォームをロック表示** | 離脱しにくく、ログイン後そのまま生成へ移行できる |
| SDK | `@supabase/supabase-js` + `@supabase/ssr` | App Router 公式パターン |

---

## アーキテクチャ

```
[ブラウザ]                    [Next.js]                     [Supabase]         [Google]
   │                                │                         │                  │
   │ ① トップ /                       │                         │                  │
   │───────────────────────>│ getUser() (Server Component)                       │
   │                                │────────────────>│                  │
   │ ② 未ログイン: AuthOverlay 表示    │<────────────────│                  │
   │<───────────────────────│                         │                  │
   │ ③ Google でログイン押下           │                         │                  │
   │ supabase.auth.signInWithOAuth                              │                  │
   │─────────────────────────────────────────────────────────>│ OAuth 開始 ─>│
   │ ④ Google ログイン                                                              │
   │ ⑤ Supabase が /auth/callback?code=xxx に戻す                                  │
   │<──────────────────────────────────────│                                      │
   │ ⑥ exchangeCodeForSession → cookie set → / にリダイレクト                       │
   │<───────────────────────│                                                       │
   │ ⑦ getUser() がユーザーを返し、フォーム解放                                      │
```

- Cookie のリフレッシュは `src/proxy.ts` が全リクエストで実行
- API ルートは `getUser()` で 401 ガード

---

## 実装ファイル

| 種別 | パス | 用途 |
|------|------|------|
| 新規 | `src/lib/supabase/client.ts` | ブラウザ用クライアント |
| 新規 | `src/lib/supabase/server.ts` | サーバー用クライアント（cookies() 使用） |
| 新規 | `src/lib/supabase/middleware.ts` | middleware 用ヘルパ |
| 新規 | `src/proxy.ts` | リクエストごとの cookie リフレッシュ |
| 新規 | `src/app/auth/callback/route.ts` | OAuth コールバック受け |
| 新規 | `src/app/auth/signout/route.ts` | ログアウト処理 |
| 新規 | `src/components/Header.tsx` | ヘッダー（Server Component） |
| 新規 | `src/components/HeaderActions.tsx` | ヘッダー右側のログイン/ログアウトボタン |
| 新規 | `src/components/AuthOverlay.tsx` | 未ログイン時のロック画面 |
| 新規 | `src/components/GenerateForm.tsx` | 既存 page.tsx の中身を移植（Client Component） |
| 修正 | `src/app/page.tsx` | Server Component 化、isAuthenticated を判定 |
| 修正 | `src/app/layout.tsx` | Header を差し込む |
| 修正 | `src/app/api/generate/route.ts` | 認証ガード（401） |
| 修正 | `src/app/api/github/route.ts` | 認証ガード（401） |

---

## ブラウザ作業（環境準備）

`.env.local` に貼る 2 つの値を得るための外部設定。所要 15〜20 分。

### Supabase プロジェクト作成

1. https://supabase.com/ にアクセス → GitHub アカウントでサインイン
2. 「New project」→ 名前 `code-tweet` / Region `Northeast Asia (Tokyo)`
3. 作成後、左メニュー「Project Settings → API」を開き：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Project API keys` の **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` は使わない（漏らすと危険）

### Google Cloud Console で OAuth クライアント作成

1. https://console.cloud.google.com/ で新規プロジェクト `code-tweet`
2. 「APIとサービス → OAuth 同意画面」
   - User Type: 外部 / アプリ名: `Code Tweet` / テストユーザーに自分のメールを追加
3. 「APIとサービス → 認証情報 → + 認証情報を作成 → OAuth クライアント ID」
   - 種類: **ウェブアプリケーション**
   - 承認済みリダイレクト URI: `https://<Project Ref>.supabase.co/auth/v1/callback`
     - `<Project Ref>` は Supabase の Project URL の `https://` 直後（例: `abcdefg.supabase.co` → `abcdefg`）
4. **Client ID** と **Client Secret** をメモ

### Supabase 側で Google プロバイダ有効化

1. Supabase ダッシュボード → Authentication → Providers → **Google** を ON
2. Client ID / Client Secret を貼り付けて Save

### Supabase Redirect URL を許可リストに

1. Supabase ダッシュボード → Authentication → URL Configuration
2. **Site URL**: `https://code-tweet.vercel.app`
3. **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://code-tweet.vercel.app/auth/callback
   ```

> ⚠️ ここを忘れると本番で `Redirect URL not allowed` エラーになる。最頻ハマりポイント。

### 環境変数を 2 箇所に置く

**ローカル** `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

**Vercel**: Settings → Environment Variables で **Production と Preview の両方**に同じ 2 つを追加。

---

## 環境変数

| 変数名 | 保存場所 | 公開可否 |
|--------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | ブラウザに公開される（問題なし） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | 同上。RLS で保護 |

---

## 動作確認手順

### 未ログイン状態

1. シークレットウィンドウで `http://localhost:3000` を開く
   → フォームが薄くマスクされ、中央に「🔒 ログインして始めましょう」＋ Google ボタンが表示される
2. 直接 API を叩く（curl）：
   ```bash
   curl -i -X POST http://localhost:3000/api/generate \
     -H "Content-Type: application/json" \
     -d '{"projectText":"test"}'
   ```
   → `HTTP/1.1 401` と `{"error":"ログインが必要です。"}`
3. `/api/github` も同様に 401

### ログイン → 生成 → ログアウト

4. 「Google でログイン」→ Google 画面 → 戻ってくるとオーバーレイが消える
5. プロジェクト説明を入力して「ポストを生成する」→ 5件生成される
6. ヘッダー右上のメール表示確認、「ログアウト」を押す → 再びオーバーレイ表示

### 本番

7. `https://code-tweet.vercel.app/` で 1〜6 を再実行
