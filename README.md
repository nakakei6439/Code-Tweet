# Code Tweet

README やプロジェクト説明を AI が分析し、X（旧 Twitter）向けのマーケティングポスト 5 件、note.com に貼り付けられる Markdown Draft 1 本、または App Store 提出用スクリーンショット（App SS）を生成する個人開発者向け Web アプリ。

- 本番 URL: https://code-tweet.vercel.app/
- ドキュメント索引: [docs/index.md](./docs/index.md)
- プロダクト概要: [docs/product.md](./docs/product.md)
- セットアップ: [docs/setup.md](./docs/setup.md)
- 運用メモ: [docs/operations.md](./docs/operations.md)
- 実装履歴: [docs/history.md](./docs/history.md)

## 現在の状態

本番稼働中。GitHub OAuth、README 取得、Code Tweet / note Draft / App SS のタブ式生成、利用制限、Stripe 課金、管理画面、Pro 向け生成履歴まで実装済みです。

**2026-08-14: プロダクトの軸を App SS に寄せました。**トップページの既定タブを App SS に変更し（`src/app/[locale]/page.tsx`）、ヒーローコピー・`homePage.title` / `description`・`meta.description` を 8 言語すべて書き換えています。理由は、X 向けポスト生成が汎用チャット AI で代替可能なのに対し、**「撮ったスクショを掲載画像に変える」部分は代替コストが高く、ここが本当の差分だと判断したため**です。

**2026-09-03: 既定タブに加えて 8 言語のヒーロー/メタ文言・`homePage.title` / `description` も Code Tweet 先頭に戻しました。**トップページの既定タブを App SS から Code Tweet に戻し（`src/app/[locale]/page.tsx`）、タブバーの並びを `note Draft` / `Code Tweet` / `App SS` に変更しています（`src/components/GenerateTabs.tsx`）。さらに、cf5f04e「Lead with App SS」で App SS 先頭に書き換えていた 8 言語の `homePage.title` / `description`・`meta.description` と README のヒーロー文を、cf5f04e 直前の Code Tweet 先頭版へ復元しました（`messages/*.json` 8 ファイル + `README.md`）。一方、App SS タブ固有の説明である `generateForm.heroAppss` だけは、今回 App SS の出力内容を正確に説明する現行版（cf5f04e の文）を**そのまま維持**しています。

UI は 8 言語（日本語 / 英語 / スペイン語 / 簡体字中国語 / 繁体字中国語 / フランス語 / ドイツ語 / 韓国語）に対応しています。

短期では新機能追加より、Pro 課金者数の増加、計測、軽微な導線改善を優先します。

## クイックスタート

```bash
npm install
npm run dev
```

ローカル起動後、http://localhost:3000 を開きます。環境変数、Supabase、Stripe、GitHub OAuth、SQL 適用の詳細は [docs/setup.md](./docs/setup.md) を参照してください。

## 主要仕様

### 生成モード

| モード | 出力 | 主な用途 |
|---|---|---|
| note Draft | note.com 向け Markdown Draft 1 本 | プロダクト紹介記事の下書きを作る |
| **Code Tweet**（既定タブ） | X 向けポスト 5 件 | README から 1 週間分の告知ポストを作る |
| App SS | App Store 掲載画像の PNG 一括書き出し | 自分で撮ったスクショを、見出し・枠付きの掲載画像に変える |

> **App SS はスクリーンショットを撮る機能ではありません。**撮影は利用者が行い、App SS はその画像を
> App Store の掲載画像（＝広告）に変えます。生のシミュレータ画像とストア掲載画像を分けているのは
> 見出し・デバイスフレーム・背景であり、そこを引き受けるのがこのモードです。

