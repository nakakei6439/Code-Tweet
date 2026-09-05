"use client";
// AppSS — デバイスフレーム。
// 2026-09-05 スプリント 04 方針転換: Apple Design Resources 公式 Product Bezel
// (iPhone 16 Pro Max) と、iPad 用の暫定角丸枠は廃止し、iPhone / iPad とも
// 同じ汎用フレーム（角丸の黒枠 + 内側に画面領域）で描く。外形比は
// bezelRatioFor(device) で取得し、aspectRatio にのみ使う。
import { useTranslations } from "next-intl";
import * as React from "react";
import { type DeviceKind, bezelRatioFor } from "@/lib/appss/constants";
import { img } from "@/lib/appss/imageCache";

type FrameProps = {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  // 書き出し時にプレースホルダを焼き込まないための抑止フラグ
  hideEmpty?: boolean;
  device?: DeviceKind;
};

// 外枠に対する画面領域の上下左右マージン（暫定）
const INSET_PCT = 0.025;
// 外枠サイズに対する画面領域の角丸（暫定）
const RADIUS_PCT = 3.2;

// iPhone / iPad で共有する汎用フレーム。
// 黒色の角丸外枠 + 内側に少し余白を取って画面領域を置き、スクショを
// object-fit:cover で枠内に収める（枠外にはみ出さない）。
function GenericFrame({ src, alt = "", style, hideEmpty, ratio }: FrameProps & { ratio: number }) {
  const resolved = img(src);
  // aspectRatio は width / height。CSS は `width / height` のフォーマットなので ratio をそのまま渡す。
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
          inset: `${INSET_PCT * 100}%`,
          overflow: "hidden",
          borderRadius: `${RADIUS_PCT}%`,
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

// 後方互換のために残している iPhone 向けエクスポート。device prop が未指定
// の場合に既定の iPhone として扱う呼び出し側（古い import）に備える。
export function Phone({ src, alt = "", style, hideEmpty, device = "iphone" }: FrameProps) {
  return (
    <GenericFrame
      src={src}
      alt={alt}
      style={style}
      hideEmpty={hideEmpty}
      device={device}
      ratio={bezelRatioFor(device)}
    />
  );
}

// 後方互換のために残している iPad 向けエクスポート。device prop が未指定でも
// iPad として描画する。
export function Tablet({ src, alt = "", style, hideEmpty, device = "ipad" }: FrameProps) {
  return (
    <GenericFrame
      src={src}
      alt={alt}
      style={style}
      hideEmpty={hideEmpty}
      device={device}
      ratio={bezelRatioFor(device)}
    />
  );
}

// 共通エントリ。device prop で iPhone / iPad を切り替える。デフォルトは iPhone。
export function DeviceFrame(props: FrameProps) {
  const kind: DeviceKind = props.device ?? "iphone";
  return <GenericFrame {...props} ratio={bezelRatioFor(kind)} />;
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
