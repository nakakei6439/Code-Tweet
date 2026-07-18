import { describe, expect, it } from "vitest";
import { buildCustomTheme, sanitizeHex, sanitizeTheme } from "../appss/constants";

describe("sanitizeHex", () => {
  it("#rrggbb / #rgb を小文字に正規化する", () => {
    expect(sanitizeHex("#FF00AA")).toBe("#ff00aa");
    expect(sanitizeHex("#f0a")).toBe("#ff00aa");
  });

  it("hex 以外の値は undefined（CSS インジェクション対策）", () => {
    expect(sanitizeHex("red")).toBeUndefined();
    expect(sanitizeHex("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeHex('#fff;background:url(x)')).toBeUndefined();
    expect(sanitizeHex(undefined)).toBeUndefined();
    expect(sanitizeHex(123)).toBeUndefined();
  });
});

describe("buildCustomTheme", () => {
  it("bg/fg/accent が揃えば Theme を構築し、bgAlt/fgAlt を反転させる", () => {
    const theme = buildCustomTheme({ bg: "#ffffff", fg: "#111111", accent: "#22d3ee" });
    expect(theme).toBeDefined();
    expect(theme?.id).toBe("ai-custom");
    expect(theme?.bg).toBe("#ffffff");
    expect(theme?.fg).toBe("#111111");
    expect(theme?.bgAlt).toBe("#111111");
    expect(theme?.fgAlt).toBe("#ffffff");
    expect(theme?.accent).toBe("#22d3ee");
    // muted 省略時は fg/bg の中間色を自動導出
    expect(theme?.muted).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("muted が指定されればそのまま使う", () => {
    const theme = buildCustomTheme({ bg: "#fff", fg: "#000", accent: "#f00", muted: "#888888" });
    expect(theme?.muted).toBe("#888888");
  });

  it("必須3色のいずれかが不正なら undefined（プリセットへフォールバック）", () => {
    expect(buildCustomTheme({ bg: "notacolor", fg: "#000", accent: "#f00" })).toBeUndefined();
    expect(buildCustomTheme({ bg: "#fff", fg: undefined, accent: "#f00" })).toBeUndefined();
  });
});

describe("sanitizeTheme", () => {
  it("正常な保存データをそのまま検証して返す", () => {
    const theme = sanitizeTheme({
      id: "ai-custom",
      name: "AI生成",
      bg: "#FFFFFF",
      bgAlt: "#000000",
      fg: "#000000",
      fgAlt: "#FFFFFF",
      accent: "#22D3EE",
      muted: "#888888",
    });
    expect(theme).toEqual({
      id: "ai-custom",
      name: "AI生成",
      bg: "#ffffff",
      bgAlt: "#000000",
      fg: "#000000",
      fgAlt: "#ffffff",
      accent: "#22d3ee",
      muted: "#888888",
    });
  });

  it("必須3色が欠けた/不正な保存データは undefined", () => {
    expect(sanitizeTheme({ bg: "#fff", fg: "#000" })).toBeUndefined();
    expect(sanitizeTheme({ bg: "red", fg: "#000", accent: "#f00" })).toBeUndefined();
    expect(sanitizeTheme(null)).toBeUndefined();
    expect(sanitizeTheme("not-an-object")).toBeUndefined();
  });

  it("bgAlt/fgAlt/muted が欠けていれば自動導出する", () => {
    const theme = sanitizeTheme({ bg: "#fff", fg: "#000", accent: "#f00" });
    expect(theme?.bgAlt).toBe("#000000");
    expect(theme?.fgAlt).toBe("#ffffff");
    expect(theme?.muted).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("不正な fontId は無視する", () => {
    const theme = sanitizeTheme({ bg: "#fff", fg: "#000", accent: "#f00", fontId: "comic-sans" });
    expect(theme?.fontId).toBeUndefined();
  });
});
