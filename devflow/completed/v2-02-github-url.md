# Feature 2: GitHub URL 連携

← [概要に戻る](./v2-00-overview.md)

**前提**: Feature 1 完了済み ✅ / Feature 3 との依存なし（並行実装可能）

> **更新 (V2.1)**: `GITHUB_TOKEN` は削除済み。サーバー側で開発者個人のトークンを使うとログインユーザーが API 経由でプライベートリポジトリにアクセスできるリスクがあるため。**現在は公開リポジトリのみ対応**。以下の `GITHUB_TOKEN` 関連の記述は履歴として残しているが現行コードでは未使用。

---

## 目的

GitHub リポジトリの URL を貼り付けるだけで README を自動取得し、テキスト入力欄に挿入する。
「README をコピペする」という V1 最大の手間をゼロにする。

---

## タスク

- [x] `src/app/page.tsx` に「GitHub URL」入力フィールドを追加
- [x] 「README を取得する」ボタンの UI を実装（URL 貼り付け後にクリック）
- [x] `src/app/api/github/route.ts` を新規作成
  - GitHub REST API v3 の `/repos/{owner}/{repo}/readme` エンドポイントを呼ぶ
  - レスポンスの `content`（Base64）をデコードして Markdown テキストを返す
- [x] 取得した README テキストをプロジェクト説明テキストエリアに自動挿入
- [x] エラーハンドリング
  - 存在しないリポジトリ → 「リポジトリが見つかりません」
  - Private リポジトリ → 「非公開リポジトリには対応していません」（トークン未設定時）
  - README ファイルなし → 「README が見つかりません」
  - URL フォーマット不正 → 「GitHub のリポジトリ URL を入力してください」
- [x] プライベートリポジトリ対応：`GITHUB_TOKEN` を環境変数に設定することで自動的に認証ヘッダーを付与

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/app/api/github/route.ts` | **新規作成**：GitHub README 取得 Route Handler |
| `src/app/page.tsx` | GitHub URL 入力欄・取得ボタン・自動挿入ロジックを追加 |

---

## API 仕様メモ

```
GET https://api.github.com/repos/{owner}/{repo}/readme
```

レスポンス例：
```json
{
  "content": "base64エンコードされたREADME内容...",
  "encoding": "base64"
}
```

URL `https://github.com/nakakei6439/Code-Tweet` から `owner=nakakei6439`、`repo=Code-Tweet` を抽出してエンドポイントを組み立てる。

---

## 環境変数

| 変数名 | 用途 | 必須 |
|--------|------|------|
| `GITHUB_TOKEN` | プライベートリポジトリへのアクセス・レート制限を 60 → 5,000 req/h に拡張 | 任意（プライベートリポジトリを使う場合は必須） |

---

## GITHUB_TOKEN の取得方法

### 1. GitHub にアクセス

https://github.com/settings/tokens を開く（GitHub にログイン済みであること）。

### 2. トークンを新規作成

「Generate new token (classic)」をクリック。

| 項目 | 設定値 |
|------|--------|
| Note | `code-tweet`（識別用の名前。なんでもよい） |
| Expiration | 任意。無期限にするなら「No expiration」 |
| Select scopes | **`repo`** の先頭チェックボックスをオン（配下の `repo:status` 等が全選択される） |

「Generate token」をクリック。

### 3. トークンをコピー

`ghp_` で始まる文字列が表示される。**この画面を閉じると二度と見られない**ので必ずコピーする。

### 4. ローカル環境に設定

`.env.local` に追記：
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxx
```

dev サーバーを再起動すると反映される。

### 5. Vercel 本番環境に設定

```bash
vercel env add GITHUB_TOKEN
```

または Vercel ダッシュボード → プロジェクト → Settings → Environment Variables から追加。

**設定対象**: Production / Preview / Development すべてにチェック。
