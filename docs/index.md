# Code Tweet ドキュメント

現行運用で参照する文書だけを残した索引。古い実装メモは [history.md](./history.md) に要点だけ集約しています。

| ファイル | 内容 |
|---|---|
| [product.md](./product.md) | 現在仕様（Code Tweet / note Draft / App SS）、料金、制限、KPI、リスク |
| [setup.md](./setup.md) | ローカル起動、環境変数、外部サービス、DB SQL 適用 |
| [operations.md](./operations.md) | 本番ヘルスチェック、優先タスク、運用ロードマップ、定期確認 |
| [history.md](./history.md) | V1 から現行版までの短い実装履歴 |
| [database.sql](./database.sql) | Supabase SQL。管理画面ロックと生成履歴テーブル |

## 現在の状態

Code Tweet は本番稼働中。GitHub OAuth、README 取得、Gemini 生成、Code Tweet / note Draft / App SS のタブ式生成、利用制限、Stripe 課金（クレジットパック）、管理画面、生成履歴まで実装済みです。

今後は大きな新機能より、課金者数の増加、計測、軽微な導線改善を優先します。
