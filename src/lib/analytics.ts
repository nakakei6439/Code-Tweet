"use client";

// GA4 ファネル用の「標準イベント」をまとめて送る薄いラッパ。
// 他アプリ（iOS 3本）と名前を統一するため、イベント名は厳守する:
//   activation … 初めて生成に成功した瞬間に1回だけ
//   core_action … 生成に成功するたび（app_name="code-tweet"）
//   sign_up … 新規登録完了時
//   purchase … Pro 課金成立時（Checkout セッションごとに1回）
//
// 個人情報（メール・本文など）はパラメータに一切含めない。数量・種別のみ。
// ページビュー計測は layout.tsx の <GoogleAnalytics /> がすでに担当しているので触らない。
import { sendGAEvent } from "@next/third-parties/google";

export const APP_NAME = "code-tweet";

// 二重送信ガード用の localStorage キー。
const ACTIVATED_KEY = "ct_funnel_activated";
const SIGNUP_SENT_KEY = "ct_funnel_signup_sent";
const PURCHASE_SENT_PREFIX = "ct_funnel_purchase_sent:";

export type GenerationKind = "tweet" | "note";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// <GoogleAnalytics /> の初期化 Script が走る前に本ヘルパーが呼ばれても、
// dataLayer 配列にイベントが積まれれば gtag ロード後に処理される。取りこぼし防止。
function ensureDataLayer(): void {
  if (!isBrowser()) return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
}

// 一度だけ送るイベント用の共通ガード。localStorage が使えない環境では送信を諦める（best-effort）。
function markOnce(key: string): boolean {
  if (!isBrowser()) return false;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}

/** 生成が成功するたびに送る。kind=種別, count=生成件数（非個人情報のみ）。 */
export function trackCoreAction(kind: GenerationKind, count: number): void {
  if (!isBrowser()) return;
  ensureDataLayer();
  sendGAEvent("event", "core_action", {
    app_name: APP_NAME,
    content_type: kind,
    item_count: count,
  });
}

/** 初めて生成に成功した瞬間に1回だけ送る（localStorage フラグで判定）。 */
export function trackActivationOnce(): void {
  if (!markOnce(ACTIVATED_KEY)) return;
  ensureDataLayer();
  sendGAEvent("event", "activation", { app_name: APP_NAME });
}

/** 新規登録完了時に1回だけ送る（method は GitHub OAuth 固定）。 */
export function trackSignUpOnce(): void {
  if (!markOnce(SIGNUP_SENT_KEY)) return;
  ensureDataLayer();
  sendGAEvent("event", "sign_up", { app_name: APP_NAME, method: "github" });
}

/** Pro 課金成立時に、Checkout セッションごとに1回だけ送る。 */
export function trackPurchaseOnce(sessionId: string): void {
  if (!sessionId) return;
  if (!markOnce(PURCHASE_SENT_PREFIX + sessionId)) return;
  ensureDataLayer();
  sendGAEvent("event", "purchase", {
    app_name: APP_NAME,
    plan: "pro",
    value: 500,
    currency: "JPY",
  });
}
