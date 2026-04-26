# Code Tweet

READMEやプロジェクト説明をAIが分析し、X（旧 Twitter）向けマーケティングポストを5件自動生成する個人開発者向けWebアプリ。

本番 URL: https://code-tweet.vercel.app/

## 機能

- プロジェクト説明（テキスト貼り付け or GitHub URL 指定）からポストを5件自動生成
- GitHub URL を入力すると README を自動取得（プライベートリポジトリ対応）
- 口調・トーン指示に対応（任意）
- URL・ハッシュタグの追加指定（任意）。URL 種別（App Store / Google Play / GitHub / Web）に応じてリード文を自動付与
- 各ポストに推奨投稿日時と理由を AI が提案
- X の weighted length（280 ウェイト）を自動チェック・自動短縮
- ワンクリックでコピー
- ストーリーアーク構成（紹介→使い方→ユースケース→共感→CTA）

## 技術スタック

| 役割 | 採用 |
|------|------|
| フレームワーク | Next.js 16（App Router） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| AI | Gemini API（gemini-2.5-flash） |
| 文字数計算 | twitter-text |
| ホスティング | Vercel |

## セットアップ

プロジェクトルートに `.env.local` を作成し、以下を記載：

```
GEMINI_API_KEY=your_gemini_api_key
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxx  # 任意（プライベートリポジトリを使う場合のみ）
```

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開く。

### 環境変数

| 変数名 | 用途 | 必須 |
|--------|------|------|
| `GEMINI_API_KEY` | Gemini API キー（[Google AI Studio](https://aistudio.google.com) で取得） | 必須 |
| `GITHUB_TOKEN` | プライベートリポジトリへのアクセス・レート制限拡張（60→5,000 req/h） | 任意 |

## 使い方

1. GitHub URL を入力して「README を取得」を押す（または直接プロジェクト説明を貼り付け）
2. 口調メモ・URL・ハッシュタグを入力（すべて任意）
3. 「ポストを生成する」を押す
4. 生成された5件のポストを推奨日時に合わせて投稿

## ロードマップ

V2（進行中）：
- ✅ サーバー管理 API キー（ユーザーの API キー入力を撤廃）
- ✅ GitHub URL 連携（プライベートリポジトリ対応）
- ⬜ ユーザー認証（Google / GitHub ログイン）
- ⬜ ポスト保存・履歴
- ⬜ 検索・フィルタ

V2 以降：
| バージョン | 機能 |
|-----------|------|
| V4 | スケジュール管理（投稿日時設定・一覧表示） |
| V5 | Claude API も選択可能に |
| V7 | Google AdSense 広告 |
| V8 | フリーミアム導入（Stripe） |
| V9 | Instagram・Threads など他 SNS 対応 |

詳細は [`devflow/step8-v2-overview.md`](./devflow/step8-v2-overview.md) を参照。
