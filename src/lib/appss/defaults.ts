// AppSS — 初期スターターデッキ。
//
// スライドの見本テキストは「UI ラベル」ではなくユーザーが編集する初期コンテンツなので、
// 呼び出し側（useAppSSProject）が翻訳済みの StarterCopy を渡す設計にしている。
// 引数を省略した場合は英語にフォールバックする（テストやサーバー側の保険）。
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

/** 初期スライドの見本テキスト。slides は 7 枚ぶんを順に使う。 */
export type StarterCopy = {
  appName: string;
  slides: { label: string; headline: string }[];
};

const FALLBACK_STARTER: StarterCopy = {
  appName: "My App",
  slides: [
    { label: "Your app", headline: "Make every day\neasier." },
    { label: "Simple to use", headline: "Designed so you\nnever get lost" },
    { label: "Plenty to explore", headline: "Two screens to\nshow it off" },
    { label: "Crafted with care", headline: "Beautiful down\nto the details" },
    { label: "See the difference", headline: "Before and after,\nside by side" },
    { label: "Plenty to explore", headline: "Packed with\nfeatures you'll love" },
    { label: "Get started", headline: "Start free\ntoday" },
  ],
};

function slideCopy(copy: StarterCopy | undefined, index: number) {
  return (copy ?? FALLBACK_STARTER).slides[index] ?? FALLBACK_STARTER.slides[index];
}

export function makeStarterSlides(copy?: StarterCopy): AppSSSlide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: slideCopy(copy, 0).label,
      headline: slideCopy(copy, 0).headline,
      screenshotRef: "",
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: slideCopy(copy, 1).label,
      headline: slideCopy(copy, 1).headline,
      screenshotRef: "",
    },
    {
      id: nid(),
      layout: "two-devices",
      label: slideCopy(copy, 2).label,
      headline: slideCopy(copy, 2).headline,
      screenshotRef: "",
      screenshotSecondaryRef: "",
    },
    {
      id: nid(),
      layout: "device-top",
      label: slideCopy(copy, 3).label,
      headline: slideCopy(copy, 3).headline,
      screenshotRef: "",
      inverted: true,
    },
    {
      id: nid(),
      layout: "collage-duo",
      label: slideCopy(copy, 4).label,
      headline: slideCopy(copy, 4).headline,
      screenshotRef: "",
      screenshotSecondaryRef: "",
    },
    {
      id: nid(),
      layout: "collage-trio",
      label: slideCopy(copy, 5).label,
      headline: slideCopy(copy, 5).headline,
      screenshotRef: "",
      screenshotSecondaryRef: "",
      screenshotTertiaryRef: "",
    },
    {
      id: nid(),
      layout: "no-device",
      label: slideCopy(copy, 6).label,
      headline: slideCopy(copy, 6).headline,
      screenshotRef: "",
    },
  ];
}

export function makeDefaultProject(copy?: StarterCopy): AppSSProject {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    appName: (copy ?? FALLBACK_STARTER).appName,
    themeId: DEFAULT_THEME_ID,
    fontId: DEFAULT_FONT_ID,
    backgroundStyle: DEFAULT_BACKGROUND_STYLE,
    slides: makeStarterSlides(copy),
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
    appName: appName.trim() || FALLBACK_STARTER.appName,
    themeId: theme ? theme.id : DEFAULT_THEME_ID,
    ...(customTheme ? { customTheme } : {}),
    fontId: theme?.fontId ?? DEFAULT_FONT_ID,
    backgroundStyle: bg,
    slides: slides.length > 0 ? slides : makeStarterSlides(),
  };
}
