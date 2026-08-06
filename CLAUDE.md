# Code Tweet

Next.js に関する注意と Chrome デバッグ手順は [AGENTS.md](./AGENTS.md) を参照。

## Vercel デプロイ前の必須手順

グローバルルールのとおり、**Vercel デプロイ前に README 更新 → commit → GitHub push が必須**。
Code Tweet 自身が GitHub 上の README を入力に使うため、このリポジトリでは特に厳守する。

### README と併せて見直すドキュメント

- `README.md` … 「現在の状態」「主要仕様」の表を今回の変更に合わせて更新
- `docs/index.md` … ドキュメント索引（ファイル追加時）
- `docs/product.md` … 仕様・機能の変更時
- `docs/operations.md` … 運用手順・監視項目の変更時
- `docs/history.md` … 機能追加時は実装履歴を追記

### デプロイ前チェック

```bash
npm run lint
npm run test
npm run build
```

3 つとも通ることを確認してから push・デプロイする。
