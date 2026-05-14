# Code Tweet 現状要件チェック

**作成日**: 2026-05-10
**対象**: 現在の Code Tweet アプリ実装

このドキュメントは、Web アプリとして必要になりやすい要件・仕組みと、現在の Code Tweet で「できていること」「一部できていること」「まだできていないこと」を照らし合わせたメモです。

---

## 1. 全体サマリー

Code Tweet は、MVP として必要な中核機能はかなり揃っています。

特に、以下は実用レベルまで実装済みです。

- プロジェクト説明や GitHub README から X 向け投稿を 5 件生成する
- App Store / GitHub / Web などの URL 種別に応じたリード文を付ける
- ハッシュタグ補完、推奨投稿日時、280 ウェイトチェックを行う
- GitHub ログイン、利用回数制限、残り回数表示を行う
- 公開リポジトリ README の取得と、ログインユーザーのリポジトリ選択 UI がある

一方で、サービスとして継続運用するには、まだ以下が未完了です。

- 生成履歴の削除・検索・お気に入り化
- 投稿予約や X API 連携
- 外部監視、問い合わせフォーム、請求履歴のアプリ内表示

---

## 2. できているところ

| 項目 | 状態 | 内容 | 主な実装場所 |
|------|------|------|--------------|
| トップ画面 | 完了 | Code Tweet の説明と生成フォームを表示 | `src/app/page.tsx` |
| 投稿生成フォーム | 完了 | プロジェクト説明、GitHub URL、トーン、URL、ハッシュタグを入力できる | `src/components/GenerateForm.tsx` |
| AI 投稿生成 | 完了 | Gemini API で X 向けポストを 5 件生成 | `src/lib/gemini.ts`, `src/app/api/generate/route.ts` |
| 5 件のストーリー構成 | 完了 | 紹介、使い方、ユースケース、共感、CTA の流れで生成 | `src/lib/gemini.ts` |
| URL リード文 | 完了 | App Store / Google Play / GitHub / Web を判定して CTA 文を付ける | `src/lib/gemini.ts` |
| ハッシュタグ補完 | 完了 | 指定タグを含め、関連タグを末尾に補完する | `src/lib/gemini.ts` |
| 推奨投稿日時 | 完了 | 生成ポストごとに投稿日時と理由を表示 | `src/lib/gemini.ts`, `src/components/TweetCard.tsx` |
| 280 ウェイト判定 | 完了 | `twitter-text` で X の weighted length を計測 | `src/lib/gemini.ts`, `src/components/TweetCard.tsx` |
| 自動短縮 | 完了 | 280 ウェイト超過時に最大 4 回まで短縮生成 | `src/lib/gemini.ts` |
| コピー機能 | 完了 | 各ポストをワンクリックでコピーできる | `src/components/TweetCard.tsx` |
| GitHub README 取得 | 完了 | GitHub リポジトリ URL から README を取得 | `src/app/api/github/route.ts` |
| README 文字数上限 | 完了 | ゲスト・無料は 1,000 文字、Pro は 10,000 文字で判定 | `src/lib/generateLimits.ts`, `src/app/api/generate/route.ts`, `src/app/api/github/route.ts` |
| GitHub ログイン | 完了 | Supabase Auth + GitHub OAuth でログインできる | `src/app/auth/callback/route.ts`, `src/components/HeaderActions.tsx` |
| OAuth トークン保存 | 完了 | GitHub provider token を暗号化して保存 | `src/app/auth/callback/route.ts`, `src/lib/encryption.ts` |
| 利用回数制限 | 完了 | ゲスト 3 回まで、無料月 3 回、Pro 月 30 回を判定 | `src/lib/rateLimit.ts` |
| 残り回数表示 | 完了 | フォーム上部に今月の残り回数を表示 | `src/lib/usage.ts`, `src/components/GenerateForm.tsx` |
| 生成履歴保存 | 完了 | Pro ユーザーの生成結果を `/history` に保存。README本文や追加プロンプト本文は保存しない | `src/lib/generationHistory.ts`, `src/app/history/page.tsx` |
| 上限到達 CTA | 完了 | ゲストにはログイン、無料には Pro プランを案内 | `src/components/GenerateForm.tsx` |
| リポジトリ選択 UI | 完了 | ログインユーザーが自分のリポジトリ一覧から選択できる | `src/app/api/repos/route.ts`, `src/components/RepoSelectorModal.tsx` |
| 設定ページ | 完了 | プランと GitHub 連携状態を確認できる | `src/app/settings/page.tsx`, `src/components/SettingsForm.tsx` |
| アカウント削除 | 完了 | アカウント削除 API と二段階確認 UI がある | `src/app/api/account/delete/route.ts`, `src/components/SettingsForm.tsx` |
| 料金ページ | 完了 | 無料と Pro プランの違いを機能比較表で表示（D2 採用、ゲストカードは省略） | `src/app/pricing/page.tsx` |
| About ページ | 完了 | V1（ミニマル縦1カラム）採用。使い方3ステップ + できること4件 + 出力サンプル + 利用枠要約（/pricing へのリンク） | `src/app/about/page.tsx` |
| 管理画面 | 完了 | 管理者限定でユーザー数、生成数、直近7日集計、Pro/連携数、ユーザー別プラン変更、ゲスト利用回数リセットを確認・操作できる | `src/app/admin/page.tsx`, `src/app/admin/actions.ts` |
| 問い合わせページ | 完了 | X と GitHub を問い合わせ窓口として案内 | `src/app/contact/page.tsx` |
| 利用規約 | 完了 | サービス内容、アカウント、利用制限、禁止事項、免責を表示 | `src/app/terms/page.tsx` |
| プライバシーポリシー | 完了 | 取得情報、利用目的、AI 送信、外部サービス、削除、安全管理、問い合わせを表示 | `src/app/privacy/page.tsx` |
| エラーハンドリング | 概ね完了 | Gemini、GitHub、利用上限、認証エラーを表示 | `src/app/api/generate/route.ts`, `src/app/api/github/route.ts` |
| サーバー側 API キー管理 | 完了 | Gemini / Supabase service role / 暗号化キーをサーバー専用で扱う | `.env.local`, `src/lib/*` |

