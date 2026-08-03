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

  it("collage-trio レイアウトと screenshotTertiaryRef を受け付ける", () => {
    const slide = migrateSlide({
      id: "a",
      layout: "collage-trio",
      label: "l",
      headline: "h",
      screenshotRef: "idb:main",
      screenshotSecondaryRef: "idb:second",
      screenshotTertiaryRef: "idb:third",
    });
    expect(slide?.layout).toBe("collage-trio");
    expect(slide?.screenshotSecondaryRef).toBe("idb:second");
    expect(slide?.screenshotTertiaryRef).toBe("idb:third");
  });

  it("screenshotTertiaryRef の data:URL は空文字に落とす", () => {
    const slide = migrateSlide({
      id: "a",
      layout: "collage-trio",
      label: "l",
      headline: "h",
      screenshotTertiaryRef: "data:image/png;base64,AAAA",
    });
    expect(slide?.screenshotTertiaryRef).toBe("");
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

  it("正常な customTheme（AI生成パレット）を保持する", () => {
    const project = mergeWithDefaults({
      customTheme: { bg: "#fff", fg: "#000", accent: "#22d3ee" },
    });
    expect(project.customTheme?.bg).toBe("#ffffff");
    expect(project.customTheme?.accent).toBe("#22d3ee");
  });

  it("不正な customTheme は破棄する", () => {
    const project = mergeWithDefaults({ customTheme: { bg: "notacolor" } });
    expect(project.customTheme).toBeUndefined();
  });
});

describe("mergeWithDefaults — ロケールとフォント", () => {
  it("locale を持たない旧データは日本語として扱う", () => {
    const project = mergeWithDefaults({ appName: "旧データ" });
    expect(project.locale).toBe("ja");
  });

  it("保存された locale を保持する", () => {
    const project = mergeWithDefaults({ locale: "ko", slides: [] });
    expect(project.locale).toBe("ko");
  });

  it("未知の locale は既定に丸める", () => {
    const project = mergeWithDefaults({ locale: "pt" });
    expect(project.locale).toBe("ja");
  });

  it("言語の文字体系に合わないフォントは既定へ差し替える", () => {
    // 日本語フォントのまま韓国語に切り替えた保存データ。豆腐を出さないための保険。
    const project = mergeWithDefaults({ locale: "ko", fontId: "mincho" });
    expect(project.fontId).toBe("kr-sans");
  });

  it("文字体系が合っているフォントはそのまま残す", () => {
    const project = mergeWithDefaults({ locale: "zh-Hans", fontId: "sc-serif" });
    expect(project.fontId).toBe("sc-serif");
  });

  it("ラテン圏は日本語フォントをそのまま使える（ラテン字形を持つため）", () => {
    const project = mergeWithDefaults({ locale: "de", fontId: "maru" });
    expect(project.fontId).toBe("maru");
  });
});
