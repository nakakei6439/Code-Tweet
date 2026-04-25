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
