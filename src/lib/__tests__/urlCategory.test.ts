import { describe, expect, it } from "vitest";
import { detectReadmeUrls, normalizeUrl } from "@/lib/urlCategory";

describe("normalizeUrl", () => {
  it("日本語スラッグ付きの App Store URL を短縮形にする", () => {
    const long =
      "https://apps.apple.com/jp/app/%E3%81%9F%E3%81%B9%E3%83%A1%E3%83%A2-%E3%81%A4%E3%81%B6%E3%82%84%E3%81%8F%E3%81%A0%E3%81%91%E3%81%AE%E3%82%AB%E3%83%AD%E3%83%AA%E3%83%BC%E8%A8%98%E9%8C%B2/id6787073935";
    expect(normalizeUrl(long)).toBe("https://apps.apple.com/jp/app/id6787073935");
  });

  it("itunes.apple.com とクエリ付きの旧形式も短縮形にする", () => {
    expect(normalizeUrl("https://itunes.apple.com/us/app/some-app/id123456789?mt=8")).toBe(
      "https://apps.apple.com/us/app/id123456789",
    );
  });

  it("すでに短縮形の URL はそのまま返す", () => {
    expect(normalizeUrl("https://apps.apple.com/jp/app/id6787073935")).toBe(
      "https://apps.apple.com/jp/app/id6787073935",
    );
  });

  it("App Store 以外の URL は変更しない", () => {
    expect(normalizeUrl("https://github.com/owner/repo")).toBe("https://github.com/owner/repo");
    expect(normalizeUrl("https://play.google.com/store/apps/details?id=com.example")).toBe(
      "https://play.google.com/store/apps/details?id=com.example",
    );
  });

  it("README から検出した App Store URL も短縮形になる", () => {
    const readme = "配信中：https://apps.apple.com/jp/app/%E3%81%9F%E3%81%B9%E3%83%A1%E3%83%A2/id6787073935";
    expect(detectReadmeUrls(readme).appstore).toBe("https://apps.apple.com/jp/app/id6787073935");
  });
});
