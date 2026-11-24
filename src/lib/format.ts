const yenFormatter = new Intl.NumberFormat("ja-JP");

/** 12,300 のような3桁区切り */
export function formatNumber(value: number): string {
  return yenFormatter.format(value);
}

/** 12,300円 */
export function formatYen(value: number): string {
  return `${yenFormatter.format(value)}円`;
}
