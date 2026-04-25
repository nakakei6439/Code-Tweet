# STEP 4: 実装メモ - Code Tweet V1 MVP

## 実装内容

Gemini API を使ったツイート自動生成フローの実装（V1コア機能）。

## 作成・変更ファイル

| ファイル | 内容 |
|--------|------|
| `src/types/tweet.ts` | Tweet / GenerateRequest / GenerateResponse 型定義 |
| `src/lib/gemini.ts` | Gemini API クライアント（gemini-2.0-flash） |
| `src/app/api/generate/route.ts` | POST Route Handler（サーバーサイドで API 呼び出し） |
| `src/components/TweetCard.tsx` | ツイートカード（コピーボタン付き） |
| `src/app/page.tsx` | メインUI（フォーム + ツイート一覧） |

## 依存パッケージ

- `@google/generative-ai`（npm install で追加）

## APIキーの扱い

V1 ではユーザーがフォームに入力 → リクエストボディで Route Handler に渡す → サーバーで Gemini を呼ぶ。
`.env.local` には保存しない（V2 以降でサーバー管理に移行予定）。

## 生成ツイートのストーリーアーク

①紹介 → ②使い方 → ③ユースケース → ④技術優位性 → ⑤共感 → ⑥比較 → ⑦CTA

## Gemini API キーの取得方法

