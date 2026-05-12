# V8 Phase A.5: 作り込み（UI 改善 + GitHub OAuth 一本化 + リポジトリ選択 UI + ドキュメント整備）

← [docs 索引に戻る](../index.md)

**完了日**: 2026-05-06

---

## 目的

V8 Phase A 完了後、無料/有料の差を体感させる UI が弱く、GitHub 連携フローの UX も弱かった。本フェーズでは以下を達成：

1. 無料/有料の差を可視化（残り回数表示・上限到達 CTA・プランバッジ）
2. ログインを GitHub OAuth に一本化
3. 「自分のリポジトリから選ぶ」モーダル UI を実装
4. 要件定義書・事業計画書を整備

---

## 料金プランの最新仕様

| 項目 | ゲスト（未ログイン） | 無料（ログイン） | Pro 980円/月 |
|------|------|------|------|
| 生成回数 | 3 回まで | 月 3 回 | 月 30 回 |
| README 上限 | 1,000 文字 | 1,000 文字 | 10,000 文字 |
| 公開リポジトリ | ✅ | ✅ | ✅ |
| プライベートリポジトリ | ❌ | ❌ | ✅ |
| 自分のリポジトリ一覧から選択 | ❌ | ✅（公開のみ） | ✅（公開＋非公開） |

---

## 設計判断

### Google ログイン廃止 → GitHub OAuth 一本化

**理由**：
- ターゲット（個人開発者）は全員 GitHub アカウントを持っている
- GitHub OAuth でログインすれば、無料ユーザーでも公開リポジトリ一覧から選択できる
- Pro のプライベートリポジトリ対応は、現行実装では `/settings` の fine-grained PAT 登録を併用する
- 認証プロバイダが 2 つある場合の identity linking 複雑性を排除
- 既存ユーザーは中川さん本人のみで移行コストはゼロ

### 認証種別

GitHub **OAuth App**（GitHub App ではない）を使用。Supabase Auth がネイティブサポートしているため。
GitHub App はトークン 1 時間 expire・install 手順追加・refresh 実装などが必要で実装コスト 3〜5 倍になる。

---

## 実装した 6 項目

### 1. 残り回数表示

| ファイル | 内容 |
|---------|------|
| `src/types/usage.ts` | `UsageInfo` 型定義（`tier`, `used`, `limit`, `remaining`, `resetAt`） |
| `src/lib/usage.ts` | `getUserUsage(userId)` / `getGuestUsage(ipHash)` ヘルパー |
| `src/app/api/usage/route.ts` | GET。ログイン状態に応じて usage を返す |
| `src/app/page.tsx` | Server Component で初期 usage を取得して GenerateForm に渡す |
| `src/components/GenerateForm.tsx` | フォーム上部に `UsageBadge` を表示。生成成功後にリフェッチ |
| `src/lib/rateLimit.ts` | `getMonthWindowStart` / `getNextMonthStart` を export |

### 2. 上限到達エラーの CTA

| ファイル | 内容 |
|---------|------|
| `src/types/tweet.ts` | `GenerateErrorCode = 'guest_limit' \| 'free_limit' \| 'paid_limit'` 追加 |
| `src/lib/rateLimit.ts` | `RateLimitResult` に `code` フィールド追加 |
| `src/app/api/generate/route.ts` | 429 時のエラーレスポンスに `code` を含める |
| `src/components/GenerateForm.tsx` | エラー時に code に応じて CTA ボタン表示。`GuestLimitCTA`（GitHub ログイン）/ `FreeLimitCTA`（Pro へアップグレード）を内部コンポーネント化 |

### 3. ヘッダー / 設定ページの仕上げ

| ファイル | 内容 |
|---------|------|
| `src/components/Header.tsx` | tier を server で取得して `HeaderActions` に渡す |
| `src/components/HeaderActions.tsx` | ドロップダウンに `Pro` / `Free` バッジ。Free 時は「Pro プランを見る」リンク表示 |
| `src/app/settings/page.tsx` | 「現在のプラン」カードに「アップグレード」or「解約・支払い管理（disabled）」ボタン |
| `src/components/SettingsForm.tsx` | 無料ロック画面に「Pro プランへアップグレード」CTA |

### 4. GitHub OAuth ログイン一本化

