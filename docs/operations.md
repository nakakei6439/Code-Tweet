# Code Tweet 運用メモ

最終更新: 2026-07-18

## 運用方針

Code Tweet は開発フェーズから運用フェーズに移行済みです。2026-05 から 2026-10 までは、機能追加より認知、課金転換、計測改善を優先します。

短期目標は課金者（旧 Pro + クレジット購入者）10 人です。新機能は課金転換や継続率に直結するものだけ検討します。

## 本番ヘルスチェック

- 本番 URL、Supabase Redirect URLs、GitHub OAuth callback URL が一致している
- `GEMINI_API_KEY`、Supabase、Stripe、管理画面用の環境変数が本番に設定されている
- Stripe Checkout（クレジットパック）、Webhook、Customer Portal が本番キーで動く
- `/terms`、`/privacy`、`/contact`、`/pricing`、`/settings` が表示できる
- `/appss`、`/?tab=appss`、`/about/appss` が表示でき、コピー生成・透かし解除書き出しが動く
- ゲスト、無料ログイン、クレジット購入者の生成回数と README 上限が仕様どおり（Code Tweet / note Draft / App SS で合算）
- クレジット購入者のプライベートリポジトリ取得と生成履歴保存が動く
- 管理画面の Basic 認証、TOTP、失敗回数ロックが動く
- `npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` が通る

課金導線を伸ばす前に、決済、認証、利用制限、RLS、非公開 README 取得の不整合を先に潰します。

## 優先タスク

### 1. `/admin` に課金ファネル指標を追加

管理画面で、課金転換の詰まりどころを見えるようにします。

- ゲスト生成数
- ログイン生成数
- 無料ユーザー数
- Pro ユーザー数
- GitHub 連携ユーザー数
- 生成履歴利用数
- Checkout 開始数
- 無料から Pro への転換率

### 2. 初回 Pro 課金 1 件を取りに行く告知セットを作る

コード変更よりも、まず実際の流入と反応を作ります。

- X 投稿 5 から 10 本
- Zenn または note の紹介記事 1 本
- README から投稿を作る実例
- 個人開発者向けの短い利用例
- Pro の価値が伝わる比較文

### 3. Pro 導線を軽く改善する

大規模 UI 改修ではなく、課金判断のタイミングを整えます。

- 無料上限到達時の表示
- 生成完了後の案内
- 履歴ページ
- 設定ページ
- 料金ページ

### 4. エラー監視・運用通知を整える

毎日ログを見る運用から、問題を見つけやすい運用に寄せます。

- Gemini API エラー
- Stripe Webhook エラー
- Supabase 書き込み失敗
- GitHub README 取得失敗
- 管理画面ログイン失敗の増加

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

- Claude API 対応
- 大規模 UI リニューアル
- Instagram / Threads 対応
- Google AdSense 導入
- 上位プラン追加
- 理由のない Vercel Edge Functions 移行
- Pro 10 人到達前の法人化や重い法務レビュー

## 判断基準

1. Pro 課金者数に直結するか
2. 一人で 1 週間以内に完了できるか
3. 効果を計測できるか
4. 既存ユーザー体験を壊さないか
5. 不可逆な変更ではないか
