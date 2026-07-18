// AppSS — 日本語スターターデッキ。
import {
  DEFAULT_BACKGROUND_STYLE,
  DEFAULT_FONT_ID,
  DEFAULT_THEME_ID,
  PROJECT_SCHEMA_VERSION,
  THEMES,
  buildCustomTheme,
  isBackgroundStyle,
} from "./constants";
import type { AppSSProject, AppSSSlide, BackgroundStyle } from "./types";
import type { AppSSCopySlideIdea, GeneratedPalette } from "@/types/appss";

let _id = 0;
export const nid = () => `s_${Date.now().toString(36)}_${(_id++).toString(36)}`;

export function makeStarterSlides(): AppSSSlide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: "あなたのアプリ",
      headline: "毎日が、\nもっとラクに。",
      screenshotRef: "",
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: "かんたん操作",
      headline: "迷わず使える\nシンプル設計",
      screenshotRef: "",
    },
    {
      id: nid(),
      layout: "two-devices",
      label: "機能いろいろ",
      headline: "2つの画面で\n魅力を伝える",
      screenshotRef: "",
      screenshotSecondaryRef: "",
    },
    {
      id: nid(),
      layout: "device-top",
      label: "こだわり",
      headline: "細部まで\n美しく",
      screenshotRef: "",
      inverted: true,
    },
    {
      id: nid(),
      layout: "collage-duo",
      label: "見比べてみて",
      headline: "使う前と後で\nこんなに変わる",
      screenshotRef: "",
      screenshotSecondaryRef: "",
    },
    {
      id: nid(),
      layout: "collage-trio",
      label: "機能いろいろ",
      headline: "うれしい機能が\n盛りだくさん",
      screenshotRef: "",
      screenshotSecondaryRef: "",
      screenshotTertiaryRef: "",
    },
    {
      id: nid(),
      layout: "no-device",
      label: "今すぐ",
      headline: "無料で\nはじめよう",
      screenshotRef: "",
    },
  ];
}

export function makeDefaultProject(): AppSSProject {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    appName: "マイアプリ",
    themeId: DEFAULT_THEME_ID,
    fontId: DEFAULT_FONT_ID,
    backgroundStyle: DEFAULT_BACKGROUND_STYLE,
    slides: makeStarterSlides(),
  };
}

// AI が生成したコピー案から新規プロジェクトを構築する。
// スクショ画像は空（ユーザーがエディタで入れる）。トップからの導線・
// エディタ内の「全て適用」で共通利用する。
// themeId / backgroundStyle を渡すとその配色・背景で着地する（不正値は既定にフォールバック）。
// generatedPalette があれば AI 生成のアプリ専用配色（customTheme）を優先して適用する。
export function projectFromCopy(
  appName: string,
  ideas: AppSSCopySlideIdea[],
  themeId?: string,
  backgroundStyle?: string,
  screenshotRefs?: string[],
  generatedPalette?: GeneratedPalette,
): AppSSProject {
  // 事前登録したスクショを、デバイスを持つスライドへ登録順に割り当てる。
  // no-device のスライドは画像を持たないためスキップ。2枚デバイスのレイアウトは余りがあれば
  // 副画像にも次の ref を充てる。ref は idb:参照（端末内のみ・サーバー非経由）。
  const refs = screenshotRefs ?? [];
  let cursor = 0;
  const nextRef = () => (cursor < refs.length ? refs[cursor++] : "");
  const hasSecondaryDevice = (layout: AppSSSlide["layout"]) =>
    layout === "two-devices" || layout === "collage-duo" || layout === "collage-trio";
  const hasTertiaryDevice = (layout: AppSSSlide["layout"]) => layout === "collage-trio";

  const slides: AppSSSlide[] = ideas.map((idea) => {
    const hasDevice = idea.layoutHint !== "no-device";
    const primary = hasDevice ? nextRef() : "";
    const secondary = hasSecondaryDevice(idea.layoutHint) ? nextRef() : "";
    const tertiary = hasTertiaryDevice(idea.layoutHint) ? nextRef() : "";
    return {
      id: nid(),
      layout: idea.layoutHint,
      label: idea.label,
      headline: idea.headline,
      ...(idea.emphasis ? { emphasis: idea.emphasis } : {}),
      screenshotRef: primary,
      ...(hasSecondaryDevice(idea.layoutHint) ? { screenshotSecondaryRef: secondary } : {}),
      ...(hasTertiaryDevice(idea.layoutHint) ? { screenshotTertiaryRef: tertiary } : {}),
      ...(idea.layoutHint === "device-top" ? { inverted: true } : {}),
    };
  });
  const theme = themeId ? THEMES[themeId] : undefined;
  const bg: BackgroundStyle = isBackgroundStyle(backgroundStyle)
    ? backgroundStyle
    : DEFAULT_BACKGROUND_STYLE;
  const customTheme = generatedPalette ? buildCustomTheme(generatedPalette, theme?.fontId) : undefined;
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    appName: appName.trim() || "マイアプリ",
    themeId: theme ? theme.id : DEFAULT_THEME_ID,
    ...(customTheme ? { customTheme } : {}),
    fontId: theme?.fontId ?? DEFAULT_FONT_ID,
    backgroundStyle: bg,
    slides: slides.length > 0 ? slides : makeStarterSlides(),
  };
}
