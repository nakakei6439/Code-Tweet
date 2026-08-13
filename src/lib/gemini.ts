import { GoogleGenAI } from "@google/genai";
import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import twitterText from "twitter-text";
import { DEFAULT_LOCALE, LOCALES, type LocaleId } from "@/lib/locales";
import { isWrongLanguage } from "@/lib/outputLanguage";
import type { Tweet } from "@/types/tweet";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TWEET_LIMIT = 280;
export const GEMINI_MODEL = "gemini-2.5-flash";

// gemini-2.5-flash は thinking がデフォルト有効で 1 回の応答が遅く、Hobby プランの
// 60 秒関数上限を超えて 504 になりやすい。thinkingBudget: 0 で無効化してレイテンシを抑える。
export const GEMINI_THINKING_OFF = { thinkingBudget: 0 } as const;

// 指示追従が効かないと困る短い補正呼び出しにだけ使う控えめな thinking 予算。
// 本生成に使うと 60 秒上限に当たるので、リトライ系の 1 往復に限って有効化する。
export const GEMINI_THINKING_LIGHT = { thinkingBudget: 512 } as const;

// gemini-2.5-flash は無料枠で 503(UNAVAILABLE「high demand」)や 429 を一時的に返すことが多い。
// これらの一過性エラーは指数バックオフで自動リトライし、ユーザーに即エラーを返さない。
const TRANSIENT_ERROR_RE =
  /\b429\b|\b503\b|UNAVAILABLE|overloaded|high demand|RESOURCE_EXHAUSTED|Service Unavailable|fetch failed|ECONNRESET/i;

export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: GenerateContentParameters,
  maxRetries = 2,
): Promise<GenerateContentResponse> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries && TRANSIENT_ERROR_RE.test(message)) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
        continue;
      }
      throw err;
    }
  }
}

export function formatScheduleLabel(
  dateStr: string,
  timeStr: string,
  locale: LocaleId = DEFAULT_LOCALE,
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  // 日本語は従来の「5月13日（水）20:30」を保つ（既存の生成履歴と見た目を揃える）。
  if (locale === "ja") {
    const dow = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    return `${month}月${day}日（${dow}）${timeStr}`;
  }
  // 他言語は Intl に任せる。曜日名を手で持つと言語を足すたびに配列が増える。
  const formatted = new Intl.DateTimeFormat(LOCALES[locale].bcp47, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
  return `${formatted} ${timeStr}`;
}
const MAX_REGENERATE_ATTEMPTS = 4;

// 言語違いの書き直し試行回数。短縮（最大 4 回）より少なくしているのは、
// 書き直しは 1 回で直るか直らないかがはっきりしており、Hobby の 60 秒上限に効くため。
const MAX_RELANGUAGE_ATTEMPTS = 2;

// 5 件まるごと別言語で返ってきたときの作り直し回数。1 回の作り直しは丸ごと 1 生成ぶん
// 遅くなるので、Hobby の 60 秒上限を考えて 2 回（初回 + 作り直し 1 回）までにする。
const MAX_BATCH_ATTEMPTS = 2;

// 短縮のやり直しが別言語で返ってきたときに許す回数。短縮の予算とは別枠にして
// 短縮の機会を潰さないようにするが、無限ループは避けるため上限を設ける。
const MAX_SHORTEN_LANGUAGE_FAILURES = 2;
// 日本語タグは 1 文字 2 ウェイトあり、5 個並べると 280 の 3 割前後を食う。
// 本文の余裕を確保するため合計 3 個までに絞る（ユーザー指定タグは個数超過でも残す）。
const MAX_HASHTAGS = 3;
// AI が URL の直前に置きがちな CTA 文言。本文と URL ブロックを切り分けるのに使う。
// 言語ごとに書き方が違うので全言語分をまとめて 1 つの正規表現にする
// （どの言語の出力かに関わらず、CTA を本文に取り残さないため）。
const URL_LEAD_PHRASES = [
  // 日本語
  "App Storeで無料公開中", "今すぐインストール", "iPhoneで無料で使える", "ダウンロードはこちら",
  "詳しくはこちら", "今すぐ試す", "無料で使えます", "コードを見る", "OSSとして公開中", "GitHubで公開中",
  // 英語
  "Free on the App Store", "Get it now", "Download here", "Learn more", "Try it now",
  "Free to use", "See the code", "Open source", "On GitHub",
  // スペイン語
  "Gratis en la App Store", "Descárgalo ahora", "Más información", "Pruébalo ya", "Ver el código",
  // 中国語（簡体・繁体）
  "App Store 免费下载", "立即安装", "立即下載", "了解更多", "查看代码", "查看程式碼", "免费使用",
  // フランス語
  "Gratuit sur l'App Store", "Télécharger", "En savoir plus", "Essayez-le", "Voir le code",
  // ドイツ語
  "Kostenlos im App Store", "Jetzt installieren", "Mehr erfahren", "Jetzt testen", "Code ansehen",
  // 韓国語
  "App Store에서 무료", "지금 설치", "자세히 보기", "지금 사용해 보기", "코드 보기",
];
const URL_LEAD_RE = new RegExp(`(${URL_LEAD_PHRASES.map(escapeRegExp).join("|")})`, "i");

// 生成物の番号マーカー。"ポスト 1:" のほか英語の "Post 1:" も剥がす。
const POST_MARKER_RE =
  /(?:^|\n)\s*(?:\d+[.)．:：]|[（(]\d+[）)]|(?:ポスト|Post|POST)\s*\d+[:：]?)\s*/;

