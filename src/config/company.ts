/**
 * 発行元（自社）の情報。見積書・請求書の印刷用画面に表示する。
 * ※ すべてデモ用のダミー値。実際に使うときはここを書き換える。
 */
export const COMPANY = {
  name: "株式会社クリーンエア空調サービス",
  postalCode: "〒000-0000",
  address: "あおば市中央1丁目2番3号 サンプルビル2階",
  tel: "000-000-0000",
  email: "info@example.com",
  /** 適格請求書発行事業者の登録番号（インボイス登録番号）※ダミー */
  invoiceRegistrationNumber: "T1234567890123",
  /** お振込先 ※ダミー */
  bankAccount: "サンプル銀行 あおば支店 普通 1234567 カ）クリーンエアクウチョウサービス",
} as const;

/** 見積書の有効期限：発行日から何日後か */
export const QUOTE_VALID_DAYS = 30;

/** 画面に表示するシステム名 */
export const APP_NAME = "見積・請求かんたん管理";
