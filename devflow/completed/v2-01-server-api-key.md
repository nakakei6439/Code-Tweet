# Feature 1: サーバー管理 API キー ✅ 完了

← [概要に戻る](./v2-00-overview.md)

---

## 目的

ユーザーが Gemini API キーを取得・管理しなくても使えるようにする。
API キーをサーバー側の環境変数で管理し、フォームへの入力を不要にする。

---

## 完了タスク

- [x] `.env.local` に `GEMINI_API_KEY` を設定（ローカル開発用）
- [x] `src/lib/gemini.ts` の `generateTweets()` から `apiKey` 引数を削除し、内部で `process.env.GEMINI_API_KEY` を使うよう変更
- [x] `src/app/api/generate/route.ts` のリクエストから `apiKey` の取得・検証を削除
- [x] `src/types/tweet.ts` の `GenerateRequest` 型から `apiKey` フィールドを削除
- [x] `src/app/page.tsx` のフォームから「Gemini API キー」入力欄を削除
- [x] Vercel 環境変数に `GEMINI_API_KEY` を追加（Production + Preview）
- [x] 本番 URL（https://code-tweet.vercel.app/）でポスト生成できることを確認

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/types/tweet.ts` | `GenerateRequest` から `apiKey` フィールドを削除 |
| `src/lib/gemini.ts` | `apiKey` 引数を削除、`process.env.GEMINI_API_KEY` を内部使用 |
| `src/app/api/generate/route.ts` | `apiKey` 取得・検証ロジックを削除、未設定時に 503 を返す |
| `src/app/page.tsx` | `apiKey` state・入力欄・送信フィールドを削除 |
