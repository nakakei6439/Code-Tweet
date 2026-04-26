# STEP 5: Vercel デプロイメモ - Code Tweet

---

## デプロイ構成

| 項目 | 内容 |
|------|------|
| ホスティング | Vercel |
| デプロイ方法 | Vercel CLI（`npx vercel`） |
| GitHub 連携 | あり（`nakakei6439/Code-Tweet`、`main` ブランチ） |
| ビルドコマンド | `next build`（Vercel が Next.js を自動検出） |
| 出力ディレクトリ | `.next/`（自動） |
| 環境変数 | **不要**（理由は下記） |

---

## 環境変数の扱い方針

`.env.local` に `GEMINI_API_KEY=` を用意しているが、V1 では**空のまま**。

**V1 の方針：** ユーザーがブラウザのフォームに Gemini API キーを入力 → リクエストボディで Route Handler に渡す → サーバーサイドで Gemini API を呼ぶ。Vercel のダッシュボードに環境変数を設定する必要はない。

V2 以降でサーバー管理キーに移行する際に Vercel 環境変数を使う予定。

---

## デプロイ手順

### 1. ビルド確認

```bash
npm run build
```

TypeScript エラー 0・ビルド成功を確認してから進む。

### 2. Preview デプロイ

```bash
npx vercel
```

初回実行時の対話フロー:

| プロンプト | 回答 |
|-----------|------|
| `Set up and deploy?` | Y |
| `Which scope?` | 個人アカウントを選択 |
| `Link to existing project?` | N（新規） |
| `Project name` | `code-tweet`（Enter でデフォルト） |
| `Directory?` | `./`（Enter） |
| `Override settings?` | N（Next.js 自動検出に任せる） |

→ Preview URL（`https://code-tweet-xxx.vercel.app`）が発行される

### 3. 本番デプロイ

```bash
npx vercel --prod
```

→ Production URL（`https://code-tweet.vercel.app` など）が発行される

---

## 動作確認項目

本番 URL で以下を手動確認:

- [ ] ページが表示される（レイアウト崩れなし）
- [ ] Gemini API キーを入力してポスト生成が動く
- [ ] 無効キーで赤エラーバナーが出る
- [ ] コピーボタンが機能する

---

## GitHub 連携（CI/CD）

初回 `npx vercel` 実行後、Vercel と GitHub リポジトリが自動連携される。
以降は `main` ブランチへの push でプレビュー → Production への昇格フローが使える。

---

## 次のステップ（STEP 6）

V2 機能の検討・実装（検索、ユーザー認証、サーバー管理 API キーなど）。
詳細は `step1-planning.md` の機能ロードマップを参照。
