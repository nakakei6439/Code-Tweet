#!/usr/bin/env node
// 未訳の日本語と、messages/*.json のキー欠落を機械的に検出する。
//
// 多言語化を手作業で数えていたときに取りこぼしが出た（サーバー側のエラー文言、
// 定数ファイルに埋まった表示名、初回オンボーディングなど）。同じ見落としを
// 繰り返さないよう、デプロイ前チェックに組み込む。
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const MESSAGES = join(ROOT, "messages");

// ひらがな・カタカナ・CJK 統合漢字。ローカライズ漏れの検出用。
const JAPANESE = /[぀-ヿ㐀-䶿一-鿿]/;

/**
 * 走査から除外するファイル。**必ず理由を書くこと。**
 * 理由なしの追加は、未訳を黙って隠すのと同じになる。
 */
const ALLOWLIST = [
  {
    pattern: /^src\/lib\/gemini(AppSS|Note)?\.ts$/,
    reason: "Gemini へのプロンプト本文。UI ではなく AI への指示文で、多言語化は Phase 2/3 で扱う",
  },
  {
    pattern: /^src\/app\/\[locale\]\/admin\//,
    reason: "管理画面は ADMIN_EMAILS のみ到達可能な運用者専用。訪問者は見ないため日本語のまま据え置く",
  },
  {
    pattern: /^src\/lib\/locales\.ts$/,
    reason: "言語スイッチャーに出す自言語表記（日本語 / 简体中文 …）。翻訳してはいけない",
  },
  {
    pattern: /^src\/lib\/creditPacks\.ts$/,
    reason: "Stripe の決済記録に残る内部名。表示名は pricingPage.packName 側で翻訳する",
  },
];

function isAllowed(relPath) {
  return ALLOWLIST.some((entry) => entry.pattern.test(relPath));
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(name) && !full.includes(`${sep}__tests__${sep}`)) {
      out.push(full);
    }
  }
  return out;
}

/** コメント（//, /* *\/, {/* *\/}）を落として、コードとして残る日本語だけを見る。 */
function stripComments(source) {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function findUntranslated() {
  const hits = [];
  for (const file of walk(SRC)) {
    const relPath = relative(ROOT, file).split(sep).join("/");
    if (isAllowed(relPath)) continue;

    const lines = stripComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      if (JAPANESE.test(line)) {
        hits.push({ file: relPath, line: i + 1, text: line.trim().slice(0, 100) });
      }
    });
  }
  return hits;
}

/** ネストしたメッセージ辞書を "a.b.c" 形式のキー集合に潰す。 */
function flattenKeys(obj, prefix = "", out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenKeys(value, path, out);
    } else {
      out.add(path);
    }
  }
  return out;
}

function findMessageGaps() {
  const files = readdirSync(MESSAGES).filter((f) => f.endsWith(".json"));
  const base = "ja.json";
  if (!files.includes(base)) {
    return [{ locale: "-", problem: `messages/${base} が見つかりません` }];
  }

  const baseKeys = flattenKeys(JSON.parse(readFileSync(join(MESSAGES, base), "utf8")));
  const gaps = [];

  for (const file of files) {
    if (file === base) continue;
    const keys = flattenKeys(JSON.parse(readFileSync(join(MESSAGES, file), "utf8")));
    const locale = file.replace(/\.json$/, "");

    for (const key of baseKeys) {
      if (!keys.has(key)) gaps.push({ locale, problem: `不足: ${key}` });
    }
    for (const key of keys) {
      if (!baseKeys.has(key)) gaps.push({ locale, problem: `ja に無い余剰キー: ${key}` });
    }
  }
  return gaps;
}

const untranslated = findUntranslated();
const gaps = findMessageGaps();

if (untranslated.length > 0) {
  console.error(`\n未訳の日本語が ${untranslated.length} 行あります:\n`);
  const byFile = new Map();
  for (const hit of untranslated) {
    if (!byFile.has(hit.file)) byFile.set(hit.file, []);
    byFile.get(hit.file).push(hit);
  }
  for (const [file, hits] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
    console.error(`  ${file}  (${hits.length} 行)`);
    for (const hit of hits.slice(0, 3)) {
      console.error(`    ${hit.line}: ${hit.text}`);
    }
    if (hits.length > 3) console.error(`    … 他 ${hits.length - 3} 行`);
  }
  console.error(
    "\n翻訳するか、意図的に残すなら scripts/check-i18n.mjs の ALLOWLIST に理由付きで追加してください。",
  );
}

if (gaps.length > 0) {
  console.error(`\nmessages の辞書キーに ${gaps.length} 件の差分があります:\n`);
  for (const gap of gaps.slice(0, 40)) {
    console.error(`  [${gap.locale}] ${gap.problem}`);
  }
  if (gaps.length > 40) console.error(`  … 他 ${gaps.length - 40} 件`);
}

if (untranslated.length > 0 || gaps.length > 0) {
  process.exit(1);
}

console.log("i18n チェック: 未訳なし・辞書キーの差分なし");
