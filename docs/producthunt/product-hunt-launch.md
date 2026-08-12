# Product Hunt ローンチ — Code Tweet

- **ローンチ予定日**: 2026-08-26（PH は太平洋時間 00:01 公開 = **JST 8/26 16:01**）。ランキング窓は JST 8/27 16:01 まで
- **製品 URL**: https://code-tweet.vercel.app/
- **想定ローンチ URL**: `https://www.producthunt.com/products/code-tweet?launch=code-tweet`（PH は製品名を slug 化する。**予約後に実物を確認すること**）
- **投稿アカウント**: Product Hunt は Keita Nakagawa（個人アカウント。company アカウントでは投稿できない）
- **ギャラリー**: `docs/producthunt/en/01〜05.png`（2540×1520）+ `thumbnail.png`（240×240）

### なぜ 8/26 なのか

Focus Gym が 8/12、TabeMemo が 8/19 に予約済み。自分のプロダクトを近い日に並べると票が割れる。
KondateCart（8/5 ローンチ）は **3 points・デイリー圏外**で終わっており、その敗因は素材ではなく**配布先**だった
（X 告知3本の合計インプレッションが 7）。今回は素材と同じ優先度で配布先を用意する。詳細は末尾の「配布先」節。

---

## 1. 投稿フォームに入れる内容

PH フォームの実際の上限は、ヘルプセンターの記載と食い違うことがある。**必ず画面のカウンタを読むこと**（Description は 500 で、ヘルプの 260 は古い）。

### Name（≤40字）

```
Code Tweet
```

タグラインや絵文字は入れない。製品名だけ。

### Tagline（≤60字）

| 案 | 文字数 | 内容 |
|---|---:|---|
| **A（採用）** | 44 | `Turn your README into a week of launch posts` |
| B | 43 | `Your README already wrote your launch posts` |
| C | 46 | `Paste a GitHub URL, get a week of launch posts` |
| D | 50 | `README in. Posts, article draft and store art out.` |

A を採用。「README」と「launch posts」という2つの具体語が入り、何をするツールか1行で分かる。
B は語感が良いが、何が起きるかが曖昧。D は3つの出力を全部言おうとして密度が高すぎる。

### Description（≤500字）

**採用案（457字）:**

```
Paste a GitHub repository URL. Code Tweet reads the README and drafts five X posts — intro, how-to, use case, relatable, CTA — each with a suggested posting time and the reasoning behind it, and each checked against X's 280-character weighting. The same README also produces a note.com article draft and export-ready App Store screenshots, in 8 languages. No account needed to try it. 3 free generations a month; credit packs start at ¥100 and never expire.
```

代替案（510字・**上限超過なので使うなら要短縮**）:

```
Code Tweet turns a GitHub README into the launch material you never get around to writing. Paste a repository URL and it fetches the README itself, then drafts five X posts — intro, how-to, use case, relatable, CTA — each with a weekday and time to post it and the reason why. The same README also becomes a note.com article draft and export-ready App Store screenshots, in any of 8 languages. Try it as a guest with no account. 3 generations free every month, credit packs from ¥100, and credits never expire.
```

### Launch tags（3つまで）

第1候補: `Developer Tools` / `Marketing` / `Artificial Intelligence`

⚠️ **2つ選ぶとドロップダウンが反応しなくなる**（入力しても候補も「該当なし」も出ない）。
2つで妥協するか、3つ目を足す前にページをリロードする。2つで十分フォームは通る。

### Link

```
https://code-tweet.vercel.app/?utm_source=producthunt&utm_medium=launch&utm_campaign=ph2026-08-26
```

KondateCart ではキャンペーンリンクを用意せず、フォールバック URL のまま公開したため**流入計測ができなかった**。
Web アプリなので App Store Connect のキャンペーンリンクは不要で、UTM で足りる。Vercel Analytics 側で参照元を確認する。

### Gallery

`docs/producthunt/en/` の 01〜05 を **1枚ずつ、順番に**アップロードする。
まとめて選ぶと PH が順序を入れ替える。アップロード後に並び順を目視で確認すること
（大きなプレビュー枠は1枚目の判定に使えない。確実を期すなら全部消して1枚ずつ入れ直す）。