- いずれも GitHub リポジトリ URL から README を取得できます。
- GitHub ログイン中はリポジトリ一覧から選択できます。
- 口調メモ、投稿・記事に載せる URL、ハッシュタグを任意指定できます（App SS はトーン指示のみ）。
- 投稿に載せる URL は README から自動で選びます。優先順位は **App Store → Google Play → Web → GitHub** で、GitHub リポジトリは他に行き先が無いときの最終手段です（読み手に踏んでほしいのは「使える場所」であるため）。URL 欄のカテゴリボタンも同じ並びです。
- note Draft は短め、標準、長めの長さプリセットを選択できます。
- note Draft は「①コピー → ②noteエディタを開く → ③貼り付け」の手順を画面に明示し、本文コピーから note 新規記事ページのワンクリック起動までを案内します。
- 生成したポストは「Xで投稿」ボタンから、本文入りの X 投稿画面をワンクリックで開けます（共有リンク方式・ログイン不要）。
- App SS は見出しコピー・強調ワード・テーマ配色/背景装飾を AI が一括生成します。テーマは「AIにおまかせ」でアプリ専用の配色パレットを都度生成することもできます。
- App SS のレイアウトはヒーロー・デバイス上/下・2台重ね・コラージュ（2枚/3枚）・見出しのみの7種、配色テーマ 11 種、日本語フォント 9 種、背景装飾 5 種から選べます。取り込んだスクショはブラウザの IndexedDB にのみ保存され、サーバーへは送信されません。
- App SS は iPhone と **iPad（13インチ・縦のみ）** をエディタ左上のトグルで切り替えられます。7 レイアウトすべてが両デバイスでそのまま成立し、見出し・テーマ・取り込み済みスクショは切替時に保持されます。書き出しサイズは iPhone が 6.9 / 6.5 / 6.3 / 6.1 インチの 4 種（1320×2868 など）、iPad が **13インチ必須サイズの 2064×2752px** の 1 種です。**iPad 横向き（ランドスケープ）と 12.9インチ iPad（2048×2732）は対象外**です（App Store Connect が 13インチから自動スケールするため）。
- 2026-09-05 時点: iPad プレビューはスプリント 01 で用意した**暫定の角丸枠フレーム**でデバイスを描いています（実機の Apple Design Resources iPad ベゼル画像への差し替えは今後の課題）。提出可能な PNG は問題なく書き出せますが、ベゼルの見た目は iPhone の公式ベゼルとは異なります。差し替え準備が整い次第、docs/product.md のバックログを通じて再開します。
- App SS は README を読み込んだ時点で、アプリ名・説明・主な機能を AI が推定してフォームに自動入力します（無料・回数消費なし）。
- App SS の見出しコピーは 8 言語から生成言語を選べます。選んだ言語の文字体系に合うフォント（簡体字・繁体字・韓国語用の Noto Sans/Serif）へ自動で切り替わります。1 デッキにつき 1 言語です。
- App SS の書き出し（透かし入り）・エディタ編集は無料・無制限です。透かしを外した書き出しのみ生成回数を1回消費します。**iPhone / iPad の透かし解除書き出しはデバイス別にもう 1 回ずつ消費**します（同一プロジェクトを iPhone と iPad 両方で書き出せば 2 回分の消費）。
- 生成回数は Code Tweet・note Draft・App SS（コピー生成・透かし解除書き出し）で合算カウントされます。
- 画面表示は 8 言語に対応しています。日本語は従来どおり接頭辞なし（`/pricing`）、他言語は `/en/pricing` のようにパスが付きます。
- X ポストと App SS の見出しコピーは 8 言語で生成できます。X ポストは生成後に「この内容を他の言語でも作る」から言語を追加できます（翻訳ではなく、同じ README からその言語で書き直します）。クレジットは 4 言語ごとに 1 回分を消費します。
- **ポストを書く言語は、画面の表示言語とは別に選べます**（Code Tweet タブの「ポストの言語」。既定は表示言語）。日本語の画面のまま英語のポストを作れるので、一度日本語で生成してから追加生成する（＝クレジット 2 回分）必要がありません。App SS はエディタ側に同じ選択肢があります。ログイン時の任意指定欄に表示されます。
- **note Draft の生成言語は日本語のみです**（note.com が日本語圏のサービスであるため）。この制約は note タブのヒーロー直下と「note Draft とは」ページに 8 言語すべてで明記しています。
- 日本語以外を指定したときは、生成結果が本当にその言語で書かれているかを文字体系の比率で検査します（`src/lib/outputLanguage.ts`）。プロンプト末尾の英語による言語指定、過半数が別言語なら丸ごと再生成、残った1件は翻訳し直し、短縮時の言語逆戻り防止の4段構えです。日本語 README から英語で生成させると日本語が混ざる事象への対処で、実測 5 件中 3 件混在 → 14 回中 13 回クリーンまで改善しています。

### プランと制限

| 区分 | 生成回数 | README 文字数 | リポジトリ |
|---|---:|---:|---|
| ゲスト | 3 回まで | 1,000 文字 | 公開リポジトリ |
| 無料ログイン | 月 3 回 | 1,000 文字 | 公開リポジトリ、リポジトリ一覧選択 |
| クレジット購入者 | 月 3 回 + 購入クレジット | 10,000 文字 | 公開・非公開リポジトリ |

クレジットパックは単発課金（10回 ¥100 / 30回 ¥300 / 50回 ¥500 / 100回 ¥700、定義は `src/lib/creditPacks.ts`）。購入クレジットに有効期限はなく、毎月の無料枠を使い切ったあとに 1 回ずつ消費されます。ログインユーザーの無料枠は月初にリセットされます。ゲスト利用は IP ハッシュ単位の累計です。旧 Pro サブスク（月額 500 円・月 30 回）は新規販売を停止し、既存契約者のみ継続しています。

クレジット購入者・サブスク契約者の生成履歴は、Code Tweet の生成結果を最新 50 件まで保存します。

機能、保存方針、KPI、リスクは [docs/product.md](./docs/product.md) に集約しています。

## よく使うコマンド

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run lint` | ESLint 実行 |
| `npm run test` | Vitest 実行 |
| `npx tsc --noEmit` | TypeScript 検証 |
| `npm run build` | 本番ビルド |
| `npm run check:i18n` | 未訳の日本語と翻訳キー欠落の検出 |
| `npm run verify:logs` | JSON ログ形式の検証 |
| `git diff --check` | 空白エラー確認 |

## 技術構成

- Next.js App Router 16、React 19、TypeScript
- next-intl（UI の 8 言語対応。`localePrefix: "as-needed"`）
- Tailwind CSS v4
- Supabase Auth / Database / RLS
- Gemini API `gemini-2.5-flash`
- Stripe Checkout / Webhook / Customer Portal
- Vercel Analytics、Speed Insights、Microsoft Clarity
- Google Search Console（所有権確認は `public/google56bb80f617a5907b.html`。**削除すると確認が外れます**。`src/proxy.ts` の matcher が `.html` を除外していないと next-intl に書き換えられて 404 になるため、境界を `src/lib/__tests__/proxyMatcher.test.ts` で固定しています）

主な環境変数は `GEMINI_API_KEY`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`GITHUB_PAT_ENCRYPTION_KEY`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_PRICE_ID`、`NEXT_PUBLIC_APP_URL`、`NEXT_PUBLIC_CLARITY_PROJECT_ID`、管理画面用の `ADMIN_*` です。

## 作者

- Keita Nakagawa（中川景太）
- GitHub: [@nakakei6439](https://github.com/nakakei6439)
- X: [@nakakei6439](https://x.com/nakakei6439)
- Zenn: [@nakakei6439](https://zenn.dev/nakakei6439)
