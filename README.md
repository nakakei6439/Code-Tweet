# Code Tweet

README やプロジェクト説明を AI が分析し、X（旧 Twitter）向けマーケティングポストを 5 件自動生成する個人開発者向け Web アプリ。

本番 URL: **https://code-tweet.vercel.app/**

---

## 機能

- **GitHub URL 連携**：公開リポジトリの URL を貼り付けて README を自動取得
- **テキスト直接入力**：README や機能説明をそのまま貼り付け可能
- **5 件のストーリーアーク生成**：紹介 → 使い方 → ユースケース → 共感 → CTA の流れで一貫したポストを生成
- **口調・トーン指示**（任意）：「フランクな感じで」など自然文で指定
- **URL リード文の自動付与**（任意）：App Store / Google Play / GitHub / Web を自動判定し、種別に応じたリード文（「App Store で無料公開中 →」など）を毎回違う言い回しで付ける
- **ハッシュタグ補完**（任意）：指定タグに加え、関連タグを最大 5 つまで自動追加
- **推奨投稿日時の提案**：各ポストごとに翌日〜7 日以内の日時と選定理由を AI が提案
- **weighted length チェック・自動短縮**：X の 280 ウェイト上限を `twitter-text` で計測し、超過時は最大 4 回まで AI に短縮を依頼
- **ワンクリックコピー**：各ポストをそのままコピーして投稿
- **Google ログイン（任意）**：Supabase Auth。ログインで利用上限が拡張される
- **利用回数制限**：未ログイン 5 回 / ログイン 10 回 / 日（IP ハッシュ・ユーザー ID で計測）

---

## 技術スタック

| 役割 | 採用 |
|------|------|
| フレームワーク | Next.js 16.2.4（App Router） |
| ランタイム | React 19.2.4 |
| 言語 | TypeScript 5 |
| スタイリング | Tailwind CSS v4 |
| AI | Gemini API（`gemini-2.5-flash` / `@google/generative-ai`） |
| 認証 | Supabase Auth + Google OAuth（`@supabase/ssr` + `@supabase/supabase-js`） |
| 文字数計算 | `twitter-text`（weighted length） |
| ホスティング | Vercel |

---

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env.local` を作成：

```
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

