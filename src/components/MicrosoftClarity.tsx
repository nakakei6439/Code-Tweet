"use client";

import { useEffect } from "react";

export default function MicrosoftClarity() {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
    if (!projectId) return;

    // SDK 本体を初期バンドルから外し、ハイドレーション後の空き時間に初期化する。
    // 計測の取りこぼしを避けつつ、初回表示のメインスレッドと競合させない。
    const start = () => {
      void import("@microsoft/clarity").then((m) => m.default.init(projectId));
    };

    const ric = window.requestIdleCallback;
    if (ric) {
      const id = ric(start);
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(start, 2000);
    return () => clearTimeout(t);
  }, []);

  return null;
}
