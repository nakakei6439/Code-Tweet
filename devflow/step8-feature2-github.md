# Feature 2: GitHub URL 連携

← [概要に戻る](./step8-v2-overview.md)

**前提**: Feature 1 完了済み ✅ / Feature 3 との依存なし（並行実装可能）

---

## 目的

GitHub リポジトリの URL を貼り付けるだけで README を自動取得し、テキスト入力欄に挿入する。
「README をコピペする」という V1 最大の手間をゼロにする。

---

## タスク

- [ ] `src/app/page.tsx` に「GitHub URL」入力フィールドを追加
- [ ] 「README を取得する」ボタンの UI を実装（URL 貼り付け後にクリック）
- [ ] `src/app/api/github/route.ts` を新規作成
  - GitHub REST API v3 の `/repos/{owner}/{repo}/readme` エンドポイントを呼ぶ
  - レスポンスの `content`（Base64）をデコードして Markdown テキストを返す
- [ ] 取得した README テキストをプロジェクト説明テキストエリアに自動挿入
- [ ] エラーハンドリング
  - 存在しないリポジトリ → 「リポジトリが見つかりません」
  - Private リポジトリ → 「非公開リポジトリには対応していません」
  - README ファイルなし → 「README が見つかりません」
  - URL フォーマット不正 → 「GitHub のリポジトリ URL を入力してください（例：https://github.com/user/repo）」
- [ ] （オプション）レート制限対応：未認証は 60 req/h。超える場合は `GITHUB_TOKEN` を Vercel 環境変数に追加して 5,000 req/h へ拡張

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

## 環境変数（オプション）

| 変数名 | 用途 | 必須 |
|--------|------|------|
| `GITHUB_TOKEN` | レート制限を 60 req/h → 5,000 req/h に拡張 | 任意 |
