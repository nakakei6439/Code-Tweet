"use client";

import { useEffect } from "react";
import { trackSignUpOnce, trackPurchaseOnce } from "@/lib/analytics";

// リダイレクト着地時のクエリを見て、ファネル用 sign_up / purchase を送る常設コンポーネント。
//  - sign_up  … OAuth callback が新規登録時に付ける ?signup=1 を検知
//  - purchase … Stripe 成功リダイレクトの ?checkout=success&session_id=... を検知
// 送信後は該当クエリを URL から取り除き、リロードによる重複や見た目のノイズを防ぐ。
// （送信自体の二重防止は analytics.ts 側の localStorage ガードが担保する）
export default function FunnelAnalytics() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let mutated = false;

    if (params.get("signup") === "1") {
      trackSignUpOnce();
      params.delete("signup");
      mutated = true;
    }

    if (params.get("checkout") === "success") {
      const sessionId = params.get("session_id");
      if (sessionId) {
        trackPurchaseOnce(sessionId);
        params.delete("session_id");
        mutated = true;
      }
    }

    if (mutated) {
      const query = params.toString();
      const nextUrl =
        window.location.pathname + (query ? `?${query}` : "") + window.location.hash;
      window.history.replaceState(null, "", nextUrl);
    }
  }, []);

  return null;
}
