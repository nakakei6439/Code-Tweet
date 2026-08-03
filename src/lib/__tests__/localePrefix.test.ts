import { describe, expect, it } from "vitest";
import { stripLocale } from "@/lib/locales";

// 管理画面ゲートと OAuth 救済はロケール接頭辞を除いたパスで判定する。
// ここが崩れると /en/admin が素通りするので、境界を明示的に固定しておく。
describe("stripLocale", () => {
  it("removes a locale prefix", () => {
    expect(stripLocale("/en/admin")).toBe("/admin");
    expect(stripLocale("/zh-Hans/admin/login")).toBe("/admin/login");
    expect(stripLocale("/ko/pricing")).toBe("/pricing");
  });

  it("maps a bare locale root to /", () => {
    expect(stripLocale("/en")).toBe("/");
    expect(stripLocale("/zh-Hant")).toBe("/");
  });

  it("leaves unprefixed paths untouched", () => {
    expect(stripLocale("/")).toBe("/");
    expect(stripLocale("/admin")).toBe("/admin");
    expect(stripLocale("/about/appss")).toBe("/about/appss");
  });

  it("does not strip segments that merely start with a locale id", () => {
    expect(stripLocale("/english/admin")).toBe("/english/admin");
    expect(stripLocale("/entrypoint")).toBe("/entrypoint");
    expect(stripLocale("/deutsch")).toBe("/deutsch");
  });

  it("keeps admin paths detectable for every locale", () => {
    for (const prefix of ["", "/en", "/es", "/zh-Hans", "/zh-Hant", "/fr", "/de", "/ko", "/ja"]) {
      expect(stripLocale(`${prefix}/admin/verify`).startsWith("/admin")).toBe(true);
    }
  });
});