| 変数名 | 用途 | 必須 |
|--------|------|------|
| `GEMINI_API_KEY` | Gemini API キー（[Google AI Studio](https://aistudio.google.com) で取得） | 必須 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトの URL（Project Settings → API） | 必須 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon public key（同上） | 必須 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase の service role key。未ログイン利用ログ（`ip_usage_logs`）の書き込みに使用 | 必須 |

> `GEMINI_API_KEY` と `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用。クライアントに渡らないよう `NEXT_PUBLIC_` を付けないこと。Service Role Key は管理者権限を持つので絶対に漏らさない。

### 3. Supabase / Google OAuth の準備

1. [Supabase](https://supabase.com/) でプロジェクトを作成し、Project URL / anon public key を取得
2. Google Cloud Console で OAuth クライアント ID を発行し、リダイレクト URI に `https://<Project Ref>.supabase.co/auth/v1/callback` を追加
3. Supabase ダッシュボード → Authentication → Providers → **Google** を有効化し、Client ID / Secret を貼り付け
4. Authentication → URL Configuration の **Redirect URLs** に下記を追加：
   - `http://localhost:3000/auth/callback`
   - `https://code-tweet.vercel.app/auth/callback`

詳しい手順は [`devflow/completed/v2-03-google-auth.md`](./devflow/completed/v2-03-google-auth.md) を参照。

### 4. Supabase テーブルの作成（V2.1 利用制限用）

Supabase の SQL Editor で `usage_logs`（ログイン者用）と `ip_usage_logs`（ゲスト用）の2テーブルを作成。SQL は [`devflow/completed/v2-1-rate-limit.md`](./devflow/completed/v2-1-rate-limit.md) を参照。

### 5. 起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。

---

## 使い方

1. GitHub リポジトリ URL を入力 → 「README を取得」（または直接プロジェクト説明を貼り付け）
2. 口調メモ・URL・ハッシュタグを入力（すべて任意）
3. 「ポストを生成する」を押す
4. 生成された 5 件のポストを推奨日時に合わせて投稿
5. 利用上限を増やしたい場合は Google でログイン（5 回/日 → 10 回/日）

---

## アーキテクチャ

### リクエストフロー

```
[ブラウザ]                     [Next.js / Vercel]                  [外部 API]
    │                                  │                              │
    │ ① / にアクセス                    │                              │
    │─────────────────────>│ proxy.ts → updateSession()                │
    │                                  │ Server Component が getUser()  │
    │                                  │     ──────> Supabase Auth      │
    │ ② 未ログイン: AuthOverlay (ソフト案内) │                          │
    │ ③ Google ログイン (任意)           │ /auth/callback で session 確立 │
    │ ④ GitHub URL → README 取得        │ POST /api/github              │
    │                                  │     ──────> GitHub REST API   │
    │ ⑤ ポスト生成                      │ POST /api/generate            │
    │                                  │ 利用回数チェック (usage_logs / │
    │                                  │   ip_usage_logs)              │
    │                                  │     ──────> Gemini API        │
    │                                  │ weighted length 検証・短縮    │
    │ ⑥ 5 件のポストを表示              │                              │
```

### ディレクトリ構成

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts   # Gemini でポスト生成（利用回数チェック付き）
│   │   └── github/route.ts     # GitHub README 取得（公開リポジトリのみ）
│   ├── auth/
│   │   ├── callback/route.ts   # OAuth コールバック
│   │   └── signout/route.ts    # ログアウト
│   ├── layout.tsx              # 全体レイアウト（Header 差し込み）
│   └── page.tsx                # トップ（Server Component）
├── components/
│   ├── AuthOverlay.tsx         # 未ログイン時のソフト案内バナー
│   ├── GenerateForm.tsx        # フォーム本体（Client Component）
│   ├── Header.tsx              # ヘッダー（ログイン状態判定）
│   ├── HeaderActions.tsx       # ログイン／ログアウトボタン
│   └── TweetCard.tsx           # 生成ポストカード
├── lib/
│   ├── gemini.ts               # プロンプト生成・パース・自動短縮
│   ├── rateLimit.ts            # 利用回数制限（ゲスト IP / ログインユーザー）
│   └── supabase/
│       ├── admin.ts            # service role クライアント（ip_usage_logs 用）
│       ├── client.ts           # ブラウザ用クライアント
│       ├── server.ts           # サーバー用クライアント（cookies）
│       └── middleware.ts       # cookie リフレッシュヘルパ
├── proxy.ts                    # 全リクエストで Supabase セッション更新
└── types/
    └── tweet.ts                # 共通型定義
```

> `src/proxy.ts` は Next.js 16 のミドルウェア（旧 `middleware.ts`）。すべての画面・API リクエストで Supabase の cookie をリフレッシュする。

---

## 開発状況

STEP 5（Vercel デプロイ）まで完了し、本番稼働中。

V2 進捗：

- ✅ Feature 1: サーバー管理 API キー
- ✅ Feature 2: GitHub URL 連携（公開リポジトリのみ）
- ✅ Feature 3: ユーザー認証（Google ログイン / Supabase Auth・任意）
- ✅ V2.1: 利用回数制限（ゲスト 5 回 / ログイン 10 回 / 日）・`GITHUB_TOKEN` 削除
- 保留 Feature 4: ポスト保存・履歴（X 予約投稿で代替可能のため）
- 保留 Feature 5: 検索・フィルタ

詳細は [`devflow/completed/v2-00-overview.md`](./devflow/completed/v2-00-overview.md) / [`devflow/completed/v2-1-rate-limit.md`](./devflow/completed/v2-1-rate-limit.md) を参照。

### V2 以降のロードマップ

| バージョン | 機能 |
|-----------|------|
| V3 | GitHub プライベートリポジトリ対応 |
| V5 | Claude API も選択可能に |
| V8 | フリーミアム導入（ゲスト 5回/日・無料 10回/日・有料 30回/日・Stripe） |
| V9 | Instagram・Threads など他 SNS 対応（保留） |

---

## スクリプト

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm start` | 本番ビルドの起動 |
| `npm run lint` | ESLint 実行 |

---

## 作者

- Keita Nakagawa（中川景太）
- GitHub: [@nakakei6439](https://github.com/nakakei6439)
- X: [@nakakei6439](https://x.com/nakakei6439)
- Zenn: [@nakakei6439](https://zenn.dev/nakakei6439)
