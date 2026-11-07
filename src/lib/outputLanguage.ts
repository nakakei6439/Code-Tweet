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

/** 韓国語の出力に許す漢字の最大数。固有名詞の 1 文字程度は通し、「最短」のような熟語の混入は弾く。 */
const KR_MAX_HAN = 1;

/** 入力由来の語として除外してよい、カタカナ語の最大長。長い塊は文の流用とみなす。 */
const SOURCE_TERM_MAX = 16;

/** 除外した文字が本文のこの比率を超えたら、固有名詞ではなく入力の流用（言語違い）とみなして除外しない。 */
const SOURCE_EXEMPT_MAX_RATIO = 0.3;

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

// 除外対象はカタカナ語（長音符を含む）だけ。製品名・外来語は原語のまま残ってよいが、
// 漢字やひらがなは「타言語」「最短」のような本物の日本語混入と区別できないので除外しない。
const KATAKANA_RUN = /[\u30A0-\u30FF\u31F0-\u31FF]{2,}/g;

/**
 * 入力（README 等）にそのまま出てくるカタカナ語を本文から取り除く。
 * 製品名「サバイバルTypeScript」のカタカナ部分は ko / zh の出力に残ってよい。
 * ただし除外が本文の 3 割を超える場合は、固有名詞ではなく日本語の流用なので除外しない。
 */
function stripSourceTerms(text: string, source: string): string {
  let exempt = 0;
  const stripped = text.replace(KATAKANA_RUN, (run) => {
    if (run.length <= SOURCE_TERM_MAX && source.includes(run)) {
      exempt += run.length;
      return "";
    }
    return run;
  });
  return exempt / Math.max(1, text.length) > SOURCE_EXEMPT_MAX_RATIO ? text : stripped;
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
 * - sourceText（入力）を渡すと、入力にそのまま出てくるカタカナ語（製品名など）は ko / zh の判定から除外する（漢字・ひらがなは除外しない）。
 * - 韓国語: 漢字が 2 文字以上混ざっても違反（固有名詞の 1 文字は許容）。
 * - 日本語 / 中国語 / 韓国語: 自体系の文字が本文の 20% に満たなければ違反（英語で返ってきた場合）。
 */
export function isWrongLanguage(text: string, locale: LocaleId, sourceText = ""): boolean {
  const script = LOCALES[locale].script;
  // かな・漢字を残してよいのは、日本語入力から非 CJK 日本語系へ生成する ko / zh のときだけ。
  // ラテン圏では入力の語を除外すると日本語の混入を見逃すので行わない。
  const target =
    sourceText && (script === "kr" || script === "sc" || script === "tc")
      ? stripSourceTerms(text, sourceText)
      : text;
  const chars = meaningfulChars(target);
  if (chars.length < MIN_CHARS) return false;

  if ((script === "sc" || script === "tc" || script === "kr") && chars.some(isKana)) {
    return true;
  }

  // 韓国語に漢字の熟語が混ざる崩れ（例: 「방지하고最短 루트로」）。かなは無いので上で拾えない。
  if (script === "kr" && chars.filter((ch) => HAN.test(ch)).length > KR_MAX_HAN) {
    return true;
  }

  const nativeRatio = chars.filter((ch) => isNativeTo(ch, script)).length / chars.length;

  return script === "latin"
    ? 1 - nativeRatio > FOREIGN_TOLERANCE
    : nativeRatio < NATIVE_MINIMUM;
}
