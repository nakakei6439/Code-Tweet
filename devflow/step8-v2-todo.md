# STEP 8: V2 機能実装 ToDo - Code Tweet

---

## 概要

STEP 5（Vercel デプロイ）完了後の次フェーズ。V1 は「APIキーを自分で入力してテキストを貼り付けるだけ」のシンプルな MVP だった。V2 では**入力の摩擦をゼロに近づけ、ユーザーがリピートしたくなるしくみ**を追加する。

### V1 との差分サマリー

| 項目 | V1（現状） | V2（目標） |
|------|-----------|-----------|
| API キー | ユーザーが毎回入力 | サーバー管理（入力不要） |
| 入力方法 | テキスト手動コピペ | GitHub URL 貼り付けで README 自動取得 |
| ユーザー管理 | なし | Google ログイン |
| 生成履歴 | なし | 保存・閲覧可能 |
| 検索 | なし | 保存済みポストを検索 |

---

## 機能一覧（優先順位付き）

| 優先 | # | 機能 | 対応する元ロードマップ | 理由 |
|------|---|------|---------------------|------|
| 高 | 1 | サーバー管理 API キー | ―（step5 で言及） | 最も簡単に実装でき、UX 改善効果が即効 |
| 高 | 2 | GitHub URL 連携 | V2（GitHub API） | V1 最大の入力 UX 問題を解消 |
| 中 | 3 | ユーザー認証（Google ログイン） | V6（Supabase Auth） | 機能 4・5 の前提条件 |
| 中 | 4 | ポスト保存・履歴 | V3（Supabase DB） | リピート利用の動機付け |
| 低 | 5 | 検索・フィルタ | step5 で言及 | 保存件数が溜まってから価値が出る |

---

## 詳細タスク

### Feature 1: サーバー管理 API キー

**目的**: ユーザーが Gemini API キーを取得・管理しなくても使えるようにする。

**コード変更（Claude が実施済み）:**

- [x] `.env.local` に `GEMINI_API_KEY=<自分のキー>` を設定（ローカル開発用）
- [x] `src/lib/gemini.ts` の `generateTweets()` から `apiKey` 引数を削除し、内部で `process.env.GEMINI_API_KEY` を使うよう変更
- [x] `src/app/api/generate/route.ts` のリクエストから `apiKey` の取得・検証を削除
- [x] `src/types/tweet.ts` の `GenerateRequest` 型から `apiKey` フィールドを削除
- [x] `src/app/page.tsx` のフォームから「Gemini API キー」入力欄を削除

---

**残り作業（自分でやること）:**

#### ① ローカルで動作確認

1. ブラウザで http://localhost:3000 を開く
2. API キー入力欄が消えていることを確認
3. プロジェクト説明だけ入力して「ポストを生成する」を押す
4. ポストが5件生成されれば OK

#### ② Vercel に環境変数を追加（本番用）

> **なぜ必要か**: ローカルでは `.env.local` に API キーが書いてあるが、
> Vercel（本番サーバー）にはそのファイルは存在しない。
> Vercel のダッシュボードで別途設定する必要がある。

1. https://vercel.com/nakakei6439/code-tweet/settings/environment-variables を開く
2. 「Add New」ボタンをクリック
3. 以下を入力：
   - **Key（変数名）**: `GEMINI_API_KEY`
   - **Value（値）**: `.env.local` に書いてある `GEMINI_API_KEY=` の右側の文字列（`AIzaSy...` で始まる文字列）
   - **Environments**: `Production` と `Preview` の両方にチェック（`Development` は不要）
4. 「Save」をクリック

#### ③ コミット → デプロイ（Claude に頼む）

> 「コミットして」と伝えれば Claude が実行します。
> デプロイは `git push` 後に Vercel が自動で行います。

- [ ] ローカル動作確認（手順①）
- [ ] Vercel 環境変数の設定（手順②）
- [ ] コミット・プッシュ（Claude に依頼）
- [ ] 本番 URL（https://code-tweet.vercel.app/）でもポスト生成できることを確認

---

### Feature 2: GitHub URL 連携

**目的**: GitHub リポジトリ URL を貼り付けるだけで README を自動取得し、テキスト入力欄に挿入する。

- [ ] `src/app/page.tsx` に「GitHub URL」入力フィールドを追加
- [ ] 「README を取得する」ボタンまたは URL 入力後の自動フェッチ UI を設計・実装
- [ ] `src/app/api/github/route.ts` を新規作成
  - GitHub REST API v3 の `/repos/{owner}/{repo}/readme` エンドポイントを呼ぶ
  - Base64 デコードして Markdown テキストを返す
