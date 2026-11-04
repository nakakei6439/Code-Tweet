// 生成結果が指定した言語で書かれているかを判定する。
//
// Gemini Flash 系（thinking 最小）は、プロンプトで出力言語を最重要指示として与えても、
// 入力 README の言語に引きずられることがある。実例: 日本語 README から英語で生成させると
// 「My Python script scrapes Apple整備済みiPhoneサイトを監視し」のような混在文が返る。
// 指示を書き足しても安定しないため、出力側で判定してリトライする。
//
// 判定は文字体系の比率で行う。固有名詞は原語のままでよい（プロンプトでもそう指示している）ので、
// 少量の異体系文字は許容し、比率が閾値を超えたときだけ「言語違い」とみなす。

import { LOCALES, type LocaleId, type LocaleScript } from "@/lib/locales";

/** ラテン圏の出力に許す非ラテン文字の比率。固有名詞（「献立カート」等）を通すための余裕。 */
const FOREIGN_TOLERANCE = 0.12;

/** CJK・ハングル圏の出力に最低限求める自体系文字の比率。下回れば別言語で書かれている。 */
const NATIVE_MINIMUM = 0.2;

/** 判定材料が乏しい短文は誤判定の害のほうが大きいので、この長さ未満は判定しない。 */
const MIN_CHARS = 12;

// 符号位置はエスケープで書く。文字そのものを置くと check:i18n が未訳の日本語として拾う。
const HIRAGANA = /[\u3040-\u309F]/;
const KATAKANA = /[\u30A0-\u30FF\u31F0-\u31FF]/;
const HAN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
const HANGUL = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

/** URL・ハッシュタグ・記号・空白を除いた「本文の中身」だけを数える。 */
function meaningfulChars(text: string): string[] {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#＃][^\s#＃]+/g, "")
    .split("")
    .filter((ch) => /[\p{L}\p{N}]/u.test(ch));
}

function isKana(ch: string): boolean {
  return HIRAGANA.test(ch) || KATAKANA.test(ch);
}

function isNativeTo(ch: string, script: LocaleScript): boolean {
  switch (script) {
    case "jp":
      // 漢字だけの塊は中国語と区別できないため、かな・漢字の両方を日本語側として数える。
      return isKana(ch) || HAN.test(ch);
    case "sc":
    case "tc":
      // 簡体・繁体の判別まではしない。日本語で返ってきた場合はかなの有無で弾く。
      return HAN.test(ch);
    case "kr":
      return HANGUL.test(ch);
    case "latin":
      return !(isKana(ch) || HAN.test(ch) || HANGUL.test(ch));
  }
}

/**
 * 生成結果が locale の言語で書かれていなければ true。
 *
 * - ラテン圏（en/es/fr/de）: かな・漢字・ハングルが本文の 12% を超えたら違反。
 *   固有名詞をそのまま残すぶんには閾値に届かない。
 * - 中国語・韓国語: かなが 1 文字でも混ざれば、日本語のまま返ってきたとみなして違反。
 * - 日本語 / 中国語 / 韓国語: 自体系の文字が本文の 20% に満たなければ違反（英語で返ってきた場合）。
 */
export function isWrongLanguage(text: string, locale: LocaleId): boolean {
  const chars = meaningfulChars(text);
  if (chars.length < MIN_CHARS) return false;

  const script = LOCALES[locale].script;

  if ((script === "sc" || script === "tc" || script === "kr") && chars.some(isKana)) {
    return true;
  }

  const nativeRatio = chars.filter((ch) => isNativeTo(ch, script)).length / chars.length;

  return script === "latin"
    ? 1 - nativeRatio > FOREIGN_TOLERANCE
    : nativeRatio < NATIVE_MINIMUM;
}
