# STEP 3: 環境構築メモ - Code Tweet

---

## 採用した技術スタック（V1時点）

| 役割 | 選定 | バージョン |
|------|------|-----------|
| フレームワーク | Next.js (App Router) | 16.2.4 |
| 言語 | TypeScript | ^5 |
| スタイリング | Tailwind CSS | ^4 |
| ランタイム | Node.js | v25.8.1 |
| パッケージマネージャー | npm | 11.11.0 |
| ホスティング（予定） | Vercel | — |

---

## `create-next-app` オプションの選択理由

```bash
npx create-next-app@latest --typescript --tailwind --app --src-dir --eslint --import-alias "@/*" --use-npm
```

| オプション | 選択理由 |
|-----------|---------|
| `--typescript` | 型安全性。Gemini APIのレスポンス型定義が必要なため |
| `--tailwind` | step2の画面設計でTailwindクラスを使った設計済み |
| `--app` | App Router。Next.js 15/16 のデフォルト、Route Handlers が簡潔 |
| `--src-dir` | `src/` でアプリコードとルート設定ファイルを分離 |
| `--eslint` | コード品質の基本担保 |
| `--import-alias "@/*"` | `../../` の相対パス地獄を避ける |

---

## ディレクトリ構成

```
src/
  app/
    api/generate/    ← STEP 4: Gemini API Route Handler
    globals.css      ← @import "tailwindcss" のみ
    layout.tsx       ← lang="ja", metadata設定済み
    page.tsx         ← STEP 4: メインUI
  components/        ← STEP 4: TweetCard.tsx 等
  lib/               ← STEP 4: gemini.ts (APIクライアント)
  types/             ← STEP 4: tweet.ts (型定義)
```

---

## 環境変数の扱い方針

`.env.local` に `GEMINI_API_KEY=` を用意（gitignore済み）。

**V1の実装方針：** ユーザーがブラウザのフォームにAPIキーを入力 → リクエストボディで Route Handler に渡す → サーバーサイドで Gemini API を呼ぶ。`.env.local` の変数は V2 以降でキーをサーバー管理に移行する際に使う。

---

## ボイラープレートからの変更点

- `globals.css`：デフォルトのCSS変数・`@theme` ブロックをすべて削除。Tailwind v4 は `@import "tailwindcss"` 1行で動く
- `layout.tsx`：Geist フォントを削除（不要な外部フォント依存を排除）、`lang="ja"` に変更、メタデータをプロジェクト名に更新
- `page.tsx`：デフォルトの Next.js 紹介ページを削除、`bg-gray-950` の最小ページに差し替え
- `public/`：`next.svg`・`vercel.svg` 等のデフォルト画像を削除
- `package.json`：`name` を `scaffold-temp` → `code-tweet` に修正

---

## 動作確認結果

- `npm run build` → ✅ コンパイル成功、TypeScript エラーなし
- 静的ページ生成 `/` → ✅

---

## 次のステップ（STEP 4）

- `@google/generative-ai` SDK インストール
- `src/types/tweet.ts`：型定義作成
- `src/lib/gemini.ts`：Gemini API クライアント実装
- `src/app/api/generate/route.ts`：Route Handler 実装
- `src/app/page.tsx`：メインUI実装（入力フォーム＋ツイートカード）
- `src/components/TweetCard.tsx`：ツイートカードコンポーネント
