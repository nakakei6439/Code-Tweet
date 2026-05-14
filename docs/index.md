# Code Tweet ドキュメント索引

Code Tweet の現在仕様、事業計画、実装履歴をまとめたドキュメント置き場。

---

## まず見るもの

| ファイル | 内容 |
|---|---|
| [current-requirements-status.md](./current-requirements-status.md) | 現在の Code Tweet と一般的な Web アプリ要件の達成状況 |
| [product/requirements.md](./product/requirements.md) | 現在の要件定義。機能、ロール、制約、ユーザーストーリー |
| [product/business-plan.md](./product/business-plan.md) | 事業計画。ターゲット、収益モデル、KPI、ロードマップ |
| [launch-checklist.md](./launch-checklist.md) | 一般公開前の環境変数・外部サービス・手動確認チェックリスト |
| [development-guide.md](./development-guide.md) | 開発フローの参照ガイド |
| [admin-security.sql](./admin-security.sql) | 管理画面のBasic認証/TOTP失敗回数ロック用テーブル |
| [tweet-generations.sql](./tweet-generations.sql) | 生成履歴保存用テーブル |

---

## 実装履歴

### V1（MVP）

| # | ファイル | 内容 |
|---|---|---|
| STEP 1 | [v1-01-planning.md](./history/v1-01-planning.md) | 企画メモ・要件・ロードマップ |
| STEP 2 | [v1-02-screen-design.md](./history/v1-02-screen-design.md) | 画面設計（ダークテーマ） |
| STEP 3 | [v1-03-environment.md](./history/v1-03-environment.md) | 環境構築（Next.js 16 + TS + Tailwind v4） |
| STEP 4 | [v1-04-implementation.md](./history/v1-04-implementation.md) | Gemini API でポスト生成（コア機能） |
| STEP 5 | [v1-05-deploy.md](./history/v1-05-deploy.md) | Vercel デプロイ |

### V2（機能拡張）

| # | ファイル | 内容 |
|---|---|---|
| Index | [v2-00-overview.md](./history/v2-00-overview.md) | V2 概要・進捗インデックス |
| Feature 1 | [v2-01-server-api-key.md](./history/v2-01-server-api-key.md) | サーバー管理 API キー |
| Feature 2 | [v2-02-github-url.md](./history/v2-02-github-url.md) | GitHub URL 連携（公開リポジトリのみ） |
| Feature 3 | [v2-03-google-auth.md](./history/v2-03-google-auth.md) | ユーザー認証（当時は Google、現在は GitHub OAuth に移行済み） |
| V2.1 | [v2-04-rate-limit.md](./history/v2-04-rate-limit.md) | 利用回数制限（当時はゲスト 5 回 / ログイン 10 回、現在は V8 の月単位制限へ移行済み） |

### V3 / V8

| # | ファイル | 内容 |
|---|---|---|
| V3 | [v3-01-private-repo.md](./history/v3-01-private-repo.md) | GitHub PAT 暗号化保存・プライベートリポジトリ対応 |
| V8 Phase A | [v8-01-freemium-phase-a.md](./history/v8-01-freemium-phase-a.md) | 月単位制限・tier ベース機能差別化（Stripe 統合前の基盤） |
| V8 Phase A.5 | [v8-02-freemium-phase-a-5.md](./history/v8-02-freemium-phase-a-5.md) | UI 作り込み + GitHub OAuth 一本化 + リポジトリ選択 UI |
| V9 | [v9-01-generation-history.md](./history/v9-01-generation-history.md) | Pro ユーザー向け生成履歴保存 |
| 現在 | [current-requirements-status.md](./current-requirements-status.md) | 管理画面、規約、プライバシーポリシー、問い合わせ導線を含む現状チェック |

---

## 次にやること

| 優先度 | 内容 |
|---|---|
| 1 | Pro 向け運用確認（Checkout、Webhook、Customer Portal、解約時の無料プラン戻し、private repo 取得確認） |
| 2 | エラー監視、問い合わせフォームは利用状況を見て優先度判断 |
| 3 | Claude API 選択や他 SNS 対応は、Pro 導入後の利用状況で判断 |

生成履歴保存は実装済み。Pro ユーザーの生成結果だけを保存し、README本文や追加プロンプト本文は保存しない。
