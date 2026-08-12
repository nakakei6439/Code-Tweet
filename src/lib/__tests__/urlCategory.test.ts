import { describe, expect, it } from "vitest";
import { detectReadmeUrls, normalizeUrl, pickPreferredUrl } from "@/lib/urlCategory";

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

// 告知に載せたいのは「使える場所」であって、ソースコードではない。
// GitHub は他に行き先が無いときの最終手段。
describe("pickPreferredUrl", () => {
  const APPSTORE = "https://apps.apple.com/jp/app/id6787073935";
  const PLAY = "https://play.google.com/store/apps/details?id=com.example";
  const WEB = "https://example.com/app";
  const REPO = "https://github.com/owner/repo";

  it("App Store があれば GitHub より優先する", () => {
    expect(pickPreferredUrl(`${REPO}\n${APPSTORE}`)).toBe(APPSTORE);
  });

  it("App Store が無ければ Google Play を採る", () => {
    expect(pickPreferredUrl(`${REPO}\n${PLAY}\n${WEB}`)).toBe(PLAY);
  });

  it("ストアが無ければ Web を採る（GitHub が先に出てきても）", () => {
    expect(pickPreferredUrl(`${REPO}\n${WEB}`)).toBe(WEB);
  });

  it("GitHub しか無ければ GitHub を採る", () => {
    expect(pickPreferredUrl(REPO)).toBe(REPO);
  });

  it("github.io は GitHub 扱いなので Web より後回しになる", () => {
    expect(pickPreferredUrl(`https://owner.github.io/app\n${WEB}`)).toBe(WEB);
  });

  it("URL が無ければ undefined", () => {
    expect(pickPreferredUrl("README に URL がない")).toBeUndefined();
  });

  it("バッジ画像は候補にしない", () => {
    const readme = `![badge](https://img.shields.io/badge/build-passing.svg)\n${WEB}`;
    expect(pickPreferredUrl(readme)).toBe(WEB);
  });
});
