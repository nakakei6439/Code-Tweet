// AppSS — 日本語スターターデッキ。
import { DEFAULT_FONT_ID, DEFAULT_THEME_ID, PROJECT_SCHEMA_VERSION } from "./constants";
import type { AppSSProject, AppSSSlide } from "./types";

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
    slides: makeStarterSlides(),
  };
}