- [ ] 取得した README テキストをテキストエリアに自動挿入するフロー実装
- [ ] エラーハンドリング
  - 存在しないリポジトリ（404）
  - Private リポジトリ（403）
  - README ファイルなし（404）
  - URL フォーマット不正（バリデーション）
- [ ] （オプション）レート制限対応：未認証は 60 req/h。超える場合は `GITHUB_TOKEN` を env に追加して 5,000 req/h へ拡張

**変更ファイル**:
- `src/app/api/github/route.ts`（新規）
- `src/app/page.tsx`

---

### Feature 3: ユーザー認証（Google ログイン）

**目的**: Feature 4（ポスト保存）の前提。誰のデータかを識別するために必要。

**技術選定メモ**:
- 元ロードマップ（step1-planning.md）は「Supabase Auth」と明記
- Feature 4 で Supabase DB を使う予定なので、Supabase Auth で統一するのが自然
- Clerk は Next.js App Router との統合が容易だが、Supabase と併用すると管理が分散する
- **推奨: Supabase Auth**（DB と一元管理できる）

- [ ] Supabase プロジェクト作成（Feature 4 と共用）
- [ ] Supabase の Google OAuth プロバイダを有効化
- [ ] `@supabase/supabase-js` と `@supabase/ssr` をインストール
- [ ] 環境変数を設定：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `src/app/layout.tsx` に Supabase Provider を追加
- [ ] ヘッダーにログイン/ログアウトボタンを追加
- [ ] 未ログイン時の対応ポリシーを決定（例：生成は可能だが保存不可、または生成自体に制限）
- [ ] ルートガード実装（`/history` は要ログイン）

**変更ファイル**:
- `src/app/layout.tsx`
- `src/app/page.tsx`（ヘッダー追加）
- `src/lib/supabase.ts`（新規：クライアント初期化）
- `src/middleware.ts`（新規：ルートガード）

---

### Feature 4: ポスト保存・履歴

**目的**: 生成したポストを保存し、後から見返せるようにする。リピート利用の動機付け。

**DB スキーマ設計案**:

```sql
-- ユーザーテーブル（Supabase Auth の auth.users と連携）
-- tweet_sets: 1回の生成でまとめて保存する単位

CREATE TABLE tweet_sets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  title      TEXT,                      -- プロジェクト名などの識別ラベル
  source_url TEXT,                      -- GitHub URL（あれば）
  tweets     JSONB NOT NULL,            -- Tweet[] を JSON で保存
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS（Row Level Security）有効化
ALTER TABLE tweet_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can manage own data" ON tweet_sets
  USING (auth.uid() = user_id);
```

**タスク**:
- [ ] Supabase ダッシュボードでテーブル作成（または SQL Editor で上記を実行）
- [ ] RLS ポリシーを設定
- [ ] `src/app/api/tweets/route.ts` を新規作成
  - `POST /api/tweets`：ポストセットを保存
  - `GET /api/tweets`：ログインユーザーの一覧を取得
- [ ] 生成完了後に「このポストを保存する」ボタンを表示
- [ ] `src/app/history/page.tsx` を新規作成（保存済み一覧・各セットのポスト表示）
- [ ] 保存時のタイトル入力 UI（任意入力）

**変更ファイル**:
- `src/app/api/tweets/route.ts`（新規）
- `src/app/history/page.tsx`（新規）
- `src/app/page.tsx`（保存ボタン追加）

---

### Feature 5: 検索・フィルタ

**目的**: 保存件数が増えた際に特定のプロジェクトのポストを素早く探せるようにする。

**実装判断**:
- 保存件数が数百件以下ならクライアントサイドフィルタで十分（余計な API 不要）
- 件数が増えたら Supabase の `ILIKE` クエリ or `pg_trgm` による全文検索に移行

- [ ] `/history` ページに検索ボックスを追加
- [ ] タイトル・ポストテキストで絞り込む（クライアントサイドフィルタから始める）
- [ ] （将来）件数増加後に Supabase 全文検索へ移行

**変更ファイル**:
- `src/app/history/page.tsx`

---

## トークン・シークレットの保存場所

各トークンがどこに保存されるかを明記する。**クライアント（ブラウザ）に秘密情報が渡ってはいけない。**