---

## 3. 一部できているところ

| 項目 | 現状 | 足りないこと |
|------|------|--------------|
| Pro プラン | Stripe Checkout / Webhook で `subscriptions.tier = paid` に自動更新できる | Stripe 本番設定と実決済の運用確認が必要 |
| プライベートリポジトリ対応 | paid ユーザーかつ GitHub トークンありなら取得できる設計 | Pro 購入後の通し確認が必要 |
| GitHub 連携 | GitHub OAuth トークンまたは Pro 向け PAT を暗号化保存し、README 取得やリポジトリ一覧取得に使える | OAuth トークン期限切れ・再連携の UX は最低限 |
| 料金ページ | プラン比較と Stripe Checkout 導線がある | 未ログイン時はログイン後に再度 `/pricing` へ戻る必要がある |
| 設定ページ | プラン確認、Pro 向け PAT 管理、Customer Portal、削除導線がある | アプリ内の請求履歴表示はない |
| エラー表示 | 主要エラーは表示できる | エラーの記録・集計・運用通知は未実装 |
| ドキュメント | README、要件定義、履歴ドキュメントがある | 現状との差分が増えやすいので定期更新が必要 |

---

## 4. できていないところ

### 4.1 課金・プラン運用

| 項目 | 状態 | メモ |
|------|------|------|
| Stripe Checkout | 実装済み | `/pricing` から購入する導線がある |
| Stripe Webhook | 実装済み | 決済完了、更新、解約を DB に反映する |
| Customer Portal | 実装済み | ユーザーが Stripe 側で解約・カード変更できる |
| Pro 自動付与 | 実装済み | Webhook で `subscriptions.tier` を更新する |
| 請求履歴表示 | 未実装 | ユーザー向けの支払い履歴画面はない |

### 4.2 投稿・履歴

| 項目 | 状態 | メモ |
|------|------|------|
| 履歴の削除・検索 | 未実装 | 初期版は直近50件の表示のみ。個別削除、検索、お気に入りはない |
| お気に入り保存 | 未実装 | 良い投稿案を後から見返せない |
| 編集保存 | 未実装 | 生成後に編集して保存する機能はない |
| X 予約投稿 | 未実装 | 推奨日時は出るが、実際の予約投稿はユーザーが手動で行う |
| X API 連携 | 未実装 | 投稿・予約・分析は未対応 |

### 4.3 運用・管理

