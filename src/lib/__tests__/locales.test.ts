import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_IDS,
  LOCALE_LIST,
  isLocaleId,
  toLocaleId,
} from "@/lib/locales";

describe("locale definitions", () => {
  it("covers the eight supported locales", () => {
    expect(LOCALE_IDS).toEqual(["ja", "en", "es", "zh-Hans", "zh-Hant", "fr", "de", "ko"]);
  });

  it("defaults to Japanese so existing URLs stay unprefixed", () => {
    expect(DEFAULT_LOCALE).toBe("ja");
  });

  it("keeps every entry keyed by its own id", () => {
    for (const id of LOCALE_IDS) {
      expect(LOCALES[id].id).toBe(id);
    }
  });

  it("gives every locale a unique bcp47 tag and og locale", () => {
    const tags = LOCALE_LIST.map((l) => l.bcp47);
    const ogp = LOCALE_LIST.map((l) => l.ogpLocale);

    expect(new Set(tags).size).toBe(tags.length);
    expect(new Set(ogp).size).toBe(ogp.length);
  });

  it("marks only Simplified Chinese as blocked from X in its primary market", () => {
    const blocked = LOCALE_LIST.filter((l) => l.xBlockedInPrimaryMarket).map((l) => l.id);

    expect(blocked).toEqual(["zh-Hans"]);
  });

  it("assigns a non-latin script to every CJK locale", () => {
    expect(LOCALES.ja.script).toBe("jp");
    expect(LOCALES["zh-Hans"].script).toBe("sc");
    expect(LOCALES["zh-Hant"].script).toBe("tc");
    expect(LOCALES.ko.script).toBe("kr");
    expect(LOCALES.es.script).toBe("latin");
  });
});

describe("isLocaleId", () => {
  it("accepts supported ids and rejects everything else", () => {
    expect(isLocaleId("zh-Hant")).toBe(true);
    expect(isLocaleId("zh")).toBe(false);
    expect(isLocaleId("")).toBe(false);
    expect(isLocaleId(undefined)).toBe(false);
  });
});

describe("toLocaleId", () => {
  it("passes through supported ids", () => {
    expect(toLocaleId("ko")).toBe("ko");
  });

  it("falls back to the default locale for unknown values", () => {
    expect(toLocaleId("pt")).toBe("ja");
    expect(toLocaleId(null)).toBe("ja");
  });
});
