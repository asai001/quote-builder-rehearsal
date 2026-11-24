/**
 * 日付の共通処理。
 * 発行日・支払期限などは「日付だけ」を扱うので、UTC の 0時ちょうどの Date として持つ
 * （データベースの DATE 型と同じ扱い）。「今日」は日本時間で判定する。
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 日本時間での今日（UTC 0時の Date） */
export function todayJst(now: Date = new Date()): Date {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()));
}

/** "2026-11-24" 形式（入力欄・SQL 用） */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-11-24" を Date に。正しくない日付は null */
export function parseDateString(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateString(date) !== value) return null;
  return date;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** その月の1日 */
export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** 月を足す（1日基準） */
export function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

/** 翌月末（請求書の支払期限） */
export function endOfNextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 0));
}

/** 2026/11/24 */
export function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** 2026年11月24日 */
export function formatDateJa(date: Date): string {
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}
