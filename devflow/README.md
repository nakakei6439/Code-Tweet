# devflow — 開発フロー記録

Code Tweet の企画・設計・実装・運用に関する記録の索引。

---

## ガイド

- [00-dev-flow-guide.md](./00-dev-flow-guide.md) — はじめての Web アプリ開発ガイド（参照用）

---

## ✅ completed/ — 完了済み

### V1（MVP）

| # | ファイル | 内容 |
|---|---------|------|
| STEP 1 | [v1-01-planning.md](./completed/v1-01-planning.md) | 企画メモ・要件・ロードマップ |
| STEP 2 | [v1-02-screen-design.md](./completed/v1-02-screen-design.md) | 画面設計（ダークテーマ） |
| STEP 3 | [v1-03-environment.md](./completed/v1-03-environment.md) | 環境構築（Next.js 16 + TS + Tailwind v4） |
| STEP 4 | [v1-04-implementation.md](./completed/v1-04-implementation.md) | Gemini API でポスト生成（コア機能） |
| STEP 5 | [v1-05-deploy.md](./completed/v1-05-deploy.md) | Vercel デプロイ |

### V2（機能拡張）

| # | ファイル | 機能 |
|---|---------|------|
| Index | [v2-00-overview.md](./completed/v2-00-overview.md) | V2 概要・進捗インデックス |
| Feature 1 | [v2-01-server-api-key.md](./completed/v2-01-server-api-key.md) | サーバー管理 API キー |
| Feature 2 | [v2-02-github-url.md](./completed/v2-02-github-url.md) | GitHub URL 連携（公開リポジトリのみ） |
| Feature 3 | [v2-03-google-auth.md](./completed/v2-03-google-auth.md) | Google ログイン（任意） |
| V2.1 | [v2-1-rate-limit.md](./completed/v2-1-rate-limit.md) | 利用回数制限（ゲスト 5 回 / ログイン 10 回） |

### V3（プライベートリポジトリ対応）

| # | ファイル | 機能 |
|---|---------|------|
| V3 | [v3-01-private-repo.md](./completed/v3-01-private-repo.md) | GitHub PAT 暗号化保存・プライベートリポジトリ対応 |

### V8（フリーミアム導入）

| # | ファイル | 機能 |
|---|---------|------|
| V8 Phase A | [v8-01-freemium-phase-a.md](./completed/v8-01-freemium-phase-a.md) | 月単位制限・tier ベース機能差別化（Stripe 統合前の基盤） |
| V8 Phase A.5 | [v8-02-freemium-phase-a-5.md](./completed/v8-02-freemium-phase-a-5.md) | UI 作り込み + GitHub OAuth 一本化 + リポジトリ選択 UI |

---

## ⏸ pending/ — 保留

| # | ファイル | 機能 | 保留理由 |
|---|---------|------|---------|
| Feature 4 | [v2-04-history.md](./pending/v2-04-history.md) | ポスト保存・履歴 | X の予約投稿で代替可能なため不要 |
| Feature 5 | [v2-05-search.md](./pending/v2-05-search.md) | 検索・フィルタ | Feature 4 に依存・同じく保留 |

---

## 次の候補（未着手）

| バージョン | 機能 |
|-----------|------|
| V8 Phase B | Stripe 統合（Checkout・Webhook・Customer Portal・/pricing ページ） |
| V5 | Claude API も選択可能に |
| V9 | Instagram・Threads など他 SNS 対応（保留） |