#### 各スライドの素材の出どころ（差し替えるとき用）

| # | ファイル | 中身 | 素材 |
|---|---|---|---|
| 1 | `01-the-gap.png` | 痛み。コピーのみ | — |
| 2 | `02-one-input.png` | `/en` トップの実スクショをブラウザ枠に | `raw/home.png`（本番を headless Chrome で撮影） |
| 3 | `03-five-angles.png` | ポストカード 3 枚 | **アプリの実画面ではなく再現。** 本文・投稿時刻・文字数はすべて `drafts/dogfood-en.json` の実出力。生成結果画面はログインしないと出せないため、`TweetCard` と同じ体裁で組んだ |
| 4 | `04-same-readme.png` | App SS エディタの実スクショ | **実物。** ローカルの `/en/appss` に英語デッキを入れ、KondateCart の実機英語スクショ（`KondateCart/tools/app-store-screenshots/public/screenshots/apple/iphone/en/01–04.png`）を読み込んで撮影 |
| 5 | `05-pricing.png` | クローザー。コピーのみ | — |

**3 だけが再現である点は認識しておくこと。** 文言は実出力なので誇張はしていないが、
サインイン後に本物の生成結果画面を撮れるなら差し替えるほうが強い。手順は
`src/slides.json` の `03-five-angles` から `cards` を消して `image` / `crop` を入れ、`build.py` → `capture.sh`。

### Makers

「I worked on this product」+ ソロメーカーのチェックボックス。

---

## 2. First comment（必須）

```
Hi Product Hunt 👋

I'm Keita, an indie developer from Japan. I ship small apps on the side, and I kept
running into the same wall: the code gets finished, and then the announcement never
does. The build is the fun part. Writing about it, five different ways, in a language
that isn't my first — that's the part that quietly doesn't happen.

So I built Code Tweet. You paste a GitHub repository URL, it pulls the README itself,
and it drafts five posts for X: intro, how-to, use case, relatable, and a CTA. Each
one comes with a weekday and time to post it and the reasoning behind that choice, and
the weighted length is checked against X's 280 limit so nothing silently overflows.

The part I'm most attached to is that the same README goes further. It also produces a
note.com article draft, and export-ready App Store screenshots — headline copy, colors,
layout and all — in any of 8 languages. One input, three kinds of launch material.
Imported screenshots stay in your browser (IndexedDB); they're never uploaded.

Full disclosure: I drafted the announcement posts for this launch with Code Tweet
itself, from this repository's own README, and then edited them by hand. Dogfooding
it was the only honest way to find out where it still falls short — and it did tell
me something. The drafts it gave me were clean and on-message, but generic. Good
scaffolding, still worth a human pass.

You can try it as a guest without an account. 3 generations are free every month, and
if you need more, credit packs start at ¥100 and never expire — no subscription.

I'd love to hear what breaks, and what kind of project it handles badly. That's the
feedback I can actually act on.
```

---

## 3. 当日チェックリスト（JST）

| 時刻 | やること |
|---|---|
| 8/26 15:30 | PH の予約状態を確認。ローンチ URL の実物を控える |
| 8/26 16:01 | 公開。ギャラリーの並び順と Description の表示を実機で確認 |
| 8/26 16:06 | JA-1 投稿（@CodeTweet_app） |
| 8/26 16:11 | EN-1 投稿（@nakakei6439） |
| 8/26 16:20 | 配布先へ展開（Reddit / Show HN / Indie Hackers / 掲載済みディレクトリ） |
| 8/26 21:00 | JA-2 投稿（@nakakei6439）。ここまでの points を記録 |
| 8/27 00:00 | EN-2 投稿（@CodeTweet_app） |
| 8/27 08:00 | EN-3 投稿（@CodeTweet_app） |
| 8/27 12:00 | JA-3 投稿（@nakakei6439）。窓終了4時間前のラストコール |
| 8/27 16:01 | 窓終了。points / 順位 / コメント / X インプレッションをこのファイルに追記 |

コメントが付いたら**その日のうちに全部返す**。PH はメーカーの応答をランキングに反映する。

---

## 4. X 告知ドラフト

文字数は X の重み付け（ラテン=1・CJK と絵文字=2・URL は一律 23）で**実測**した値。編集したら再計測する。

