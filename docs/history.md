# Code Tweet 実装履歴

古い詳細メモは削除し、現在の判断に必要な経緯だけを残します。最新仕様は [product.md](./product.md)、セットアップは [setup.md](./setup.md) を参照してください。

## 時系列

| 時期 | 内容 |
|---|---|
| V1 | Next.js 16 App Router、TypeScript、Tailwind CSS v4 で MVP を作成。Gemini API で X 投稿を5件生成する基本機能を実装 |
| V1 改善 | 生成結果の UI、推奨投稿日時、URL/ハッシュタグの扱い、280 weighted length 対応を改善 |
| V2 | GitHub URL から README を取得する機能を追加。サーバー側で API キーを扱う構成へ移行 |
| V2.1 | Supabase に `usage_logs` と `ip_usage_logs` を追加し、ゲスト/ログインユーザーの利用制限を導入 |
| V3 | GitHub token / PAT の暗号化保存と Pro 向けプライベートリポジトリ対応を追加 |
| V8 Phase A | フリーミアム基盤を追加。無料/Pro の tier、月単位制限、Stripe 統合前の購読状態管理を整備 |
| V8 Phase A.5 | GitHub OAuth 一本化、リポジトリ選択 UI、残り回数表示、設定ページ、料金導線を整備 |
| V8 Phase B | Stripe Checkout / Webhook / Customer Portal を実装し、Pro 課金運用に対応 |
| V9 | Pro ユーザー向け生成履歴を追加。README 本文や追加プロンプト本文は保存しない方針にした |
| V9.1 | 生成履歴の保存上限を1ユーザーあたり最新 50 件に制限。INSERT 成功後に超過分を同期削除 |
| クレジットパック移行 | 旧 Pro サブスクの新規販売を停止し、単発課金のクレジットパックへ主軸を移行。2026-07-18 に価格改定（10回¥100 / 30回¥300 / 50回¥500 / 100回¥700）、Pro 誤表示の残骸を掃除 |
| App SS V1（2026-07-17） | README から App Store 提出用スクリーンショットを生成する新機能を追加。ブラウザ完結のエディタ + Gemini によるコピー生成。ParthJadhav/app-store-screenshots（MIT）を参考に日本語・AI生成向けに再実装 |
| App SS v2（2026-07-18） | コラージュレイアウト2種（2枚 `collage-duo` / 3枚 `collage-trio`）、アプリ専用の配色パレットをそのつど生成する `customTheme`、透かし解除書き出しの課金ゲート（`/api/appss/export-unlock`）を追加 |
| App SS v3（2026-07-21） | 配色テーマを 5 → 11 種、日本語フォントを 3 → 9 種に拡張。README 読み込み時にアプリ名・説明・主な機能を推定してフォームへ自動入力する `/api/appss/extract-info` を追加（`/api/appss/copy` とは別扱いで回数消費なし・IP 単位の粗いレート制限のみ） |
| UI 多言語化（2026-08-03） | next-intl を `localePrefix: "as-needed"` で導入し、UI・LP・法務ページを 8 言語対応に。サーバー側のエラー文言はコード化してクライアントで解決する方式へ移行。`npm run check:i18n` で未訳と翻訳キー欠落を検出する |
| App SS 多言語コピー（2026-08-03） | 見出しコピーの生成言語を 8 言語から選べるようにし、簡体字・繁体字・韓国語の Noto Sans/Serif を追加。`AppSSProject.locale` を新設し、言語の文字体系に合わないフォントは既定へ差し替える |
| X ポスト多言語生成（2026-08-03） | 生成結果から言語を追加できるようにし、`gemini.ts` の日本語ハードコード（曜日配列・CTA 正規表現・パースマーカー・URL リード文）を解体。1 リクエスト = 1 言語に分割し、クレジットは 4 言語ごとに 1 消費 |
| 既定タブを Code Tweet に戻し、Code Tweet を中央に配置（2026-09-03） | トップページの既定タブを App SS から Code Tweet に戻し、タブバーの並びを `note Draft` / `Code Tweet` / `App SS` に変更 |
| 前面コピーを Code Tweet 先頭に戻す（2026-09-03） | cf5f04e「Lead with App SS」で App SS 先頭に書き換えていた 8 言語の `homePage.title` / `description`・`meta.description`・README を cf5f04e^ の Code Tweet 先頭版へ復元。`heroAppss` は App SS タブ固有の説明として現行版を維持 |
| App SS iPad 切替・トグル UI（2026-09-04、スプリント 01） | エディタ左上に「iPhone / iPad」トグルを追加し、選択中のデバイス種別でキャンバスの縦横比を切り替えられるようにした。iPad 用の暫定フレーム（角丸枠）を `DeviceFrame.tsx` に追加し、スクリーンショット画像が枠内に収まることを確認。8 言語に切替ラベルを追加し、ページ再読み込み時に iPhone へ戻る仕様（デバイス種別は非保存、プロジェクト内容は保持）を `spec.md` に明記 |
| App SS iPad 7 レイアウト対応（2026-09-05、スプリント 02） | 既存の 7 レイアウトすべて（hero / device-bottom / device-top / two-devices / collage-duo / collage-trio / no-device）を iPad の縦横比（2064×2752 ＝ 0.75）で破綻なくレンダリングできるよう既定 rect を作り直し。iPhone 側の数値・式は 1 行も触らず、`getIPadDefaultRects` を新設して分岐。iPad のキャンバスが `canvasFor("ipad")` で取得できるようになり、Inspector / exporter が共通で参照する形に |
| App SS iPad 書き出し（2026-09-05、スプリント 03） | iPad 選択時の zip 書き出しを実装。13インチ必須サイズの **2064×2752px** PNG が `ipad-2064x2752/` フォルダに格納され、zip 名に `-ipad` サフィックスを付与して iPhone と取り違えなくした。iPhone は従来どおり 4 サイズ（6.9 / 6.5 / 6.3 / 6.1 インチ）。透かし ON / OFF、進捗表示、IndexedDB ベースの画像取り込み、デバイス別のクレジット消費（iPhone と iPad は独立した操作として 1 回ずつ消費）は iPhone と同一の挙動 |
| App SS iPad 実機ベゼル差し替え（2026-09-05、スプリント 04、保留） | 暫定の角丸枠を Apple 公式 iPad Pro 13インチ Product Bezel（縦向き）に差し替えるスプリント。Apple Design Resources の画像取得と画面開口部の座標実測はコードで自動化できない人手の作業のため、2026-09-05 ユーザー判断で保留。スプリント 01 の暫定フレームのままリリースし、ベゼル画像が用意でき次第、後日再開 |
| App SS iPad 対応のドキュメント反映（2026-09-05、スプリント 05） | `README.md` の主要仕様の表と `docs/product.md` の App SS 節・「今後の候補」セクションを iPad 対応済み・ベゼル暫定の旨に更新（横向き・12.9インチ非対応を含む）。本ファイルにスプリント 01〜04 の履歴を追記。**実機 iPad ベゼルへの差し替えは引き続き今後の課題** |
| App SS 汎用デバイスフレームへの統一（2026-09-05、スプリント 04、方針転換） | Apple Design Resources のライセンス条文を再確認したところ、複数ユーザー向け製品への組み込み・再配布は許諾範囲外と判明。Code Tweet のような SaaS への同梱は許諾違反にあたるため、iPhone の既存ベゼルも含めて撤廃し、iPhone / iPad とも汎用フレーム（角丸の黒枠 + 内側に画面領域、外形比はそれぞれ設計キャンバスの縦横比）に統一。`DEVICE_PROFILES.iphone.bezelRatio` を 1470/3000 から CANVAS.w/CANVAS.h に変更し、`BEZEL` / `BEZEL_RATIO` 定数と `public/appss/bezel-iphone.png` を削除。`NOTICE.md` の Apple Product Bezels セクションも削除 |
| App SS iPad 11インチ書き出し追加（2026-09-07、スプリント 06） | iPad 選択時の zip に App Store Connect の 11インチ任意サイズ **1488×2266px** を追加。書き出しサイズは `IPAD_EXPORT_SIZES` の配列（13インチ + 11インチ）に統一し、フォルダは `ipad-2064x2752/` と `ipad-1488x2266/` の 2 種類。`SlideCanvas` に `exportCanvas` オプションを足し、`getDefaultRects` / `getIPadDefaultRects` / `getElementTransform` が cW/cH を引数で受け取れるように拡張して 11インチ比率で rect をリフロー（13インチ描画の単純引き伸ばしスケールではない、専用レイアウト調整は無し）。`AppSSEditor.exportAll` のサイズループで iPad の各サイズごとにオフスクリーン DOM の寸法と `SlideCanvas.exportCanvas` を切り替え、`await waitForPaint()` で React commit を待つ。`DeviceFrame` に `ratioOverride` を追加して 11インチ外形比 (≈ 0.657) で描画。透かし ON / OFF・進捗表示・IndexedDB ベースの画像取り込みは据え置き。**透かし解除の課金消費は「書き出し操作 1 回 = 1 回分」のまま**（13"/11" をまとめて 1 回で出しても多重課金なし）。iPhone 側の挙動と EXPORT_SIZES / CANVAS / プレビューは完全不変 |
| 現在 | 管理画面、規約、プライバシーポリシー、問い合わせ導線、ゲスト利用回数リセット、管理画面ログインロックまで実装済み。App SS は iPhone と iPad（13インチ・縦のみ）の両対応、iPad は 13インチ + 11インチの 2 サイズを zip 同梱、デバイスフレームは汎用フレームで統一 |

