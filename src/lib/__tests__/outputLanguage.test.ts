import { describe, expect, it } from "vitest";
import { isWrongLanguage } from "@/lib/outputLanguage";

describe("isWrongLanguage", () => {
  it("英語指定に日本語が混ざったポストを検出する", () => {
    // 本番（/en・ゲスト）で実際に返ってきた出力
    const leaked =
      "Want that iPhone 16 Pro Max 512GB - ブラックチタニウム? My Python script scrapes " +
      "Apple整備済みiPhoneサイトを監視し、在庫があればDiscordに通知！価格情報も表示。";
    expect(isWrongLanguage(leaked, "en")).toBe(true);
  });

  it("英語指定でほぼ全文が日本語のポストを検出する", () => {
    const leaked =
      "Apple整備済みiPhone 16 Pro Max 512GB の在庫チェッカーを公開！" +
      "スクレイピングで在庫を監視し、Discordに通知。価格表示も。もうリフレッシュ不要！";
    expect(isWrongLanguage(leaked, "en")).toBe(true);
  });

  it("英語として正しいポストは通す", () => {
    const clean =
      "Ready to set up your iPhone stock checker? Just pip install the requirements " +
      "and run the script. Discord notifications are pre-configured.";
    expect(isWrongLanguage(clean, "en")).toBe(false);
  });

  it("固有名詞だけ原語で残した英語ポストは通す", () => {
    // プロンプトが「製品名・固有名詞は原語のままでよい」と指示しているので、
    // この程度の混在で作り直しを走らせてはいけない。
    const clean =
      "I just shipped 献立カート, a meal planner that builds your shopping list for you. " +
      "Plan the week once and the list is done. Free on the App Store today.";
    expect(isWrongLanguage(clean, "en")).toBe(false);
  });

  it("日本語指定で英語が返ってきた場合を検出する", () => {
    const leaked =
      "Just shipped Code Tweet, a side project of mine. Paste a GitHub README and " +
      "it drafts five posts for X in one go.";
    expect(isWrongLanguage(leaked, "ja")).toBe(true);
  });

  it("日本語として正しいポストは通す", () => {
    const clean =
      "Code Tweet を公開しました。GitHub の README を貼るだけで、X 向けのポストを5件まとめて作ります。";
    expect(isWrongLanguage(clean, "ja")).toBe(false);
  });

  it("韓国語指定に日本語が混ざった場合を検出する", () => {
    expect(isWrongLanguage("Code Tweet 출시했습니다. README를 붙여넣으면 게시물을 만들어 줍니다。かなが混ざる", "ko")).toBe(true);
  });

  it("韓国語として正しいポストは通す", () => {
    expect(
      isWrongLanguage("Code Tweet 출시했습니다. GitHub README를 붙여넣으면 X 게시물 5개를 한 번에 만들어 줍니다.", "ko"),
    ).toBe(false);
  });

  it("簡体字として正しいポストは通す", () => {
    expect(isWrongLanguage("发布了 Code Tweet。粘贴 GitHub 的 README，就能一次生成五条推文。", "zh-Hans")).toBe(false);
  });

  it("URL とハッシュタグは判定から除く", () => {
    // 本文は英語のみ。URL のホスト名やタグが比率を歪めてはいけない。
    const clean = "Paste a README and get five posts.\n\nhttps://code-tweet.vercel.app/\n\n#個人開発 #リリース";
    expect(isWrongLanguage(clean, "en")).toBe(false);
  });

  it("判定材料が乏しい短文は判定しない", () => {
    expect(isWrongLanguage("完了", "en")).toBe(false);
    expect(isWrongLanguage("Done", "ja")).toBe(false);
  });

  it("韓国語に漢字の熟語が混ざった出力を検出する", () => {
    expect(isWrongLanguage("과학습을 방지하고最短 루트로 프로그래밍을 익히세요.", "ko")).toBe(true);
  });

  it("韓国語で漢字が 1 文字だけの出力は通す", () => {
    expect(isWrongLanguage("日 프로젝트를 소개합니다. README를 붙여넣어 보세요.", "ko")).toBe(false);
  });

  it("入力に出てくる製品名のかな・漢字は ko の判定から除外する", () => {
    const source = "サバイバルTypeScriptは実務で必要な知識を学べる書籍です。";
    const ko = "'サバイバルTypeScript'를 소개합니다! 실무에 필요한 지식만 골라 배울 수 있어요.";
    expect(isWrongLanguage(ko, "ko")).toBe(true);
    expect(isWrongLanguage(ko, "ko", source)).toBe(false);
  });

  it("入力に無い漢字の熟語は入力を渡しても ko の違反にする", () => {
    const source = "サバイバルTypeScriptは書籍です。";
    expect(isWrongLanguage("과학습을 방지하고最短 루트로 프로그래밍을 익히세요.", "ko", source)).toBe(true);
  });

  it("日本語の文を丸ごと流用した ko 出力は入力を渡しても違反にする", () => {
    const source = "実務で必要な知識だけを学べる書籍です";
    expect(isWrongLanguage("実務で必要な知識だけを学べる書籍です 좋아요", "ko", source)).toBe(true);
  });
});