| トークン / キー | 保存場所 | アクセス可能な場所 | 備考 |
|---------------|---------|----------------|------|
| `GEMINI_API_KEY` | `.env.local`（ローカル）/ Vercel 環境変数（本番） | サーバーサイドのみ（Route Handler 内） | `NEXT_PUBLIC_` プレフィックスを付けないこと |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` / Vercel 環境変数 | クライアント・サーバー両方 | anon キーなので公開 OK。RLS で保護 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` / Vercel 環境変数 | クライアント・サーバー両方 | 同上 |
| Supabase サービスロールキー | Vercel 環境変数のみ | サーバーサイドのみ（Route Handler 内） | 絶対にクライアントに渡さない |
| ユーザーのセッショントークン（JWT） | httpOnly Cookie（`@supabase/ssr` が自動管理） | サーバーサイドのみ（JS からは読めない） | XSS 対策。ブラウザの JS からアクセス不可 |
| `GITHUB_TOKEN`（オプション） | Vercel 環境変数のみ | サーバーサイドのみ（Route Handler 内） | レート制限拡張が必要な場合のみ追加 |

### httpOnly Cookie とは

`@supabase/ssr` を使うと、ログイン後のセッション情報（JWT）は `httpOnly` 属性付きの Cookie に保存される。`httpOnly` Cookie は JavaScript（`document.cookie`）から読み取れないため、XSS 攻撃でトークンが盗まれるリスクを防ぐ。

```
ブラウザ
  ├─ httpOnly Cookie: supabase-auth-token=<JWT>  ← JS からは読めない
  └─ JavaScript: document.cookie で読めるのは非 httpOnly のみ

Route Handler（サーバー）
  └─ Cookie ヘッダーから JWT を読み取り → Supabase でユーザー確認
```

### 開発時の注意

- `.env.local` は `.gitignore` に含まれていることを確認（コミット禁止）
- `NEXT_PUBLIC_` で始まる変数はビルド時にブラウザに埋め込まれるため、**秘密情報には使わない**
- Vercel ダッシュボードで環境変数を追加する際、`GEMINI_API_KEY` は `Production` + `Preview` の両方に設定する

---

## 技術スタック追加分

| 役割 | 選定 | 追加タイミング |
|------|------|-------------|
| 認証 + DB | Supabase | Feature 3 |
| GitHub 連携 | GitHub REST API v3 | Feature 2 |
| Supabase SDK | `@supabase/supabase-js` + `@supabase/ssr` | Feature 3 |

---

## 実装順序と依存関係

```
① サーバー管理 API キー    ← 独立。最小変更で即効果
        ↓
② GitHub URL 連携         ← 独立。Feature 1 完了後に着手
        ↓
③ ユーザー認証            ← Feature 4・5 の前提
        ↓
④ ポスト保存・履歴      ← Feature 3（認証）が必要
        ↓
⑤ 検索・フィルタ          ← Feature 4（保存データ）が必要
```

Feature 1・2 は互いに独立しているため並行実装可能。

---

## 新規追加ファイル一覧

| ファイル | 用途 |
|---------|------|
| `src/app/api/github/route.ts` | GitHub README 取得 Route Handler |
| `src/app/api/tweets/route.ts` | ポスト保存・取得 Route Handler |
| `src/app/history/page.tsx` | 保存済みポスト一覧ページ |
| `src/lib/supabase.ts` | Supabase クライアント初期化 |
| `src/middleware.ts` | 認証ルートガード |

---

## 完了基準チェックリスト

- [ ] API キーの入力なしでポスト生成ができる
- [ ] GitHub リポジトリ URL を貼り付けると README が自動取得される
- [ ] 存在しない URL・private リポジトリで適切なエラーが表示される
- [ ] Google アカウントでログイン・ログアウトができる
- [ ] 生成したポストを「保存する」ボタンで保存できる
- [ ] `/history` でログインユーザーの保存済みポストを一覧表示できる
- [ ] 未ログインでは `/history` にアクセスできない（リダイレクト）
- [ ] 本番 URL（https://code-tweet.vercel.app/）で全機能が動作する
- [ ] Vercel 環境変数に `GEMINI_API_KEY`・Supabase キーが設定されている

---

## 次のステップ（V2 完了後）

`step1-planning.md` のロードマップに従い、以下を順次実装：

| バージョン | 機能 |
|-----------|------|
| V4 | スケジュール管理（投稿日時設定・一覧表示） |
| V5 | Claude API も選択可能に |
| V7 | Google AdSense 広告実装 |
| V8 | フリーミアム導入（無料：月3回 / 有料：無制限）・Stripe |
| V9 | Instagram・Threads など他 SNS 対応 |