## 重要な設計判断

- 認証は GitHub OAuth に一本化した
- GitHub OAuth token はログイン callback で暗号化保存し、公開リポジトリ一覧の取得に使う
- ゲスト利用は IP ハッシュ単位の累計、ログイン利用はユーザー単位の月次制限
- README の通常の文字数超過はフォーム上のエラー表示に任せ、極端な payload だけ API 側で粗く止める
- 月間生成回数の上限（無料 3 回 / 旧 Pro 30 回）は維持し、AI コスト上振れを避ける
- クレジット購入者・旧 Pro 契約者の生成履歴には出力結果だけを保存し、入力本文は保存しない。保存上限は 1 ユーザーあたり最新 50 件で、超過分は新規追加時に自動削除する
- 管理画面は管理者メール、Basic 認証、TOTP、失敗回数ロックを組み合わせる
- App SS のエディタ・画像取り込みはクライアント完結とし、スクショ画像は端末外（サーバー）に一切送らない
- App SS のコピー生成・透かし解除書き出しは、Code Tweet / note Draft と同じ月次無料枠＋購入クレジットの共有プールを消費する
- App SS の PNG 合成・複数サイズ書き出し・zip化はすべてブラウザ側で行い、サーバーは画像データを扱わない
- README からのアプリ情報推定（`/api/appss/extract-info`）は入力補助なので回数を消費しない。代わりに `ip_usage_logs` を使わないプロセス内メモリの粗い IP スロットルで踏み台化だけを防ぐ（生成枠を消費させると補助機能がゲストの無料3回を食い潰すため）
- Apple Product Bezel・Google Fonts のライセンス条件を守り、改変せず用途を限定して使用する（詳細は `NOTICE.md`）。**2026-09-05 方針転換**: Apple Design Resources の再確認により複数ユーザー向け SaaS への組み込みは許諾範囲外と判断し、App SS のデバイスフレームは Apple 公式ベゼルを使わず iPhone / iPad 共通の汎用フレームへ統一した
- 日本語は既存 URL を変えない（`localePrefix: "as-needed"`）。既存の日本語 SEO を毀損しないため、cookie ベースの出し分けではなくパス方式を採る
- API のエラー文言はサーバーで組み立てず、`code` + `params` を返してクライアント（`messages` の `apiErrors`）で解決する。Route Handler は `[locale]` の外にあり表示言語を確実に決められないため
- 利用規約は日本語版を正文とし、他言語版は参考訳と明記する（9条）。プライバシーポリシーは開示文書なので同条項は置かない
- App SS は 1 デッキ 1 言語（`AppSSProject.locale`）とする。スライド文言を `Record<LocaleId, …>` にして 1 デッキで全言語を持つ案もあったが、SlideCanvas / Inspector / exporter まで読み取り側が全て書き換えになるため、まず言語を 1 つ持つ形で通した
- App SS のフォントは `FONTS[].script` で文字体系を持ち、ロケールに合うものだけを UI に出す。日本語フォントで簡体字を組むと豆腐（□）になるため。ラテン圏は日本語フォントがラテン字形を持つのでそのまま流用する
- App SS の透かし迂回は技術的に防げない（PNG 生成が完全にクライアント側）。サーバー描画は限界費用ほぼゼロという構造を壊すので採らず、軽度の迂回は許容する
- 多言語ポストは翻訳ではなく再生成にする。翻訳だと各言語の言い回しと 280 weighted length 最適化が効かないため（CJK は 1 文字 2 ウェイト）
- 多言語生成は 1 リクエスト = 1 言語に分割する。maxDuration 60 秒に収まり、`recordUserUsage`（1 行 insert）と `consume_credit`（常に 1 減算）が無改造で動き、Gemini コストが言語数に比例して粗利率が保てる。クレジットは 4 言語ごとに 1 消費（切り上げ）
- `formatScheduleLabel` は日本語のみ従来表記を維持し、他言語は `Intl.DateTimeFormat` に委譲する。曜日名を手で持つと言語を足すたびに配列が増えるため
- `/admin` は運用者専用で訪問者が到達しないため日本語のまま据え置く。ロケール接頭辞付き URL でも認証ゲートを通ることをテストで固定している