計測は `python3 docs/producthunt/src/xcount.py` で回す（このファイルの本文をそのまま読む）。

| 順 | 案 | 相対 | JST | アカウント | weighted |
|---|---|---|---|---|---|
| 1 | JA-1 | +5分 | 8/26 16:06 | @CodeTweet_app | 252 / 280 |
| 2 | EN-1 | +10分 | 8/26 16:11 | @nakakei6439 | 266 / 280 |
| 3 | JA-2 | +5時間 | 8/26 21:00 | @nakakei6439 | 262 / 280 |
| 4 | EN-2 | +8時間 | 8/27 00:00 | @CodeTweet_app | 243 / 280 |
| 5 | EN-3 | +16時間 | 8/27 08:00 | @CodeTweet_app | 256 / 280 |
| 6 | JA-3 | +20時間 | 8/27 12:00 | @nakakei6439 | 231 / 280 |

同じ文面を両アカウントから流さない。@CodeTweet_app は製品の一人称、@nakakei6439 は開発者の一人称で書き分けている。

### JA-1 (@CodeTweet_app / 8-26 16:06)

```
Code Tweet を Product Hunt に出しました🚀

GitHub の README を貼るだけで、X 向けポスト5件・note 記事の下書き・App Store スクショまで作ります。8言語対応。

「コードは終わったのに告知が終わらない」を埋めるために作ったツールです。

https://www.producthunt.com/products/code-tweet?launch=code-tweet
```

### EN-1 (@nakakei6439 / 8-26 16:11)

```
Code Tweet is live on Product Hunt 🚀

Paste a GitHub README and it drafts 5 posts for X, a note.com article draft, and export-ready App Store screenshots. 8 languages.

I built it because my code kept shipping and my launch posts never did.

https://www.producthunt.com/products/code-tweet?launch=code-tweet
```

### JA-2 (@nakakei6439 / 8-26 21:00)

```
個人開発で一番続かなかったのが「作ったあとの宣伝」でした。

コードは楽しい。でも同じものを5通りの角度で、しかも英語で書くとなると手が止まる。

その部分だけを README に肩代わりさせたのが Code Tweet です。今日 Product Hunt に出しています。

https://www.producthunt.com/products/code-tweet?launch=code-tweet
```

### EN-2 (@CodeTweet_app / 8-27 00:00)

```
Every post Code Tweet writes comes with a weekday and a time to post it — and the reason it picked that slot.

Not "post more". A schedule you can actually follow, drafted from your own README.

On Product Hunt today 👇
https://www.producthunt.com/products/code-tweet?launch=code-tweet
```

### EN-3 (@CodeTweet_app / 8-27 08:00)

```
The part people don't expect: the same README also builds your App Store screenshots.

Headline copy, accent color, layout, device frame — generated, then editable in the browser. The screenshots you import never leave your device.

https://www.producthunt.com/products/code-tweet?launch=code-tweet
```

### JA-3 (@nakakei6439 / 8-27 12:00)

```
Product Hunt のランキング窓、残り4時間です。

Code Tweet は README を貼るだけで X ポスト5件・note 下書き・App Store スクショを作るツールです。ログインなしで試せます。

ひと押しいただけると本当に助かります🙏

https://www.producthunt.com/products/code-tweet?launch=code-tweet
```

### Code Tweet 自身に生成させた案（2026-08-12 実施）

`generateTweets(README.md, url = PH のローンチ URL, locale)` を直接呼んで生成した。
混在ゼロ（EN / JA とも 5 件すべてクリーン）。日本語 README からの英語生成が直ったことの実地確認にもなっている。

**評価: 素材としては使えるが、上の手書き案の置き換えにはならない。** 理由は 2 つ。

1. **Product Hunt に一言も触れない。** README に書いていないので当然だが、ローンチ告知としては成立しない
2. **一人称の動機が無い。** 「Tired of manual marketing posts?」「Stop procrastinating on marketing!」のような
   広告コピー調になる。KondateCart の教訓どおり、初動の票は「誰が・なぜ作ったか」で動く

→ **手書き案を主、生成案を語彙の供給源として使う。** First comment にもこの温度差をそのまま書いた（隠すより正直に書くほうが刺さる）。