| ファイル | 内容 |
|---------|------|
| `src/app/auth/callback/route.ts` | OAuth セッションから `provider_token` を取り出し、AES-256-GCM で暗号化して `user_tokens` に保存（`source='github_oauth'`） |
| `src/components/AuthOverlay.tsx` | `provider: 'github'` + scope `read:user user:email` |
| `src/components/HeaderActions.tsx` | 「Google でログイン」→「GitHub でログイン」に置換（GitHub アイコン付き） |
| `src/components/GenerateForm.tsx` | `GuestLimitCTA` を「GitHub でログイン」に置換 |
| `src/lib/rateLimit.ts` | エラーメッセージの「Google ログイン」を「GitHub ログイン」に |
| `src/components/SettingsForm.tsx` | 無料ユーザーには Pro ロック画面を表示。Pro ユーザーには fine-grained PAT 登録・削除 UI とアカウント削除 UI を表示 |
| `src/app/settings/page.tsx` | プラン表示、支払い管理プレースホルダー、Pro 向け PAT 管理の入口を表示 |
| `src/app/api/github/route.ts` | エラーメッセージを「再ログインしてください」系に統一 |
| `src/app/api/tokens/route.ts` | Pro ユーザーのみ PAT 登録・削除可能。保存前に GitHub `/user` で検証 |

### 5. リポジトリ選択 UI

| ファイル | 内容 |
|---------|------|
| `src/app/api/repos/route.ts` | GET。保存済みアクセストークンで GitHub `/user/repos` を叩いて返す。無料は `visibility=public&affiliation=owner`、Pro は `visibility=all&affiliation=owner,collaborator,organization_member` |
| `src/components/RepoSelectorModal.tsx` | 検索可能なモーダル。private repo に鍵バッジ |
| `src/components/GenerateForm.tsx` | GitHub URL 入力欄の下に「自分のリポジトリから選ぶ」リンク。クリックで `/api/repos` を叩いてモーダル表示 |

### 6. ドキュメント整備

| ファイル | 内容 |
|---------|------|
| `docs/product/requirements.md` | 新規。要件定義書（機能要件・非機能要件・ロール・ユーザーストーリー） |
| `docs/product/business-plan.md` | 新規。事業計画書（市場分析・収益モデル・コスト試算・KPI） |
| `docs/history/v8-02-freemium-phase-a-5.md` | 本ファイル（実装記録） |

---

## Supabase マイグレーション

```sql
-- user_tokens に source カラム追加
ALTER TABLE user_tokens
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'pat'
  CHECK (source IN ('pat', 'github_oauth'));
```

クリーンアップ（既存ユーザー = 中川さん本人のみ）：

```sql
DELETE FROM subscriptions WHERE user_id = '<old_google_user_id>';
DELETE FROM user_tokens WHERE user_id = '<old_google_user_id>';
DELETE FROM usage_logs WHERE user_id = '<old_google_user_id>';
```

---

## 手動作業（Supabase / GitHub）

1. **GitHub OAuth App 作成**: https://github.com/settings/developers → New OAuth App
   - Authorization callback URL: `https://<supabase-ref>.supabase.co/auth/v1/callback`
2. **Supabase Authentication → Providers**
   - Google を **Disable**
   - GitHub を **Enable**（Client ID / Secret 貼り付け）
3. **既存 Google ログインユーザー削除**（Authentication → Users）
4. GitHub で再ログイン → 新 user_id を確認 → `subscriptions` に Pro 登録

---

## 動作確認

- ✅ ホーム：プランバッジ + 残り回数表示
- ✅ ヘッダー：Pro / Free バッジ
- ✅ リポジトリ選択モーダル：無料は公開リポジトリ、Pro は公開＋非公開リポジトリが一覧表示・検索可能
- ✅ リポジトリ選択 → URL 自動補完 → README 自動取得 → 生成成功
- ✅ 無料切替時：CTA ボタン表示・Pro ロック画面
- ✅ Pro 切替時：PAT 登録・削除 UI 表示
- ✅ ゲスト：「GitHub でログイン」CTA

---

## Phase B（次工程）

実際に課金できるようにする：

1. Stripe アカウント開設（中川さん作業）
2. Product / Price ¥980/月 作成
3. `STRIPE_*` 環境変数追加
4. `src/lib/stripe.ts`、`src/app/api/stripe/{checkout,webhook,portal}/route.ts`
5. `src/app/pricing/page.tsx`（決済ボタン）
6. `subscriptions` テーブルを Webhook で更新

---

## ステータス

**V8 Phase A.5 完了（2026-05-06）。** GitHub OAuth ログインが本番でも稼働中。決済機能は Phase B で実装予定。
