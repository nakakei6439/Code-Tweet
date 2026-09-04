"use client";
// AppSS — デバイスフレーム。
// iPhone は Apple Design Resources 公式 Product Bezel (iPhone 16 Pro Max) を使用。
// iPad はスプリント 01 では実機ベゼル画像が無いので暫定の角丸枠で描いている。
// スプリント 04 で iPad 実機ベゼルへ差し替える。
// https://developer.apple.com/design/resources/ — App Store Marketing Artwork
// License Agreement に基づき、ベゼル画像は改変せず画面領域に実アプリのスクショを表示する。
import { useTranslations } from "next-intl";
import * as React from "react";
import { BEZEL, type DeviceKind, bezelRatioFor } from "@/lib/appss/constants";
import { img } from "@/lib/appss/imageCache";

type FrameProps = {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  // 書き出し時にプレースホルダを焼き込まないための抑止フラグ
  hideEmpty?: boolean;
  device?: DeviceKind;
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

// iPad の暫定デバイスフレーム。スプリント 01〜03 で使い、スプリント 04 で実機ベゼルに
// 差し替える。外形は iPad Pro 13インチに近い縦横比（0.75）、黒い画面領域 + 角丸の枠。
// スクショは画面領域に object-fit:cover で収まる（枠外にはみ出さない）。
const TABLET_INSET_PCT = 0.025; // 外枠に対する画面領域の上下左右マージン（暫定）
const TABLET_RADIUS_PCT = 3.2; // 外枠サイズに対する画面領域の角丸（暫定）

export function Tablet({ src, alt = "", style, hideEmpty }: FrameProps) {
  const resolved = img(src);
  const ratio = bezelRatioFor("ipad");
  // aspectRatio は width / height。iPad 13インチは 2064:2752 ≒ 0.75。
  // CSS は `width / height` のフォーマットなので ratio をそのまま渡す。
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: `${ratio}`,
        background: "#0b0f17",
        borderRadius: "5%",
        boxShadow: "inset 0 0 0 2px rgba(148, 163, 184, 0.35)",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: `${TABLET_INSET_PCT * 100}%`,
          overflow: "hidden",
          borderRadius: `${TABLET_RADIUS_PCT}%`,
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
    </div>
  );
}

// 共通エントリ。device prop で iPhone / iPad を切り替える。
export function DeviceFrame(props: FrameProps) {
  if (props.device === "ipad") return <Tablet {...props} />;
  return <Phone {...props} />;
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