生成物の全文は `docs/producthunt/drafts/dogfood-en.json` / `dogfood-ja.json`。再生成する場合は
`generateTweets` を lib 直呼びすること（API ルート経由だとゲスト枠・クレジットを消費する）。

拾って使えるフレーズ:

- EN: "Focus on coding, and let our AI handle the promotions."
- EN: "turns your README into polished marketing content, saving you hours of design and copywriting"
- JA: 「もう宣伝に悩まない。開発に集中して、アウトプットは AI に任せましょう」
- JA: 「開発は好きだけど、宣伝は苦手…」

---

## 5. 配布先（**素材と同じ優先度**）

KondateCart の敗因はここ。ローンチ日までに、票と反応を出せる相手を用意する。

### 既にログイン済み・即使える

| 先 | 動き |
|---|---|
| Solomaker | 記事投稿（`/articles/new`）でローンチ告知 |
| Tsukutta | 記事投稿（`/mypage/stories/new`）。Code Tweet のアプリページに紐付け |
| izanami | 記事投稿（`/mypage/new`）。要約 100〜140 字必須 |
| 個人dev | アプリページ（`/application/132`）の開発報告 |

### 未ログイン — **ユーザーがログインを済ませる必要がある**（アカウント作成とパスワード入力は代行できない）

Code Tweet は開発者向け Web アプリなので、KondateCart より相性が良い先が多い。

| 先 | 出し方 |
|---|---|
| Hacker News | Show HN 形式 |
| Reddit r/SideProject | 体験談形式。ローンチ告知そのものは嫌われる |
| Reddit r/webdev | 同上 |
| Indie Hackers | ローンチ投稿 |
| AlternativeTo | 簡潔な製品説明 |

**ログインさえ済めば、以降の投稿操作は代行できる。**

---

## 6. 未着手・ブロック中

- [x] ギャラリー 01〜05（2540×1520）・サムネイル（240×240）— 全枚数そろい、目視確認済み
- [x] X 告知6本の本文と文字数実測（全件 280 以内）
- [x] 言語混在の修正（実モデル 14 回試行で 13 回クリーン）
- [ ] **ギャラリー 03 を本物の生成結果画面に差し替える**（任意・サインインが必要）
- [ ] 配布先のログイン開通（上表）
- [ ] PH フォーム入力 → 8/26 で予約（**送信前に必ずユーザー確認**）
- [ ] 変更一式の commit / push（デプロイ前に必須。README は更新済み）

## 7. ⚠️ ローンチ前に判断が要る問題 — 英語生成に日本語が混ざる

2026-08-08 に本番（`/en`・ゲスト）で `nakakei6439/aifon_zaiko_cheak`（日本語 README）から X ポストを生成したところ、
**5件中3件に日本語が混ざった**。英語 UI・英語ロケールでの生成にもかかわらず。

実際の出力（1件目）:

> Want that iPhone 16 Pro Max 512GB - ブラックチタニウム? My Python script scrapes Apple整備済みiPhoneサイトを監視し、在庫があればDiscordに通知！価格情報も表示。

3件目はほぼ全文が日本語、ハッシュタグも `#在庫チェッカー`。2件目と4件目は英語として問題なし。

**プロンプト側の指示は入っている。** `src/lib/gemini.ts` の `buildPrompt` に
「プロジェクト説明が何語で書かれていても、出力は必ず ${lang} にする」と明記されている（【出力言語（最重要）】ブロック）。
つまり指示漏れではなく、**`gemini-2.5-flash`（thinking 無効）が日本語ソースに引きずられて指示に従いきれていない**。

**なぜローンチに効くか:** Product Hunt は英語圏のプラットフォームで、「8 languages」は今回の売りの1つ。
そこに来た人が日本語 README で試して日本語混じりの英語ポストが返ると、看板倒れになる。
また Code Tweet 自身の README も日本語なので、**ドッグフーディングで作る告知文も同じ問題を踏む**。

**方針: ローンチ前に直す**（2026-08-08 決定）。

### 根本原因

**生成プロンプト（`buildPrompt`）が全文日本語だったこと。** 日本語の指示文に日本語の README を渡すと、
途中に `${lang}` で出力言語を指定していてもモデルは日本語で返す。実測では 5 件すべてが日本語で返る回もあった。
1 件ずつ翻訳し直す対処だけでは足りず（元の言語に引きずられ続ける）、指示の出し方から直す必要があった。