1. [Google AI Studio](https://aistudio.google.com) にアクセス（Google アカウントでログイン）
2. 左サイドバーの「Get API key」をクリック
3. 「Create API key」→ 既存の Google Cloud プロジェクトを選択 or 新規作成
4. 生成された `AIzaSy...` 形式のキーをコピー

無料枠あり（2025年4月時点：gemini-1.5-flash は1分あたり15リクエスト／1日1500リクエスト）。

---

## 動作確認

- `npm run dev` で起動
- 実 Gemini API キーで7件生成 → コピー確認
- 無効キーで赤エラーバナー確認
- `npm run build` で TypeScript エラー 0

## 次のステップ（STEP 5）

- Vercel へデプロイ（本番公開）

---

## V1 品質改善（STEP 5 デプロイ後）

コミット: `7b87ef6`

### 変更内容

#### 1. X の文字数制限への対応（twitter-text 導入）

X の文字数カウントは **weighted length 方式**（上限 280 ウェイト）：
- 半角英数 = 1 ウェイト、日本語・絵文字など全角 = 2 ウェイト
- URL は実長に関わらず 23 ウェイト固定（t.co 短縮）

V1 では単純な `string.length` で「280文字以内」と指示していたため、日本語ツイートが最大 560 ウェイト（X 上限の 2 倍）になりコピペすると制限オーバーになっていた。

**対応：**
- `twitter-text` npm パッケージを導入し `parseTweet().weightedLength` で正確に計算
- プロンプトを weighted length 仕様（日本語=2/半角=1/URL=23、合計 280 以内、260 目安）に改修
- 280 超過ツイートは最大 4 回まで個別再生成リトライ
- 2 回後も超過する場合は `isOverLimit: true` フラグを立てて返却（全廃せず残り 4 件は使える）
- `TweetCard` のカウンターを `weightedLength`/280 表示に変更、超過時はカード枠・カウンターを赤で警告

#### 2. 末尾 URL／ハッシュタグの改行整形

Gemini が本文・URL・ハッシュタグを 1 行に詰めて出力するケースがあった。

**対応：** `reformatTweet()` 関数をサーバー側に追加。末尾の URL とハッシュタグ群を正規表現で切り出し `本文\n\nURL\n\nハッシュタグ群` に機械整形。本文中（途中）の URL／ハッシュタグは触らない。冪等（すでに整形済みでも結果が変わらない）。

#### 3. Gemini API エラーメッセージの正規化

SDK の生エラー文字列（URL・ステータス・英文）が UI に露出していた。

**対応：** `mapGeminiError()` 関数で以下をマッピング、UI には短い日本語のみ表示：

| エラー種別 | UI 表示 |
|-----------|--------|
| 503 / 高需要 | Gemini API が混雑しています。少し時間をおいて再試行してください。 |
| 429 / レート超過 | Gemini API の利用上限に達しました。少し時間をおいて再試行してください。 |
| 401 / 403 / APIキー不正 | APIキーが無効です。Gemini APIキーを確認してください。 |
| ネットワーク障害 | Gemini API への接続に失敗しました。ネットワークを確認してください。 |
| その他 | ツイート生成に失敗しました。少し時間をおいて再試行してください。 |

サーバーコンソールには `console.error` で生エラーを記録し、デバッグ性は維持。

### 変更ファイル

| ファイル | 変更内容 |
|--------|--------|
| `package.json` | `twitter-text` 追加 |
| `src/types/twitter-text.d.ts` (新規) | 自前型宣言（DefinitelyTyped が ESM と不整合のため） |
| `src/types/tweet.ts` | `Tweet` に `weightedLength`・`isOverLimit` を追加 |
| `src/lib/gemini.ts` | `countWeighted`・`reformatTweet`・`regenerateOne` 追加、検証＋リトライループ、プロンプト改修 |
| `src/components/TweetCard.tsx` | `weightedLength` 表示・超過時赤字 |
| `src/app/api/generate/route.ts` | `mapGeminiError` でエラー正規化 |

---

## V1 ポスト生成 UI 改善（2026-04-26）

### 変更内容

1. **ボタンテキスト変更**：「ツイートを生成する」→「ポストを生成する」
2. **入力欄追加**：URL（任意）・ハッシュタグ（任意）を追加プロンプトの下に配置
3. **ラベル変更**：「口調メモ」→「追加プロンプト」
4. **URL・ハッシュタグをプロンプトに反映**：入力値を Gemini へのプロンプトに強制指示付きで渡す
5. **URLリード文の自動生成**：URLの直前行にそのツイートの文脈に合ったリード文をAIが生成（2段表示）
6. **URLタイプ判定**：`detectUrlType()` で App Store / Google Play / GitHub / GitHub Pages / Web を判定し、リード文の方向性をプロンプトに渡す
7. **リード文バリエーション**：5件で同じリード文を繰り返さないよう指示
8. **本文改行**：本文に1〜2箇所の改行を入れて読みやすくするよう指示
9. **ハッシュタグ3件以上**：指定タグを含め合計3つ以上生成するよう指示
10. **URL未入力時の誤挿入防止**：URL未入力時にAIがアプリストアURLを自発挿入しないよう禁止指示を追加

### 変更ファイル

| ファイル | 変更内容 |
|--------|--------|
| `src/types/tweet.ts` | `GenerateRequest` に `url?`, `hashtags?` を追加 |
| `src/app/page.tsx` | URL・ハッシュタグ入力欄追加、ラベル変更、ボタンテキスト変更 |
| `src/app/api/generate/route.ts` | 新フィールドを `generateTweets` に渡す |
| `src/lib/gemini.ts` | `detectUrlType` 追加、`reformatTweet`・`buildPrompt`・`buildShortenPrompt` 更新 |

---

## V1 UI 細部改善（2026-04-26）

### 変更内容

1. **ハッシュタグ上限設定**：生成数を「3つ以上」から「3〜5つ」に変更
2. **URL入力欄ヒントテキスト追加**：対応サービス（App Store / Google Play / GitHub / Web）とリード文自動生成の説明を表示
3. **ハッシュタグ入力欄ヒントテキスト追加**：「最大5つ付きます」の説明を表示
4. **detectUrlType にコメント追加**：対応URL種別一覧をコード上に明記
5. **生成中オーバーレイ追加**：ポストを生成ボタン押下後、画面中央にグラデーションスピナー付きのポップアップを表示（backdrop-blur・既存デザインに統一）

### 変更ファイル

| ファイル | 変更内容 |
|--------|--------|
| `src/app/page.tsx` | 生成中オーバーレイ追加、URL・ハッシュタグのヒントテキスト追加 |
| `src/lib/gemini.ts` | ハッシュタグ上限を3〜5つに変更、detectUrlType にコメント追加 |
