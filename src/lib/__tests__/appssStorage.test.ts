import { describe, expect, it } from "vitest";
import { cleanTransform, migrateSlide, mergeWithDefaults } from "../appss/storage";
import { PROJECT_SCHEMA_VERSION } from "../appss/constants";

describe("cleanTransform", () => {
  it("正常な transform をそのまま返す", () => {
    expect(cleanTransform({ x: 10, y: 20, width: 100, height: 50 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    });
  });

  it("必須値が欠けていれば undefined", () => {
    expect(cleanTransform({ x: 10, y: 20, width: 100 })).toBeUndefined();
    expect(cleanTransform(null)).toBeUndefined();
    expect(cleanTransform("x")).toBeUndefined();
    expect(cleanTransform({ x: NaN, y: 0, width: 1, height: 1 })).toBeUndefined();
  });

  it("width/height は最低 1 に丸め、rotation/zIndex は有効時のみ残す", () => {
    expect(
      cleanTransform({ x: 0, y: 0, width: 0, height: -5, rotation: 12, zIndex: NaN }),
    ).toEqual({ x: 0, y: 0, width: 1, height: 1, rotation: 12 });
  });
});

describe("migrateSlide", () => {
  it("不明なレイアウトは device-bottom に落とす", () => {
    const slide = migrateSlide({ id: "a", layout: "feature-graphic", label: "", headline: "" });
    expect(slide?.layout).toBe("device-bottom");
  });

  it("data:URL の参照は空文字に落とす（localStorage quota 保護）", () => {
    const slide = migrateSlide({
      id: "a",
      layout: "hero",
      label: "l",
      headline: "h",
      screenshotRef: "data:image/png;base64,AAAA",
    });
    expect(slide?.screenshotRef).toBe("");
  });

  it("idb: 参照と不正な textElements を処理する", () => {
    const slide = migrateSlide({
      id: "a",
      layout: "hero",
      label: "l",
      headline: "h",
      screenshotRef: "idb:abc123",
      textElements: [
        { id: "t1", text: "ok", transform: { x: 0, y: 0, width: 10, height: 10 } },
        { id: "t2", text: "broken", transform: { x: 0 } },
        { id: "", text: "no-id", transform: { x: 0, y: 0, width: 10, height: 10 } },
      ],
    });
    expect(slide?.screenshotRef).toBe("idb:abc123");
    expect(slide?.textElements?.map((t) => t.id)).toEqual(["t1"]);
  });

  it("id が無ければ生成する", () => {
    const slide = migrateSlide({ layout: "hero", label: "", headline: "" });
    expect(slide?.id).toBeTruthy();
  });
});

describe("mergeWithDefaults", () => {
  it("空入力ならデフォルトプロジェクトを返す", () => {
    const project = mergeWithDefaults(null);
    expect(project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(project.slides.length).toBeGreaterThan(0);
    expect(project.themeId).toBe("simple-white");
  });

  it("不明な themeId / fontId はデフォルトに落とす", () => {
    const project = mergeWithDefaults({ themeId: "unknown", fontId: "comic-sans" });
    expect(project.themeId).toBe("simple-white");
    expect(project.fontId).toBe("gothic");
  });

  it("既存スライドを保持しつつ移行する", () => {
    const project = mergeWithDefaults({
      appName: "テストアプリ",
      themeId: "washi",
      slides: [{ id: "s1", layout: "hero", label: "ラベル", headline: "見出し", screenshotRef: "" }],
    });
    expect(project.appName).toBe("テストアプリ");
    expect(project.themeId).toBe("washi");
    expect(project.slides).toHaveLength(1);
    expect(project.slides[0].label).toBe("ラベル");
  });

  it("slides が空配列ならスターターデッキを使う", () => {
    const project = mergeWithDefaults({ slides: [] });
    expect(project.slides.length).toBeGreaterThan(0);
  });
});