### 実装した対処

| ファイル | 内容 |
|---|---|
| `src/lib/outputLanguage.ts`（新規） | 文字体系の比率で「目標言語で書かれていないか」を判定する `isWrongLanguage`。固有名詞を原語で残すぶんは通すよう、ラテン圏は非ラテン 12% まで許容 |
| `src/lib/gemini.ts` `buildLanguageFooter` | **最大の効き手。** 日本語以外を狙うときだけ、プロンプト末尾に英語で出力言語を指定する（最後の指示ほど効く） |
| `src/lib/gemini.ts` `generateTweets` | 過半数が別言語なら**バッチ丸ごと生成し直す**（作り直し時のみ thinking を有効化。最大 2 回） |
| `src/lib/gemini.ts` `fixLanguage` | 残った少数は「書き直して」ではなく**翻訳タスクとして**やり直させる（thinking 有効・最大 2 回） |
| `src/lib/gemini.ts` `buildShortenPrompt` | **見落としていた穴。** 短縮プロンプトに言語指定が無く、日本語の README を参考として渡していたため、英語に直したポストが短縮で日本語に逆戻りしていた。言語指定を追加し、短縮結果が別言語なら不採用にした |
| `src/lib/geminiAppSS.ts` | 同じ末尾フッターを追加。見出しコピーは 1 本が短くて単体判定できないため、全スライドをまとめて判定し、違反なら丸ごと生成し直す（最大 2 回） |
| `src/lib/__tests__/outputLanguage.test.ts`（新規） | 実際の混在出力を含む 11 ケース |

### 実モデルでの検証結果（2026-08-12）

`aifon_zaiko_cheak`（日本語 README）から `locale: "en"` で `generateTweets` を直接呼び、14 回試行。
ゲスト枠は API ルート側の制限なので、lib を直接叩けば消費しない。

| | 結果 |
|---|---|
| 対処前 | 5 件中 3 件に日本語が混在（本番で観測） |
| 対処後 | **14 回中 13 回が全件クリーン**。残り 1 回は言語混在ではなく API の一時エラー |

`npm run lint`（0 error / 既存 warning 2）・`npm run test`（174 passed）・`npm run check:i18n`・
`npm run build`・`npx tsc --noEmit` すべて通過。

**残っている限界:** 完全な保証ではない。翻訳し直しも失敗した場合は混在したまま返す
（生成ごと失敗させるより実害が小さいという判断）。ローンチ後もサンプルを見ること。

## 8. ローンチに向けて併せて入れた変更（2026-08-12）

1. **note Draft が日本語のみであることを 8 言語すべてで明記**
   （`generateForm.noteJapaneseOnly` / `aboutNotePage.japaneseOnly`）。
   他の 2 タブが 8 言語対応なので、書かないと「自分の言語でも出るはず」と誤解される。
   PH は英語圏なので、この誤解はそのままクレームになる。
2. **告知 URL の優先順位を App Store → Google Play → Web → GitHub に変更**
   （`src/lib/urlCategory.ts` の `URL_CATEGORY_PRIORITY` / `pickPreferredUrl`）。
   従来は README 読み込み時に GitHub リポジトリ URL を無条件で入れていたため、
   ストアや Web アプリがあるプロジェクトでも全ポストがソースコードへのリンクになっていた。
   URL 欄のカテゴリボタンの並びも同じ順に揃えた。

## 9. 作業中に見つかった別件（このローンチとは無関係）

1. **出荷中の英語 UI に事実誤り** — `/en/about/appss` の Features に
   "Note: generated copy is currently Japanese."（`messages/en.json` の `aboutAppssPage.feature1Body`）。
   App SS の見出しコピーは既に 8 言語対応済みなので誤り。同ページの
   "Typeset beautifully in Japanese / Nine Japanese typefaces" も、実際は 15 書体・4 文字体系に増えている
2. **`docs/ad-assets/` の広告素材6枚が陳腐化** — 2026-05 撮影、UI は日本語、
   `03-pricing.png` は旧 Pro 月額 500 円時代の画面。App SS タブは一切写っていない
