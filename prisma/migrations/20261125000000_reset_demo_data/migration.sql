-- デモ用データを初期状態に戻す（2026-11-25 に1回だけ実行）。
-- すべてのデータを消したあと、ビルドの次の手順 `prisma db seed` が
-- 「ユーザーが1人もいない」状態を見て、デモ用データを入れ直す。
-- データ構造（テーブルや列）は変えない。
TRUNCATE TABLE
  "InvoiceItem",
  "Invoice",
  "QuoteItem",
  "Quote",
  "Customer",
  "User",
  "NumberSequence";