export type ParsedGeneratedTweets = {
  drafts: string[];
  schedules: { label: string; reason: string }[];
};

export function countWeighted(text: string): number {
  return twitterText.parseTweet(text).weightedLength;
}

function splitUrlLead(leadIn: string): { body: string; lead: string } {
  const trimmed = leadIn.trim();
  const ctaMatch = trimmed.match(new RegExp(`${URL_LEAD_RE.source}[^\\n]*$`, "i"));

  if (!ctaMatch || ctaMatch.index === undefined) {
    return { body: "", lead: trimmed };
  }

  return {
    body: trimmed.slice(0, ctaMatch.index).trim(),
    lead: trimmed.slice(ctaMatch.index).trim(),
  };
}

function isUrlLeadLine(line: string): boolean {
  const trimmed = line.trim();
  return URL_LEAD_RE.test(trimmed) || /[→:：]$/.test(trimmed);
}

function uniqTags(tags: string[]): string {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).join(" ");
}

function extractHashtags(text: string): string[] {
  return text.match(/#[^\s#]+/g) ?? [];
}

// タグは合計 MAX_HASHTAGS 個までに絞る。ユーザー指定タグ（省略不可）は超過分でも必ず残し、
// AI が足した関連タグを後ろから落とす。
function capHashtags(hashtags: string, requiredTags: string[]): string {
  let tags = hashtags.split(/\s+/).filter(Boolean);
  while (tags.length > MAX_HASHTAGS) {
    const dropIndex = tags.findLastIndex((tag) => !requiredTags.includes(tag));
    if (dropIndex < 0) break; // 指定タグだけで上限を超えている場合はそのまま残す
    tags = tags.filter((_, i) => i !== dropIndex);
  }
  return tags.join(" ");
}

// 上限超過時にハッシュタグを末尾から削って収める。本文を切り詰めるより自然に収まる。
// ユーザー指定タグは最後まで残すため、それだけで超過する場合は削りきらずに返す。
export function dropTagsToFit(text: string, requiredHashtags = ""): string {
  if (countWeighted(text) <= TWEET_LIMIT) return text;

  const lines = text.split("\n");
  const tagLineIndex = lines.findLastIndex((line) => /^(?:#\S+\s*)+$/.test(line.trim()));
  if (tagLineIndex < 0) return text;

  const requiredTags = extractHashtags(requiredHashtags);
  let kept = lines[tagLineIndex].trim().split(/\s+/);

  const render = (tags: string[]) =>
    lines
      .map((line, i) => (i === tagLineIndex ? tags.join(" ") : line))
      .filter((_, i) => !(i === tagLineIndex && tags.length === 0))
      .join("\n")
      .trim();

  for (;;) {
    const dropIndex = kept.findLastIndex((tag) => !requiredTags.includes(tag));
    if (dropIndex < 0) break; // 指定タグしか残っていない
    kept = kept.filter((_, i) => i !== dropIndex);
    const candidate = render(kept);
    if (countWeighted(candidate) <= TWEET_LIMIT) return candidate;
  }

  return render(kept);
}

// URL の種類ごとの既定リード文。AI がリード文を書かなかったときに補う。
type UrlLeadSet = { appStore: string; googlePlay: string; github: string; web: string };
const URL_LEADS: Record<LocaleId, UrlLeadSet> = {
  ja: { appStore: "App Storeで無料公開中 →", googlePlay: "今すぐインストール →", github: "GitHubで公開中 →", web: "詳しくはこちら →" },
  en: { appStore: "Free on the App Store →", googlePlay: "Get it on Google Play →", github: "On GitHub →", web: "Learn more →" },
  es: { appStore: "Gratis en la App Store →", googlePlay: "Descárgalo en Google Play →", github: "En GitHub →", web: "Más información →" },
  "zh-Hans": { appStore: "App Store 免费下载 →", googlePlay: "在 Google Play 安装 →", github: "在 GitHub 查看 →", web: "了解更多 →" },
  "zh-Hant": { appStore: "App Store 免費下載 →", googlePlay: "在 Google Play 安裝 →", github: "在 GitHub 查看 →", web: "了解更多 →" },
  fr: { appStore: "Gratuit sur l'App Store →", googlePlay: "Sur Google Play →", github: "Sur GitHub →", web: "En savoir plus →" },
  de: { appStore: "Kostenlos im App Store →", googlePlay: "Bei Google Play →", github: "Auf GitHub →", web: "Mehr erfahren →" },
  ko: { appStore: "App Store에서 무료 →", googlePlay: "Google Play에서 설치 →", github: "GitHub에서 보기 →", web: "자세히 보기 →" },
};

function getDefaultUrlLead(url: string, locale: LocaleId = DEFAULT_LOCALE): string {
  const leads = URL_LEADS[locale];
  if (/apps\.apple\.com/i.test(url)) return leads.appStore;
  if (/play\.google\.com/i.test(url)) return leads.googlePlay;
  if (/github\.com|github\.io/i.test(url)) return leads.github;
  return leads.web;
}

export function reformatTweet(
  text: string,
  requiredHashtags = "",
  requiredUrl = "",
  locale: LocaleId = DEFAULT_LOCALE,
): string {
  let rest = text.trim();

  const requiredTags = extractHashtags(requiredHashtags);
  const inlineTags = extractHashtags(rest);
  const standaloneTags: string[] = [];
  rest = rest
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (/^(?:#\S+\s*)+$/.test(trimmed)) {
        standaloneTags.push(...trimmed.split(/\s+/));
        return false;
      }
      return true;
    })
    .join("\n")
    .trim();

  const hashtagMatch = rest.match(/(?:\s*#\S+)+\s*$/);
  let hashtags = uniqTags(standaloneTags);
  if (hashtagMatch) {
    hashtags = uniqTags([...standaloneTags, ...hashtagMatch[0].trim().split(/\s+/)]);
    rest = rest.slice(0, hashtagMatch.index).trim();
  }

  if (requiredTags.length > 0) {
    hashtags = uniqTags([...hashtags.split(/\s+/), ...requiredTags]);
  } else if (!hashtags && inlineTags.length > 0) {
    hashtags = uniqTags(inlineTags);
  }
  hashtags = capHashtags(hashtags, requiredTags);

  // リード文と URL を取り出し、AI が先頭や途中に置いた場合も末尾側へ正規化する。
  // 2 つ目以降の URL（同一 URL の重複含む）は本文から完全に除去する。
  const urlRe = /https?:\/\/\S+/;
  const urlLineMatch = rest.match(urlRe);
  let urlBlock = "";
  if (urlLineMatch) {
    const urlStr = urlLineMatch[0].replace(/[。、！？.,!?]+$/, "");
    const lines = rest.split("\n");
    const nextLines: string[] = [];
    let leadCaptured = false;
    let lead = "";

    for (const line of lines) {
      const match = line.match(urlRe);
      if (!match) {
        nextLines.push(line);
        continue;
      }

      const beforeUrl = line.slice(0, match.index).trim();
      const afterUrl = line.slice((match.index ?? 0) + match[0].length).trim();

      if (!leadCaptured) {
        leadCaptured = true;
        if (beforeUrl) {
          const split = splitUrlLead(beforeUrl);
          lead = split.lead;
          if (split.body) nextLines.push(split.body);
        } else {
          const prevContentIndex = [...nextLines].map((item) => item.trim()).findLastIndex(Boolean);
          if (prevContentIndex >= 0 && isUrlLeadLine(nextLines[prevContentIndex])) {
            lead = nextLines[prevContentIndex].trim();
            nextLines.splice(prevContentIndex, 1);
          }
        }
      } else {
        // 2 つ目以降の URL は本文から削除。直前のリード文行や同行内のリード文部分も合わせて捨てる。
        const prevContentIndex = [...nextLines].map((item) => item.trim()).findLastIndex(Boolean);
        if (prevContentIndex >= 0 && isUrlLeadLine(nextLines[prevContentIndex])) {
          nextLines.splice(prevContentIndex, 1);
        }
        if (beforeUrl) {
          const split = splitUrlLead(beforeUrl);
          if (split.body) nextLines.push(split.body);
        }
      }

      if (afterUrl && !/^[。、！？.,!?]+$/.test(afterUrl)) nextLines.push(afterUrl);
    }

    urlBlock = lead ? `${lead}\n${urlStr}` : urlStr;
    rest = nextLines.join("\n").trim();
  }

  if (requiredUrl) {
    const defaultLead = getDefaultUrlLead(requiredUrl, locale);
    if (!urlBlock) {
      urlBlock = `${defaultLead}\n${requiredUrl}`;
    } else if (!urlBlock.includes(requiredUrl)) {
      const lead = urlBlock.split("\n")[0]?.trim();
      urlBlock = `${lead || defaultLead}\n${requiredUrl}`;
    }
  }

  return [rest, urlBlock, hashtags].filter(Boolean).join("\n\n");
}

function stripPostMarker(text: string): string {
  const marker = text.match(POST_MARKER_RE);
  if (!marker || marker.index === undefined) return text.trim();
  return text.slice(marker.index + marker[0].length).trim();
}

// SCHEDULE 行の後ろ（次ポストの番号マーカー手前まで）に Gemini が置いたハッシュタグ行だけを回収する。
// 本文・URL 等の他テキストは拾わず捨てる。番号マーカー行が出たらそこで打ち切る。
function extractTrailingHashtagLine(tail: string): string {
  const lines: string[] = [];
  for (const line of tail.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (POST_MARKER_RE.test(`\n${line}`)) break;
    if (/^(?:#\S+\s*)+$/.test(trimmed)) lines.push(trimmed);
  }
  return lines.join("\n");
}

export function parseGeneratedTweets(
  text: string,
  locale: LocaleId = DEFAULT_LOCALE,
): ParsedGeneratedTweets {
  const SCHEDULE_RE = /SCHEDULE:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*\/\s*([^\n]+)/g;
  const scheduleMatches = Array.from(text.matchAll(SCHEDULE_RE));
  if (scheduleMatches.length < 5) {
    throw new Error("5件のポストを生成できませんでした。もう一度お試しください。");
  }

  const drafts: string[] = [];
  const schedules: { label: string; reason: string }[] = [];

  for (let i = 0; i < 5; i++) {
    const sched = scheduleMatches[i];
    const schedStart = sched.index!;
    const schedEnd = schedStart + sched[0].length;
    const prevSchedEnd = i === 0 ? 0 : scheduleMatches[i - 1].index! + scheduleMatches[i - 1][0].length;
    const nextSchedStart = i + 1 < scheduleMatches.length ? scheduleMatches[i + 1].index! : text.length;

    // SCHEDULE 行をポスト本文の終端として扱う。SCHEDULE 行以降は次ポストの番号マーカーまで捨てる
    // ことで、Gemini が SCHEDULE 後に追加の本文・URL ブロックを書いてもポストに混入させない。
    let content = stripPostMarker(text.slice(prevSchedEnd, schedStart));
    if (!content) {
      throw new Error("5件のポストを生成できませんでした。もう一度お試しください。");
    }

    // ただしハッシュタグ行だけは SCHEDULE 行の後ろに置かれても回収し、本文末尾へ戻す
    // （Gemini が非決定的にハッシュタグ行を SCHEDULE 後に出力してもポストから消えないようにする）。
    const trailingTags = extractTrailingHashtagLine(text.slice(schedEnd, nextSchedStart));
    if (trailingTags) {
      content = `${content}\n${trailingTags}`;
    }

    drafts.push(content);
    schedules.push({
      label: formatScheduleLabel(sched[1], sched[2], locale),
      reason: sched[3].trim(),
    });
  }

  return { drafts, schedules };
}

// 対応URL: App Store / Google Play / GitHub Pages / GitHub / その他Web
export function detectUrlType(url: string): string {
  if (/apps\.apple\.com/i.test(url))  return "App Store（iOS アプリのダウンロードページ）";
  if (/play\.google\.com/i.test(url)) return "Google Play（Android アプリのダウンロードページ）";
  if (/github\.io/i.test(url))        return "GitHub Pages（デモまたはドキュメントサイト）";
  if (/github\.com/i.test(url))       return "GitHub（ソースコードまたはリポジトリページ）";
  return "Webアプリ・ランディングページ";
}

// テストから言語指示の有無を確認できるよう export する。
export function buildPrompt(
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string,
  todayStr: string,
  locale: LocaleId = DEFAULT_LOCALE,
): string {
  const lang = LOCALES[locale].promptName;
  const leads = URL_LEADS[locale];
  // 文字幅が違うので目安字数を言語で変える（CJK は 1 文字 2 ウェイト）。
  const lengthHint =
    LOCALES[locale].script === "latin"
      ? `${lang} は概ね 1 文字 1 ウェイトなので約 260 文字が目安`
      : `${lang} は 1 文字 2 ウェイトなので約 130 文字が目安`;
  return `あなたは個人開発者向けのTwitter/Xマーケティングの専門家です。
以下のプロジェクト説明を読み、そのプロダクトを宣伝するためのポストを5件生成してください。

【出力言語（最重要）】
ポスト本文・リード文・ハッシュタグはすべて **${lang}** で書く。
プロジェクト説明が何語で書かれていても、出力は必ず ${lang} にする。
製品名・サービス名・固有名詞は原語のままでよい。SCHEDULE の理由も ${lang} で書く。

【プロジェクト説明】
${projectText}
${toneMemo ? `\n【口調・トーン指示】\n${toneMemo}` : ""}
${url ? `\n【URL（必須）】\n全ポストに必ず以下のURLを含める。省略・変形は一切不可：${url}\nこのURLは「${detectUrlType(url)}」へのリンク。URLは単独行に置き、その直前の行にURLの種別に合ったリード文を記載する。\n- App Store/Google Play → 「${leads.appStore}」のような ${lang} の CTA\n- GitHub → 「${leads.github}」のような ${lang} の CTA\n- Webアプリ → 「${leads.web}」のような ${lang} の CTA\n5件それぞれ異なるリード文を ${lang} で書くこと。同じフレーズを繰り返さない。` : ""}
${hashtags
  ? `\n【ハッシュタグ（必須）】\n以下のハッシュタグを必ず含め、さらにプロダクトに関連するハッシュタグを追加して合計2〜3つにする。指定タグの省略・変形は一切不可：${hashtags}`
  : `\n【ハッシュタグ（必須）】\nプロダクトの内容・ターゲット層に合ったハッシュタグを2〜3つ生成して各ポストの末尾に付ける`}

【要件】
- 必ず5件のポストを生成する
- 各ポストは X の weighted length で 280 ウェイト以内に収める
- weighted length の計算ルール：半角英数記号=1、日本語・絵文字など全角文字=2、URL は実長を問わず 23 ウェイト固定
- ハッシュタグ・URL・リード文・改行を含めた合計を 280 ウェイト以内とする
- 余裕を持たせるため 260 ウェイトを目安に作成する（${lengthHint}）
- 本文には読みやすさのために1〜2箇所の改行を入れる
- ハッシュタグは本文・URLと改行して末尾に記載する（例：「本文\n#tag1 #tag2 #tag3」）
- 本文中にハッシュタグを入れた場合でも、最後の行にハッシュタグ行を必ず作る
- ハッシュタグ行は本文末尾に 1 行だけ。本文中・URL の前後に追加のハッシュタグ行を書かない
- ハッシュタグ行はポスト本文の一部であり、必ず SCHEDULE: 行より前に置く。SCHEDULE: 行の後ろにハッシュタグを書かない
- ハッシュタグはユーザー指定分を含め合計2〜3つにする（ハッシュタグ未指定の場合もプロダクトに関連するタグを2〜3つ生成する）
- タグを増やすより本文を充実させることを優先する。4つ以上のハッシュタグは付けない
${url ? `- URL は 1 ポストにつき 1 回のみ出力する。同じ URL も別の URL も、本文中に 2 回以上書かない\n- URL の直前リード文（例：「無料でダウンロード →」）も 1 ポストに 1 回のみ` : "- URLが指定されていないため、URL・アプリストアURL・App Store・Google Play などのリンクや参照テキストを一切含めない"}
- 1 ポストには本文を 1 つだけ書く。同一ポスト内に複数の本文パターン・複数の CTA・複数の段落構成を混在させない
- ストーリーアークの各段階は 1 ポスト内で 1 つだけ扱う。例えば「ユーザーの声・共感」と「CTA・エンゲージメント」を 1 ポストに同居させない
- SCHEDULE: 行はポスト本文の終端を示す。SCHEDULE: 行を出力したら、その後ろには何も書かず、次のポスト番号（例：2.）または出力終了まで空白以外の文字を入れない
- 以下のストーリーアークに沿って順番に生成する：
  1. プロジェクト紹介（何ができるアプリかを端的に伝える）
  2. 使い方・始め方（すぐ使えることを強調）
  3. 具体的なユースケース（誰にどんな場面で役立つか）
  4. ユーザーの声・共感（開発者あるあるの課題感）
  5. CTA・エンゲージメント（試してほしい呼びかけ）

【推奨投稿日時】
今日の日付：${todayStr}（翌日から7日以内の日付を指定すること）
各ポストの本文の直後の行に以下の形式で推奨投稿日時を出力する：
SCHEDULE: YYYY-MM-DD HH:MM / 理由（15文字以内）
- ポストの目的・ターゲット層・内容に合わせた日時を選ぶ
- 5件はすべて異なる日時にする

【出力形式】
必ず以下の形式で出力する。説明・見出し・空行は不要。
各ポストはハッシュタグ行で終わり、その直後の行に SCHEDULE: を置く（ハッシュタグ行は必ず SCHEDULE: 行より前）。

1. [ポスト本文]
#tag1 #tag2 #tag3
SCHEDULE: YYYY-MM-DD HH:MM / 理由
2. [ポスト本文]
#tag1 #tag2 #tag3
SCHEDULE: YYYY-MM-DD HH:MM / 理由
3. [ポスト本文]
#tag1 #tag2 #tag3
SCHEDULE: YYYY-MM-DD HH:MM / 理由
4. [ポスト本文]
#tag1 #tag2 #tag3
SCHEDULE: YYYY-MM-DD HH:MM / 理由
5. [ポスト本文]
#tag1 #tag2 #tag3
SCHEDULE: YYYY-MM-DD HH:MM / 理由${buildLanguageFooter(locale)}`;
}

// 指示文そのものが日本語なので、日本語 README を渡すとモデルは何もかも日本語で返しがちになる。
// 最後の指示ほど効くので、日本語以外を狙うときだけ英語の言語指定を末尾に足す。
// （実測: これが無いと日本語 README → 英語生成で 5 件中 3〜4 件が日本語のまま返っていた）
function buildLanguageFooter(locale: LocaleId): string {
  if (locale === DEFAULT_LOCALE) return "";
  const lang = LOCALES[locale].promptName;
  return `

CRITICAL — OUTPUT LANGUAGE
Write EVERY post body, lead line, hashtag and SCHEDULE reason in ${lang}.
The project description above may be written in another language. Do NOT mirror
its language: translate the meaning and write only in ${lang}. Product names,
service names and personal names may stay in their original script.
Only the keys "SCHEDULE:" and the numbering stay as shown above.`;
}

function buildShortenPrompt(
  originalText: string,
  currentWeight: number,
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string,
  locale: LocaleId,
): string {
  return `以下のポストは X の weighted length が ${currentWeight} で、上限 280 ウェイトを超過しています。文意・トーン・ハッシュタグを保ったまま、260 ウェイト以内に収まるように短縮してください。

【出力言語（最重要）】
短縮後も元のポストと同じ ${LOCALES[locale].promptName} のままにする。
参考として渡すプロジェクト説明が別の言語でも、その言語に引きずられてはいけない。

【プロジェクト説明（参考）】
${projectText}
${toneMemo ? `\n【口調・トーン指示】\n${toneMemo}` : ""}
${url ? `\n【URL（省略・変形不可）】\n${url}\nURLは単独行に置き、直前の行のリード文も必ずそのまま保持する。` : ""}
${hashtags
  ? `\n【ハッシュタグ】\n指定タグ「${hashtags}」は省略・変形不可。それ以外の関連タグは削ってよい（合計2〜3つ）`
  : "\n【ハッシュタグ】\n合計2〜3つに絞る。字数が厳しければ関連タグを削ってよい"}

【元のポスト】
${originalText}

【weighted length 計算ルール】
半角英数記号=1、日本語・絵文字など全角=2、URL は実長を問わず 23 ウェイト固定。

【出力形式】
短縮後のポスト本文のみを返す。番号・引用符・説明・前置きは一切含めない。`;
}

async function regenerateOne(
  originalText: string,
  currentWeight: number,
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string,
  ai: GoogleGenAI,
  locale: LocaleId,
): Promise<string> {
  const result = await generateContentWithRetry(ai, {
    model: GEMINI_MODEL,
    contents: buildShortenPrompt(originalText, currentWeight, projectText, toneMemo, url, hashtags, locale),
    config: {
      thinkingConfig: GEMINI_THINKING_OFF,
      temperature: 0.7,
      maxOutputTokens: 512,
    },
  }, 1);
  return (result.text ?? "").trim().replace(/^["「『]|["」』]$/g, "").trim();
}

// 言語違いのポストを目標言語に置き換える。
// 「書き直して」と頼むと元の draft に引きずられて同じ言語のまま返ってくるため、
// 翻訳タスクとして指示する。固有名詞の扱いだけ例外として明示する。
function buildRelanguagePrompt(draft: string, url: string, hashtags: string, locale: LocaleId): string {
  const lang = LOCALES[locale].promptName;
  return `次の X 向けポストを ${lang} に翻訳してください。原文の言語が何であっても、出力は ${lang} だけにします。

【厳守】
- 本文・リード文・ハッシュタグを 1 文字残らず ${lang} にする。原文の言語の単語・文・記号を残さない。
- 例外は製品名・サービス名・人名のみ。これらは原語のままでよい。
- リード文は 1 つだけにする。原文に複数あればまとめる。
- 出力は翻訳後のポスト本文のみ。前置き・解説・引用符・原文の再掲は付けない。
${url ? `- 次の URL を必ず単独行で含める（省略・変形は不可）：${url}` : ""}
${hashtags ? `- 次のハッシュタグを必ず含める：${hashtags}` : ""}

【原文】
${draft}`;
}

async function relanguageOne(
  draft: string,
  url: string,
  hashtags: string,
  ai: GoogleGenAI,
  locale: LocaleId,
): Promise<string> {
  const result = await generateContentWithRetry(ai, {
    model: GEMINI_MODEL,
    contents: buildRelanguagePrompt(draft, url, hashtags, locale),
    config: {
      // ここだけ thinking を有効にする。thinking 無効だと原文の言語に引きずられて
      // 「翻訳して」を無視することがあり、実測で 5 件中 1 件が日本語のまま返っていた。
      // 走るのは言語違いだったポストだけ・並列なので、60 秒上限への影響は限定的。
      thinkingConfig: GEMINI_THINKING_LIGHT,
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  }, 1);
  return (result.text ?? "").trim().replace(/^["「『]|["」』]$/g, "").trim();
}

// 目標言語で書かれていなければ書き直させる。改善しなければ元の draft を返す
// （生成そのものを失敗させるより、混在していても何か返すほうが実害が小さい）。
async function fixLanguage(
  draft: string,
  url: string,
  hashtags: string,
  ai: GoogleGenAI,
  locale: LocaleId,
): Promise<string> {
  if (!isWrongLanguage(draft, locale)) return draft;
  for (let attempt = 0; attempt < MAX_RELANGUAGE_ATTEMPTS; attempt++) {
    try {
      const rewritten = await relanguageOne(draft, url, hashtags, ai, locale);
      if (rewritten.length > 0 && !isWrongLanguage(rewritten, locale)) return rewritten;
    } catch {
      break;
    }
  }
  return draft;
}

// 1 ツイートを上限内に収まるまで最大 MAX_REGENERATE_ATTEMPTS 回まで逐次短縮する。
// 試行は前回の短縮結果に依存するため逐次。失敗時はそこで打ち切り直近の結果を返す。
async function shortenWithinLimit(
  draft: string,
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string,
  ai: GoogleGenAI,
  locale: LocaleId,
): Promise<string> {
  // まずハッシュタグを削って収まるか試し、それでも超過する場合だけ Gemini に短縮を頼む。
  let current = dropTagsToFit(reformatTweet(draft, hashtags, url, locale), hashtags);
  let weight = countWeighted(current);
  let attempts = 0;
  let languageFailures = 0;
  while (weight > TWEET_LIMIT && attempts < MAX_REGENERATE_ATTEMPTS) {
    try {
      const shortened = dropTagsToFit(
        reformatTweet(
          await regenerateOne(current, weight, projectText, toneMemo, url, hashtags, ai, locale),
          hashtags,
          url,
          locale,
        ),
        hashtags,
      );
      // 短縮プロンプトは日本語で、参考として日本語の README も渡している。
      // 短縮のはずみで別言語に化けた結果を採用してはいけない。
      // ただしこれは「短縮の失敗」ではないので、短縮の試行回数からは外す。
      // 数えてしまうと言語事故のぶんだけ短縮の機会が減り、上限超過のまま返りやすくなる。
      if (isWrongLanguage(shortened, locale)) {
        languageFailures++;
        if (languageFailures >= MAX_SHORTEN_LANGUAGE_FAILURES) break;
        continue;
      }
      attempts++;
      const shortenedWeight = countWeighted(shortened);
      if (shortenedWeight <= TWEET_LIMIT && shortened.length > 0) {
        return shortened;
      }
      if (shortened.length > 0 && shortenedWeight < weight) {
        current = shortened;
        weight = shortenedWeight;
      }
    } catch {
      break;
    }
  }
  return current;
}

export async function generateTweets(
  projectText: string,
  toneMemo: string,
  url: string,
  hashtags: string,
  locale: LocaleId = DEFAULT_LOCALE,
): Promise<Tweet[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません。");
  const ai = new GoogleGenAI({ apiKey });

  const today = new Date();
  const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  // 出力言語の指示を丸ごと無視して、README の言語で 5 件とも返ってくることがある。
  // その場合は 1 件ずつ翻訳させても直らない（元の言語に引きずられ続ける）ので、
  // バッチ単位で判定して生成し直す。少数の混在だけなら後段の fixLanguage に任せる。
  let drafts: string[] = [];
  let schedules: Tweet["recommendedTime"][] = [];
  for (let attempt = 0; attempt < MAX_BATCH_ATTEMPTS; attempt++) {
    const result = await generateContentWithRetry(ai, {
      model: GEMINI_MODEL,
      contents: buildPrompt(projectText, toneMemo, url, hashtags, todayStr, locale),
      config: {
        // 作り直しのときだけ thinking を入れる。初回から入れると毎回遅くなり、
        // Hobby の 60 秒上限に当たる。
        thinkingConfig: attempt === 0 ? GEMINI_THINKING_OFF : GEMINI_THINKING_LIGHT,
        temperature: 0.9,
        maxOutputTokens: 2048,
      },
    }, 3);
    const text = result.text;
    if (!text) {
      throw new Error("Gemini API から本文が返りませんでした。もう一度お試しください。");
    }

    ({ drafts, schedules } = parseGeneratedTweets(text, locale));

    const wrong = drafts.filter((d) => isWrongLanguage(d, locale)).length;
    if (wrong * 2 <= drafts.length) break;
  }

  // 5 件の処理は相互に独立なので並列実行する（逐次だと Hobby の 60 秒上限を超えやすい）。
  // 1 ツイート内では、言語を直してから長さを詰める。逆順だと書き直しで再び超過しうる。
  const finalDrafts = await Promise.all(
    drafts.map(async (draft) => {
      const inLanguage = await fixLanguage(draft, url, hashtags, ai, locale);
      return shortenWithinLimit(inLanguage, projectText, toneMemo, url, hashtags, ai, locale);
    }),
  );

  return finalDrafts.map((text, i) => {
    const weightedLength = countWeighted(text);
    return {
      id: i + 1,
      text,
      weightedLength,
      isOverLimit: weightedLength > TWEET_LIMIT,
      recommendedTime: schedules[i],
    };
  });
}
