# Code Tweet

README やプロジェクト説明を AI が分析し、X（旧 Twitter）向けマーケティングポストを 5 件自動生成する個人開発者向け Web アプリ。

本番 URL: **https://code-tweet.vercel.app/**

---

## 機能

- **GitHub URL 連携**：リポジトリ URL を貼り付けて README を自動取得（`GITHUB_TOKEN` 設定時はプライベートリポジトリにも対応）
- **テキスト直接入力**：README や機能説明をそのまま貼り付け可能
- **5 件のストーリーアーク生成**：紹介 → 使い方 → ユースケース → 共感 → CTA の流れで一貫したポストを生成
- **口調・トーン指示**（任意）：「フランクな感じで」など自然文で指定
- **URL リード文の自動付与**（任意）：App Store / Google Play / GitHub / Web を自動判定し、種別に応じたリード文（「App Store で無料公開中 →」など）を毎回違う言い回しで付ける
- **ハッシュタグ補完**（任意）：指定タグに加え、関連タグを最大 5 つまで自動追加
- **推奨投稿日時の提案**：各ポストごとに翌日〜7 日以内の日時と選定理由を AI が提案
- **weighted length チェック・自動短縮**：X の 280 ウェイト上限を `twitter-text` で計測し、超過時は最大 4 回まで AI に短縮を依頼
- **ワンクリックコピー**：各ポストをそのままコピーして投稿
- **Google ログイン必須**：Supabase Auth による認証で API 悪用を防止

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
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

| 変数名 | 用途 | 必須 |
|--------|------|------|
| `GEMINI_API_KEY` | Gemini API キー（[Google AI Studio](https://aistudio.google.com) で取得） | 必須 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトの URL（Project Settings → API） | 必須 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon public key（同上） | 必須 |
| `GITHUB_TOKEN` | プライベートリポジトリへのアクセス／レート制限拡張（60→5,000 req/h） | 任意 |

> `GEMINI_API_KEY` と `GITHUB_TOKEN` はサーバー専用。クライアントに渡らないよう `NEXT_PUBLIC_` を付けないこと。

### 3. Supabase / Google OAuth の準備

1. [Supabase](https://supabase.com/) でプロジェクトを作成し、Project URL / anon public key を取得
2. Google Cloud Console で OAuth クライアント ID を発行し、リダイレクト URI に `https://<Project Ref>.supabase.co/auth/v1/callback` を追加
3. Supabase ダッシュボード → Authentication → Providers → **Google** を有効化し、Client ID / Secret を貼り付け
4. Authentication → URL Configuration の **Redirect URLs** に下記を追加：
   - `http://localhost:3000/auth/callback`
   - `https://code-tweet.vercel.app/auth/callback`

詳しい手順は [`devflow/step8-feature3-auth.md`](./devflow/step8-feature3-auth.md) を参照。

### 4. 起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。

---

## 使い方

1. 「Google でログイン」を押して認証
2. GitHub リポジトリ URL を入力 → 「README を取得」（または直接プロジェクト説明を貼り付け）
3. 口調メモ・URL・ハッシュタグを入力（すべて任意）
4. 「ポストを生成する」を押す
5. 生成された 5 件のポストを推奨日時に合わせて投稿

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
    │ ② 未ログイン: AuthOverlay 表示    │                              │
    │ ③ Google ログイン                  │ /auth/callback で session 確立 │
    │ ④ GitHub URL → README 取得        │ POST /api/github              │
    │                                  │     ──────> GitHub REST API   │
    │ ⑤ ポスト生成                      │ POST /api/generate            │
    │                                  │     ──────> Gemini API        │
    │                                  │ weighted length 検証・短縮   │
    │ ⑥ 5 件のポストを表示              │                              │
```

### ディレクトリ構成

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts   # Gemini でポスト生成（要ログイン）
│   │   └── github/route.ts     # GitHub README 取得（要ログイン）
│   ├── auth/
│   │   ├── callback/route.ts   # OAuth コールバック
│   │   └── signout/route.ts    # ログアウト
│   ├── layout.tsx              # 全体レイアウト（Header 差し込み）
│   └── page.tsx                # トップ（Server Component）
├── components/
│   ├── AuthOverlay.tsx         # 未ログイン時のロック画面
│   ├── GenerateForm.tsx        # フォーム本体（Client Component）
│   ├── Header.tsx              # ヘッダー（ログイン状態判定）
│   ├── HeaderActions.tsx       # ログイン／ログアウトボタン
│   └── TweetCard.tsx           # 生成ポストカード
├── lib/
│   ├── gemini.ts               # プロンプト生成・パース・自動短縮
│   └── supabase/
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
- ✅ Feature 2: GitHub URL 連携（プライベートリポジトリ対応含む）
- ✅ Feature 3: ユーザー認証（Google ログイン / Supabase Auth）
- ⬜ Feature 4: ポスト保存・履歴
- ⬜ Feature 5: 検索・フィルタ

詳細は [`devflow/step8-v2-overview.md`](./devflow/step8-v2-overview.md) を参照。

### V2 以降のロードマップ

| バージョン | 機能 |
|-----------|------|
| V4 | スケジュール管理（投稿日時設定・一覧表示） |
| V5 | Claude API も選択可能に |
| V7 | Google AdSense 広告 |
| V8 | フリーミアム導入（Stripe） |
| V9 | Instagram・Threads など他 SNS 対応 |

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
