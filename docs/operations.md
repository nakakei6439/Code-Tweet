# Code Tweet 運用メモ

最終更新: 2026-05-16

## 運用方針

Code Tweet は開発フェーズから運用フェーズに移行済みです。2026-05 から 2026-10 までは、機能追加より認知、課金転換、計測改善を優先します。

短期目標は Pro 課金者 10 人です。新機能は課金転換や継続率に直結するものだけ検討します。

## 公開前チェック

- 本番 URL、Supabase Redirect URLs、GitHub OAuth callback URL が一致している
- `GEMINI_API_KEY`、Supabase、Stripe、管理画面用の環境変数が本番に設定されている
- Stripe Checkout、Webhook、Customer Portal が本番キーで動く
- `/terms`、`/privacy`、`/contact`、`/pricing`、`/settings` が表示できる
- ゲスト、無料ログイン、Pro の生成回数と README 上限が仕様どおり
- Pro のプライベートリポジトリ取得と生成履歴保存が動く
- 管理画面の Basic 認証、TOTP、失敗回数ロックが動く
- `npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` が通る

## 6ヶ月ロードマップ

| 期間 | 目標 | 主な作業 |
|---|---|---|
| 2026-05 から 2026-06 | 初の Pro 課金 1 件 | X 告知、Zenn/note、静的 LP、Stripe 本番確認手順 |
| 2026-06 から 2026-07 | Pro 3 人 | `/admin` にファネル指標、Clarity 録画確認、導線改善 |
| 2026-07 から 2026-09 | Pro 6 人 | Pro 差別化機能を1つだけ検討。Claude API または履歴改善 |
| 2026-09 から 2026-10 | Pro 10 人 | 6ヶ月運用記録、事例紹介、次フェーズ判断 |

## 定期確認

月初に確認するもの:

- 前月の Pro 課金者数、ログインユーザー数、MAU、月間生成回数
- Stripe Dashboard と Supabase `subscriptions` の差分
- Vercel の課金状況

毎週確認するもの:

- Vercel Logs のエラー
- Clarity 録画 2 から 3 セッション
- X 投稿の反応と流入

毎日確認するもの:

- Stripe / Supabase の異常通知

## やらないこと

- 大規模 UI リニューアル
- Instagram / Threads 対応
- Google AdSense 導入
- 理由のない Vercel Edge Functions 移行
- Pro 10 人到達前の法人化や重い法務レビュー

## 判断基準

1. Pro 課金者数に直結するか
2. 一人で 1 週間以内に完了できるか
3. 効果を計測できるか
4. 既存ユーザー体験を壊さないか
5. 不可逆な変更ではないか
