import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// proxy.ts の matcher を、ソースを読んで取り出す。
//
// Next.js は matcher に静的な文字列リテラルしか許さないため、proxy.ts から定数を
// import させられない（ビルドが「need to be static strings」で落ちる）。
// proxy.ts 自体も next-intl の middleware を読み込むのでテストから import できない。
// そこでファイルをテキストとして読み、パターンを 1 か所から取る。
//
// ここが崩れると Google Search Console の所有権確認ファイルが next-intl に
// /ja/... へ書き換えられて 404 になり、確認が静かに外れる。
const SOURCE = readFileSync(new URL("../../proxy.ts", import.meta.url), "utf-8");
const matched = SOURCE.match(/^\s*"(\/\(\(\?!.*)",$/m);
if (!matched) {
  throw new Error("proxy.ts から matcher を取り出せなかった。config.matcher の書き方を確認すること");
}
// TypeScript ソース中のエスケープ（\\.）を実際の正規表現（\.）に戻す。
const re = new RegExp(`^${matched[1].replace(/\\\\/g, "\\")}$`);

describe("proxy の matcher", () => {
  it("ロケールを持つ通常のページは通す（＝ロケール処理が走る）", () => {
    for (const path of ["/", "/pricing", "/en/pricing", "/about/note", "/admin"]) {
      expect(re.test(path), path).toBe(true);
    }
  });

  it("所有権確認ファイル・静的ファイルは除外する", () => {
    for (const path of [
      "/google56bb80f617a5907b.html",
      "/robots.txt",
      "/sitemap.xml",
      "/favicon.ico",
      "/site.webmanifest",
      "/appss/bezel-iphone.png",
    ]) {
      expect(re.test(path), path).toBe(false);
    }
  });

  it("API と auth コールバックは除外する", () => {
    for (const path of ["/api/generate", "/auth/callback"]) {
      expect(re.test(path), path).toBe(false);
    }
  });
});
