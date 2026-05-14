# V9: 生成履歴保存

← [docs 索引に戻る](../index.md)

**完了日**: 2026-05-14

---

## 目的

Pro ユーザーが過去に生成した投稿案を後から見返せるようにする。再利用のための初期版として、検索・お気に入り化は含めず、直近の生成結果を新しい順に表示する。

---

## 実装内容

| ファイル | 内容 |
|---------|------|
| `docs/tweet-generations.sql` | `tweet_generations` テーブル、RLS、ユーザー別作成日時 index |
| `src/lib/generationHistory.ts` | 生成履歴の insert payload 作成、保存、直近50件取得 |
| `src/app/api/generate/route.ts` | Pro ユーザーの生成成功時に履歴を保存 |
| `src/app/history/page.tsx` | Pro ユーザー向け履歴一覧。未ログイン時はログイン案内、無料ユーザーには Pro 案内 |
| `src/components/HeaderActions.tsx` | ログイン後メニューに「履歴」を追加 |
| `src/app/api/account/delete/route.ts` | アカウント削除時に生成履歴も削除 |
| `src/lib/__tests__/generationHistory.test.ts` | README本文・追加プロンプト本文を保存しないことを確認 |

---

## 保存する情報

保存する情報は以下に限定する。

- 生成された投稿本文
- 推奨投稿日時と理由
- weighted length と上限超過フラグ
- 入力された URL
- 入力されたハッシュタグ
- 生成日時

README本文、プロジェクト説明、追加プロンプト本文は保存しない。

---

## 今後の候補

- 検索
- お気に入り化
- 編集済み投稿の保存
