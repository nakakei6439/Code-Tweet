# CLAUDE.md

このファイルは、リポジトリで作業する Claude Code (claude.ai/code) へのガイダンスを提供します。

## プロジェクト概要・企画

詳細は [`devflow/completed/v1-01-planning.md`](./devflow/completed/v1-01-planning.md) を参照。

プロジェクト概要・機能ロードマップ・ユーザーフロー・技術スタック・収益化方針・競合調査はすべてそのファイルにまとめられている。

## 開発状況

STEP 5（Vercel デプロイ）完了。本番 URL: https://code-tweet.vercel.app/

V2 完了（2026-05-01）：
- ✅ Feature 1: サーバー管理 API キー
- ✅ Feature 2: GitHub URL 連携（公開リポジトリ対応）
- ✅ Feature 3: Google ログイン（Supabase Auth・V2.1 で任意化）
- 保留: Feature 4（履歴保存）/ Feature 5（検索）← X の予約投稿で代替可能なため不要と判断
- ✅ 推奨投稿日時: AI が自動生成してカードに表示（V4 相当を実装済み）

V2.1 完了（2026-05-02）：
- ✅ ログイン任意化（未ログインでも生成可能）
- ✅ 利用回数制限（ゲスト 5 回 / ログイン 10 回 / 日）
- ✅ `GITHUB_TOKEN` 削除（公開リポジトリのみ対応）
- ✅ `SUPABASE_SERVICE_ROLE_KEY` 導入（IP ベースの利用ログ書き込み用）

詳細は [`devflow/completed/v2-00-overview.md`](./devflow/completed/v2-00-overview.md) / [`devflow/completed/v2-1-rate-limit.md`](./devflow/completed/v2-1-rate-limit.md) を参照。

V3 完了（2026-05-04）：
- ✅ GitHub プライベートリポジトリ対応（ユーザー PAT を AES-256-GCM 暗号化して Supabase に保存）
- ✅ `/settings` ページ：PAT の登録・削除・取得ガイド
- ✅ ハンバーガーメニュー（設定・ログイン/ログアウトをドロップダウンに統合）

詳細は [`devflow/completed/v3-01-private-repo.md`](./devflow/completed/v3-01-private-repo.md) を参照。

V8 Phase A 完了（2026-05-04）：
- ✅ 月単位制限導入（ゲスト 月3 / 無料 月10 / 有料 月100）
- ✅ `subscriptions` テーブル + `tier` ベースの機能差別化
- ✅ プライベートリポジトリを Pro 限定に巻き上げ（`/api/github` / `/api/tokens` / `SettingsForm` で tier チェック）
- 保留: Stripe 統合（Phase B で実装）。Phase A 時点では中川さん本人を手動で `tier='paid'` にして利用

詳細は [`devflow/completed/v8-01-freemium-phase-a.md`](./devflow/completed/v8-01-freemium-phase-a.md) を参照。

## 基本情報

- Keita Nakagawa（中川景太）/ GitHub: nakakei6439
- X: @nakakei6439 / Zenn: @nakakei6439

## 回答スタイル

- 挨拶・前置き・段階報告・絵文字禁止。結論ファースト
- 指摘すべきことは率直に指摘

## コンテンツワークフロー

- ブレスト・構成の中間成果は `ideas/[YYYYMMDD]-[topic].md` に即保存
- 複数URLフェッチ時は各完了ごとに進捗報告
- 長時間タスクはステップ分割し、各完了後にファイル保存
- 説明には必ず具体例を含める

## Plan Mode

- プランファイルには**意図**（なぜ必要か）と**選択理由**を含める


## GitHub Project

https://github.com/nakakei6439/Code-Tweet
