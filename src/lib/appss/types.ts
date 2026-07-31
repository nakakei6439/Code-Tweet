// AppSS — App Store スクリーンショットエディタの型定義。
// Based on MIT-licensed https://github.com/ParthJadhav/app-store-screenshots
// (iPhone 縦向き・単一ロケール向けに簡約)

export type SlideLayout =
  | "hero"          // 中央見出し + 下部デバイス
  | "device-bottom" // 見出し上・デバイス下（小さめ見出し）
  | "device-top"    // デバイス上・見出し下（コントラスト用）
  | "two-devices"   // 前後2台のデバイスを重ねる
  | "collage-duo"    // 2台を大胆に傾けて重ねるコラージュ（見出しは画面をまたぐ）
  | "collage-trio"   // 3台を扇状に配置するコラージュ（中央正立・左右は傾けて背面）
  | "no-device";    // デバイス無しの大見出し

// キャンバスpx座標系での要素配置。rotation は度、zIndex は重なり順。
export type ElementTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
};

export type BuiltInElementId = "caption" | "device" | "deviceSecondary" | "deviceTertiary";
export type TextElementId = `text:${string}`;
export type ElementId = BuiltInElementId | TextElementId;

export type SelectedElement = {
  slideId: string;
  elementId: ElementId;
};

export type TextElement = {
  id: string;
  text: string;
  transform: ElementTransform;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
};

export type AppSSSlide = {
  id: string;
  layout: SlideLayout;
  label: string;    // 見出し上の小さなアイキャッチ（例:「かんたん操作」）
  headline: string; // 改行込みの見出し。改行位置は意図的なもの
  // 見出し内で強調する語句（headline の部分文字列）。アクセント色で描画。
  // 一致しなければ強調なし（編集で崩れても安全に無視）。
  emphasis?: string;
  // スクショ参照。IndexedDB 保存画像は "idb:<id>" 形式。data:URL は保存時に禁止
  screenshotRef: string;
  screenshotSecondaryRef?: string; // two-devices / collage-duo / collage-trio の2枚目用
  screenshotTertiaryRef?: string;  // collage-trio の3枚目用
  inverted?: boolean;              // 反転（ダーク）背景
  transforms?: Partial<Record<BuiltInElementId, ElementTransform>>;
  textElements?: TextElement[];
};

export type Theme = {
  id: string;
  name: string;
  bg: string;     // 基本背景
  bgAlt: string;  // 反転背景
  fg: string;     // bg 上の文字色
  fgAlt: string;  // bgAlt 上の文字色
  accent: string;
  muted: string;
  fontId?: FontId; // テーマ推奨フォント（選択時に連動提案）
};

export type FontId =
  | "gothic"
  | "maru"
  | "mincho"
  | "rounded"
  | "dela"
  | "shippori"
  | "klee"
  | "rocknroll"
  | "kaku";

// 背景の装飾スタイル（デッキ全体で共通）。全て CSS グラデ/影のみで export 安全
// （Safari の foreignObject バグ回避のため filter:blur は使わない）。
export type BackgroundStyle = "soft" | "plain" | "grid" | "spotlight" | "stripes";

export type AppSSProject = {
  schemaVersion: number;
  appName: string;
  themeId: string;
  // AI が都度生成したアプリ専用パレット。存在する場合は themeId より優先して描画する。
  // プリセットテーマを手動選択すると解除される。
  customTheme?: Theme;
  fontId: FontId;
  backgroundStyle: BackgroundStyle;
  slides: AppSSSlide[];
};
