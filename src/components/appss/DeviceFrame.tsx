"use client";
// AppSS — iPhone デバイスフレーム。
// Apple Design Resources 公式 Product Bezel (iPhone 16 Pro Max) を使用。
// https://developer.apple.com/design/resources/ — App Store Marketing Artwork
// License Agreement に基づき、ベゼル画像は改変せず画面領域に実アプリのスクショを表示する。
import { useTranslations } from "next-intl";
import * as React from "react";
import { BEZEL } from "@/lib/appss/constants";
import { img } from "@/lib/appss/imageCache";

type FrameProps = {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  // 書き出し時にプレースホルダを焼き込まないための抑止フラグ
  hideEmpty?: boolean;
};

const S = BEZEL.screen;
const pct = (n: number, base: number) => `${(n / base) * 100}%`;

export function Phone({ src, alt = "", style, hideEmpty }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: `${BEZEL.w} / ${BEZEL.h}`, ...style }}>
      {/* 画面（ベゼルの下層に敷く。Dynamic Island はベゼル側に描画済み） */}
      <div
        style={{
          position: "absolute",
          overflow: "hidden",
          left: pct(S.x, BEZEL.w),
          top: pct(S.y, BEZEL.h),
          width: pct(S.w, BEZEL.w),
          height: pct(S.h, BEZEL.h),
          borderRadius: `${(S.radius / S.w) * 100}% / ${(S.radius / S.h) * 100}%`,
          background: "#111",
        }}
      >
        {resolved ? (
          <img
            src={resolved}
            alt={alt}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            draggable={false}
          />
        ) : hideEmpty ? null : (
          <EmptySlot />
        )}
      </div>
      <img
        src={img(BEZEL.src)}
        alt=""
        style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%", zIndex: 10, pointerEvents: "none" }}
        draggable={false}
      />
    </div>
  );
}

function EmptySlot() {
  const t = useTranslations("appssCanvas");
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4%",
        color: "rgba(255,255,255,0.45)",
        background: "linear-gradient(160deg, #1f2937 0%, #111827 100%)",
        textAlign: "center",
        padding: "8%",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: "22%", opacity: 0.7 }} aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      </svg>
      <div style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.4 }}>
        {t("dropLine1")}
        <br />
        {t("dropLine2")}
      </div>
    </div>
  );
}