| 項目 | 状態 | メモ |
|------|------|------|
| 管理画面 | 一部実装 | ユーザー数、生成回数、Pro/連携数、プラン変更は確認・操作できる。エラー数、課金転換率、解約率は未実装 |
| 利用状況ダッシュボード | 一部実装 | 管理画面で基本的な生成数は見られる。エラー数、課金転換率、詳細ファネルは未実装 |
| ログ監視 | 一部 | `console.error` はあるが、外部監視サービス連携はない |
| 問い合わせ導線 | 一部実装 | `/contact` で X と GitHub を案内。問い合わせフォームや FAQ は未実装 |
| 利用規約・プライバシーポリシー | 実装済み | `/terms` と `/privacy` を用意。正式な法務レビューは未実施 |

### 4.4 品質保証

| 項目 | 状態 | メモ |
|------|------|------|
| 自動テスト | 未確認 / 不足 | 生成整形、利用制限、GitHub URL パースなどはテストがあると安心 |
| E2E テスト | 未実装 | ログイン、生成、上限到達、設定削除などの通し確認は手動前提 |
| AI 出力の回帰テスト | 未実装 | URL・ハッシュタグ・SCHEDULE の並び崩れを防ぐテストが欲しい |
| アクセシビリティ確認 | 一部 | モーダル等に最低限の属性はあるが、体系的な確認は未実施 |

---

## 5. Web アプリとして必要な仕組みとの対応表

| 観点 | Code Tweet の現状 | 判定 |
|------|-------------------|------|
| ユーザーが解決したい課題 | README や説明文から X 投稿を作る | できている |
| 最初の主要行動 | 説明文または GitHub URL を入れて生成する | できている |
| 成功状態 | 5 件の投稿案、推奨日時、コピーができる | できている |
| 画面構成 | トップ、About、Pricing、Settings、Admin、Terms、Privacy、Contact がある | できている |
| API | 生成、GitHub取得、リポジトリ一覧、利用回数、削除がある | できている |
| DB | ユーザー、利用ログ、IP利用ログ、購読、トークン保存を想定 | 一部できている |
| 認証 | GitHub OAuth ログイン | できている |
| 権限制御 | ゲスト / 無料 / Pro の tier 判定 | 一部できている |
| 課金 | Stripe Checkout / Webhook / Customer Portal を実装済み | 一部できている |
| エラー処理 | 主要エラーはユーザーに表示 | 概ねできている |
| セキュリティ | APIキー秘匿、IPハッシュ、トークン暗号化 | 概ねできている |
| 運用 | 管理画面と基本ログはあるが、外部監視・通知・詳細ファネルはない | 一部できている |
| 継続利用 | ログインと月間回数制限はある | 一部できている |
| データ蓄積 | 利用ログと Pro ユーザーの生成履歴がある | 一部できている |

---

## 6. 優先して追加するとよいもの

### 優先度 A: 有料運用確認に必要

1. Stripe 本番環境変数の設定
2. Checkout 完了後の Pro 自動付与確認
3. Customer Portal での解約・カード変更確認
4. 解約時の無料プラン戻し確認
5. Pro 購入後の private repo 取得確認

### 優先度 B: 品質安定に必要

1. `src/lib/gemini.ts` の整形処理テスト
2. GitHub URL パースのテスト
3. 利用回数制限のテスト
4. 生成失敗時・上限到達時の E2E テスト

### 優先度 C: 継続利用に効く

1. お気に入り保存
2. 生成結果の編集メモ
3. よく使うトーン・ハッシュタグの保存

### 優先度 D: 運用に必要

1. エラー監視
2. 問い合わせフォーム / FAQ
3. 課金転換率・解約率などの管理指標
4. 利用規約・プライバシーポリシーの法務レビュー

---

## 7. まずの結論

現在の Code Tweet は「生成ツールとして使える状態」には到達しています。

次の大きな分岐は、以下のどちらを優先するかです。

1. **有料運用を確認する**
   Stripe 本番設定、Pro 反映、支払い管理、解約時の無料戻しを確認する。

2. **プロダクト品質を固める**
   生成整形のテスト、エラー監視、規約整備を進める。

現状のアプリに一番足りない「仕組み」は、運用と品質保証です。
中核機能はできているので、次は「継続して安心して使ってもらうための周辺機能」を足していく段階です。
