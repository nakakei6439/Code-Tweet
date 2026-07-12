// README 本文などから HTTPS URL を抽出し、App Store / Google Play / GitHub / Web に
// 分類するためのクライアント/サーバー共用ユーティリティ。
// URL 種別の判定基準は gemini.ts の detectUrlType() と揃えている。

export type UrlCategory = "appstore" | "googleplay" | "github" | "web";

const APPSTORE_RE = /apps\.apple\.com|itunes\.apple\.com/i;
const GOOGLEPLAY_RE = /play\.google\.com/i;
const GITHUB_RE = /github\.com|github\.io/i;

// バッジ・画像など、投稿に載せる実URLとしては不適切なものを除外する。
const IMAGE_EXT_RE = /\.(png|svg|jpe?g|gif|webp)(\?|#|$)/i;
const BADGE_HOST_RE = /shields\.io|img\.shields\.io|camo\.githubusercontent\.com|badgen\.net/i;

// App Store の URL はアプリ名スラッグ（日本語だとパーセントエンコードで数百文字になる）を
// 含むが、/app/idXXXXXXXXX だけで同じページに解決する。投稿文が読みづらくなるため短縮形に揃える。
const APPSTORE_URL_RE =
  /^https?:\/\/(?:apps|itunes)\.apple\.com\/(?:([a-z]{2})\/)?app\/(?:[^/?#]+\/)?id(\d+)/i;

export function categorizeUrl(url: string): UrlCategory {
  if (APPSTORE_RE.test(url)) return "appstore";
  if (GOOGLEPLAY_RE.test(url)) return "googleplay";
  if (GITHUB_RE.test(url)) return "github";
  return "web";
}

// App Store URL のみ短縮形に正規化する。他カテゴリの URL はそのまま返す。
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  const match = trimmed.match(APPSTORE_URL_RE);
  if (!match) return trimmed;

  const country = match[1] ? `${match[1].toLowerCase()}/` : "";
  return `https://apps.apple.com/${country}app/id${match[2]}`;
}

// 末尾につきがちな句読点・閉じ括弧を取り除く（Markdown のリンク記法対策）。
function trimUrl(raw: string): string {
  return raw.replace(/[)\]>.,;:!?'"」』）】、。]+$/u, "");
}

export function extractHttpsUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/https:\/\/[^\s<>()"'`\]]+/gi) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    const url = normalizeUrl(trimUrl(m));
    if (!url) continue;
    if (IMAGE_EXT_RE.test(url) || BADGE_HOST_RE.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}

// 各カテゴリで最初に見つかった URL を1件ずつ返す。
export function detectReadmeUrls(text: string): Partial<Record<UrlCategory, string>> {
  const detected: Partial<Record<UrlCategory, string>> = {};
  for (const url of extractHttpsUrls(text)) {
    const cat = categorizeUrl(url);
    if (!detected[cat]) detected[cat] = url;
  }
  return detected;
}
