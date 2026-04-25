# Code Tweet

READMEやプロジェクト説明をAIが分析し、1週間分のマーケティングツイートを自動生成する個人開発者向けWebアプリ。

## 機能（V1）

- プロジェクトテキストを貼り付けてツイートを生成
- 口調・トーン指示に対応（任意）
- Gemini APIで7件のツイートを自動生成（ストーリーアーク構成）
- 1件ずつコピーボタンで即コピー

## 技術スタック

| 役割 | 採用 |
|------|------|
| フレームワーク | Next.js 16（App Router） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| AI | Gemini API（gemini-2.5-flash） |
| ホスティング | Vercel（予定） |

## セットアップ

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開く。

## 使い方

1. プロジェクトの README や機能説明を貼り付ける
2. 口調メモを入力（任意）
3. [Google AI Studio](https://aistudio.google.com) で取得した Gemini API キーを入力
4. 「ツイートを生成する」を押す
5. 生成された7件のツイートをコピーして投稿

## ロードマップ

| バージョン | 機能 |
|-----------|------|
| V1 | テキスト入力 + Gemini API でツイート生成（現在） |
| V2 | GitHub URL からコードを自動取得 |
| V3 | 生成ツイートの保存 |
| V4 | スケジュール管理 |
| V5 | Claude API 対応 |
| V6 | Google 認証 |
