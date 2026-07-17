import { describe, expect, it } from "vitest";
import { buildAppSSCopyPrompt, parseAppSSCopy, parseRecommendedTheme } from "../geminiAppSS";

const SAMPLE = `SLIDE: 1
LAYOUT: hero
LABEL: 家計簿サクッと
HEADLINE: 毎日のお金が／ひとめでわかる

SLIDE: 2
LAYOUT: device-bottom
LABEL: かんたん記録
HEADLINE: レシートを撮るだけ

SLIDE: 3
LAYOUT: no-device
LABEL: 今すぐ
HEADLINE: 無料で／はじめよう`;

describe("parseAppSSCopy", () => {
  it("正常な出力をパースし「／」を改行に変換する", () => {
    const slides = parseAppSSCopy(SAMPLE, 3);
    expect(slides).toHaveLength(3);
    expect(slides[0]).toEqual({
      label: "家計簿サクッと",
      headline: "毎日のお金が\nひとめでわかる",
      layoutHint: "hero",
    });
    expect(slides[1].headline).toBe("レシートを撮るだけ");
    expect(slides[2].layoutHint).toBe("no-device");
  });

  it("不明な LAYOUT は device-bottom に落とす", () => {
    const text = `SLIDE: 1\nLAYOUT: feature-graphic\nLABEL: a\nHEADLINE: b`;
    const slides = parseAppSSCopy(text, 1);
    expect(slides[0].layoutHint).toBe("device-bottom");
  });

  it("コードフェンスや前置きが混ざっても HEADLINE を回収する", () => {
    const text = "以下が生成結果です。\n```\n" + SAMPLE + "\n```";
    const slides = parseAppSSCopy(text, 3);
    expect(slides).toHaveLength(3);
  });

  it("必要枚数に満たない場合は throw する", () => {
    expect(() => parseAppSSCopy(SAMPLE, 5)).toThrow(/スライド案を生成できませんでした/);
    expect(() => parseAppSSCopy("", 3)).toThrow();
  });

  it("要求枚数より多い場合は切り詰める", () => {
    const slides = parseAppSSCopy(SAMPLE, 2);
    expect(slides).toHaveLength(2);
  });
});

describe("parseRecommendedTheme", () => {
  it("THEME 行から有効なテーマ id を取り出す", () => {
    expect(parseRecommendedTheme("THEME: washi\n" + SAMPLE)).toBe("washi");
    expect(parseRecommendedTheme("theme: dark-neon")).toBe("dark-neon");
  });

  it("不明なテーマ id / 未指定は undefined", () => {
    expect(parseRecommendedTheme("THEME: unknown-theme")).toBeUndefined();
    expect(parseRecommendedTheme(SAMPLE)).toBeUndefined();
    expect(parseRecommendedTheme("")).toBeUndefined();
  });
});

describe("buildAppSSCopyPrompt", () => {
  it("入力内容と枚数がプロンプトに反映される", () => {
    const prompt = buildAppSSCopyPrompt(
      "家計簿サクッと",
      "レシート撮影で自動記録する家計簿アプリ",
      ["レシート自動読み取り", "夫婦で共有"],
      "やわらかく",
      5,
    );
    expect(prompt).toContain("家計簿サクッと");
    expect(prompt).toContain("1. レシート自動読み取り");
    expect(prompt).toContain("【トーン指示】");
    expect(prompt).toContain("5 スライド分");
    expect(prompt).toContain("SLIDE: 1");
  });

  it("features とトーンが空なら該当セクションを出さない", () => {
    const prompt = buildAppSSCopyPrompt("A", "B", [], "", 3);
    expect(prompt).not.toContain("【主な機能・特徴");
    expect(prompt).not.toContain("【トーン指示】");
  });
});
