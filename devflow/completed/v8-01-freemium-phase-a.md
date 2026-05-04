# V8 Phase A: フリーミアム導入（Stripe 統合前の基盤）

← [devflow 索引に戻る](../README.md)

**完了日**: 2026-05-04

---

## 目的

V3 まで完了した時点では全機能が無料・全員に開放されていた。
ターゲット「毎週コンスタントにポストする個人開発者（週 5〜10 回・月 1,000 円なら払う）」に対し、現状の無料枠（10/日 = 月最大 300 回）は大盤振る舞いすぎて誰も課金しない設計だった。

**Phase A では Stripe を入れずに、月単位制限と tier ベースの機能差別化を先行実装**。中川さん（自分）の Supabase レコードを手動で `tier='paid'` に変えれば動作確認・自分用利用は可能な状態にする。決済導入は Phase B に分離。

---

## 仕様（確定）

| 項目 | ゲスト（未ログイン） | 無料（ログイン） | 有料（Pro） |
|------|------|------|------|
| 月間生成回数 | 3 回 | 10 回 | 100 回 |
| 公開リポジトリ | ✅ | ✅ | ✅ |
| プライベートリポジトリ（PAT） | ❌ | ❌ | ✅ |
| AI モデル | Gemini Flash | Gemini Flash | Gemini Flash |

**価格**: Pro 980 円/月（Phase B で実装）

**ターゲット選定**:
- A: 毎週コンスタントにポストする個人開発者 ⭐
- B: 複数プロダクト運営者（市場が狭く除外）
- C: 初心者層（課金率が低く除外）

**設計判断**:
- 制限単位を「日」→「月」に変更（ターゲット A が 2 週間で枯渇する設計）
- プライベートリポジトリは V3 でログイン全員に開放済みだったが、V8 で「有料限定」に巻き上げ。既存ユーザーは中川さん本人のみ（合意済み）のため影響ゼロ
- Claude 切替は別バージョン V5 として将来実装、その際に有料限定設計を踏襲
- ゲスト枠は IP ベースで回避されやすいが「すぐ試せる体験」のため最小限残す
- AI モデル切替はやらない（V8 のスコープを Stripe + 月単位制限に絞るため）

---

## Supabase マイグレーション

SQL Editor で実行：

```sql
CREATE TABLE subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);
-- INSERT/UPDATE は service_role（Phase B の Webhook）のみ
```

中川さん本人を Pro 化（Phase A 動作確認用）：

```sql
INSERT INTO subscriptions (user_id, tier)
VALUES ('f9dc2641-f485-4366-8649-e13e7f268e71', 'paid');
```

---

## 環境変数

Phase A では **新規追加なし**。既存の `SUPABASE_SERVICE_ROLE_KEY` を tier 取得にも流用する。
Stripe 用の `STRIPE_SECRET_KEY` などは Phase B で追加。

---

## 新規・変更ファイル

| ファイル | 変更 | 内容 |
|---------|------|------|
| `src/lib/subscription.ts` | 新規 | `getSubscriptionTier(userId)` ヘルパー。admin client で `subscriptions` を引いて `'free' \| 'paid'` を返す。レコードなしは `'free'` |
| `src/lib/rateLimit.ts` | 変更 | 定数を月単位に：`GUEST_MONTHLY_LIMIT=3` / `USER_FREE_MONTHLY_LIMIT=10` / `USER_PAID_MONTHLY_LIMIT=100`。`getDayWindowStart()` → `getMonthWindowStart()`（UTC カレンダー月の 1 日 0 時）。`checkUserLimit()` 第 3 引数に `tier` 追加 |
| `src/app/api/generate/route.ts` | 変更 | ログインユーザーは `getSubscriptionTier()` を呼んで `checkUserLimit()` に渡す |
| `src/app/api/github/route.ts` | 変更 | PAT 取得前に `tier === 'paid'` をチェック。無料ユーザーは PAT を読み込まず public 扱い。403/404 のエラーメッセージを「Pro プラン必要」に分岐追加 |
| `src/app/api/tokens/route.ts` | 変更 | POST で `tier !== 'paid'` の場合 403 を返す（無料ユーザーが直接 API を叩いて PAT 登録するのを防ぐ） |
| `src/app/settings/page.tsx` | 変更 | 「現在のプラン」表示カードを追加。PAT 取得ガイドは `isPaid` の時のみ表示 |
| `src/components/SettingsForm.tsx` | 変更 | `isPaid` props を追加。無料ユーザーには「Pro 限定」のロック画面を返す（PAT 入力不可） |

---

## 動作確認

### Pro ユーザー（中川さん本人）

- ✅ `/settings` で「Pro / 月 980 円」表示
- ✅ PAT 入力フォームと取得ガイド（8 ステップ）が表示
- ✅ 公開リポジトリ → 取得・生成成功
- ✅ プライベートリポジトリ → 取得成功

### 無料ユーザー（一時的に `tier='free'` に戻して確認）

- ✅ `/settings` で「無料プラン」表示
- ✅ PAT 入力欄が「Pro 限定」のロック画面
- ✅ プライベートリポジトリ → 「Pro プラン必要」エラー
- ✅ 公開リポジトリは引き続き使える

確認後、`UPDATE subscriptions SET tier='paid' WHERE user_id=...` で Pro に戻す。

---

## 月境界の判断

`getMonthWindowStart()` は **UTC のカレンダー月の 1 日 00:00** を返す。
理由：JST と UTC で月境界が 9 時間ずれるが、実装シンプルさ優先。月初 0〜9 時にリセットされる体験。

```ts
function getMonthWindowStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
```

---

## 既存データの扱い

- `usage_logs` / `ip_usage_logs` の旧日単位レコードはそのまま放置。月単位カウントは「月初以降のレコード数」で判定するため、過去レコードは自然に無視される
- Supabase 確認時点で既存ユーザーは中川さん 1 名のみ。他ユーザーゼロのため新ルールいきなり適用で問題なし

---

## Phase B（次工程）のスコープ

Phase A は基盤のみ。実際に課金できるようにするには以下を Phase B で実装：

1. Stripe アカウント開設・Product/Price 設定（中川さん作業）
2. 環境変数 `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` 追加
3. `src/lib/stripe.ts`（Stripe クライアント）
4. `src/app/api/stripe/checkout/route.ts`（Checkout Session 作成）
5. `src/app/api/stripe/webhook/route.ts`（`subscriptions` テーブルを Webhook で更新）
6. `src/app/api/stripe/portal/route.ts`（Customer Portal で解約）
7. `src/app/pricing/page.tsx`（料金プラン比較・アップグレードボタン）

---

## ステータス

**Phase A 完了（2026-05-04）。** 月単位制限・tier ベース機能差別化が稼働。決済機能は Phase B で実装予定。
