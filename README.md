# 見積・請求かんたん管理

エアコンクリーニング会社（架空）の社内向け「見積・請求・売掛金管理システム」です。
電話を受けた事務員が、エアコンの種類と台数・オプション・訪問先を選ぶだけで、料金表どおりの見積をその場で出せます。

## 技術構成

- Next.js（App Router）＋ TypeScript ／ Tailwind CSS ／ Recharts
- Prisma ORM 7 ＋ Prisma Postgres（東京リージョン）
- Auth.js（メールアドレス＋パスワード。パスワードは bcrypt でハッシュ化）
- Vercel（main への push で自動デプロイ。関数の実行場所は東京 `hnd1`）

## 環境変数（Vercel 側に設定）

| 名前 | 用途 |
| --- | --- |
| `DATABASE_URL_POOLED` | アプリからの接続（プール経由） |
| `DATABASE_URL` | マイグレーションとシード（直結） |
| `AUTH_SECRET` | ログイン用の秘密鍵 |

## ビルドの流れ

Vercel では `npm run vercel-build` が実行されます。

1. `prisma migrate deploy` … `prisma/migrations` のマイグレーションを適用
2. `prisma db seed` … デモ用データを投入（ユーザーが1人もいないときだけ）
3. `next build`

`npm run build`（`next build` のみ）は、データベースにつながなくても成功します。

## デモ用アカウント（パスワードはすべて `demo1234`）

| 権限 | メールアドレス |
| --- | --- |
| 管理者 | admin@example.com |
| 社員（佐藤） | sato@example.com |
| 社員（鈴木） | suzuki@example.com |
| 社員（高橋） | takahashi@example.com |
| 社員（田中） | tanaka@example.com |

## 料金や会社情報を変えるとき

- 料金表と計算ルール：`src/config/pricing.ts`（見積作成画面・保存処理・シードのすべてがここを使います）
- 発行元の会社名・インボイス登録番号・振込先：`src/config/company.ts`（現在はダミー値）

## 主なフォルダ

- `src/app/(app)` … ログイン後の各画面（ホーム・見積・請求・売掛金・お客様）
- `src/app/(print)` … 見積書・請求書の印刷用画面（A4）
- `src/lib/actions` … 保存などのサーバー側の処理（権限チェックを含む）
- `src/lib/data` … データの取得（一覧・集計）
- `prisma` … データ構造・マイグレーション・シード
