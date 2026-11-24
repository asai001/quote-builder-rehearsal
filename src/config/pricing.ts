/**
 * 料金表と計算ルール（税抜）。
 * 見積作成画面・サーバー側の保存処理・シード（デモ用データ）のすべてが
 * このファイルだけを使って金額を計算する。料金を変えるときはここだけ直せばよい。
 */

export type Area = "IN_CITY" | "OUT_OF_CITY";

export type PriceItem = {
  /** 明細に保存する項目コード（変更しないこと） */
  code: string;
  /** 明細の品名 */
  name: string;
  /** 単価（税抜・円） */
  unitPrice: number;
};

/** エアコン本体のクリーニング（1台あたり） */
export const AC_TYPES = [
  { code: "AC_WALL_STANDARD", name: "壁掛けエアコン（通常）", unitPrice: 10000 },
  { code: "AC_WALL_SELF_CLEANING", name: "壁掛けエアコン（お掃除機能付き）", unitPrice: 18000 },
  { code: "AC_CEILING", name: "天井埋込エアコン", unitPrice: 25000 },
] as const satisfies readonly PriceItem[];

/** オプション（1台あたり） */
export const OPTIONS = [
  { code: "OPT_OUTDOOR_UNIT", name: "室外機洗浄", unitPrice: 4000 },
  { code: "OPT_ANTI_MOLD", name: "防カビコート", unitPrice: 2000 },
] as const satisfies readonly PriceItem[];

/** 出張費（1回の訪問につき） */
export const TRAVEL_FEES = {
  IN_CITY: { code: "TRAVEL_IN_CITY", name: "出張費（市内）", label: "市内", unitPrice: 0 },
  OUT_OF_CITY: { code: "TRAVEL_OUT_OF_CITY", name: "出張費（市外）", label: "市外", unitPrice: 3000 },
} as const satisfies Record<Area, PriceItem & { label: string }>;

/** 割引：エアコン本体の合計が2台以上のとき、2台目以降は1台につき2,000円引き（種類は問わない） */
export const MULTI_UNIT_DISCOUNT = {
  code: "DISCOUNT_MULTI_UNIT",
  name: "割引（2台目以降）",
  /** この台数目から割引の対象 */
  fromUnit: 2,
  /** 1台あたりの割引額（円） */
  amountPerUnit: 2000,
} as const;

/** 消費税率（%） */
export const TAX_RATE_PERCENT = 10;

/** 1つの項目に入力できる台数の上限（入力ミス防止） */
export const MAX_COUNT_PER_ITEM = 30;

export type AcCode = (typeof AC_TYPES)[number]["code"];
export type OptionCode = (typeof OPTIONS)[number]["code"];
export type CountCode = AcCode | OptionCode;

/** 選んだ内容：項目コードごとの台数 */
export type Counts = Partial<Record<CountCode, number>>;

export type QuoteSelection = {
  area: Area;
  counts: Counts;
};

/** 見積明細の1行 */
export type QuoteLine = {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
};

export type QuoteCalculation = {
  /** 自動で作られた明細 */
  items: QuoteLine[];
  /** エアコン本体の合計台数 */
  acCount: number;
  /** 本体の料金 */
  acTotal: number;
  /** オプションの料金 */
  optionTotal: number;
  /** 出張費 */
  travelFee: number;
  /** 割引額（正の数。小計からこの金額を引く） */
  discount: number;
  /** 小計（税抜） */
  subtotal: number;
  /** 消費税（1円未満切り捨て） */
  tax: number;
  /** 合計（税込） */
  total: number;
};

function countOf(counts: Counts, code: CountCode): number {
  const n = counts[code];
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

/** 消費税（1円未満切り捨て） */
export function calculateTax(subtotal: number): number {
  return Math.floor((subtotal * TAX_RATE_PERCENT) / 100);
}

/**
 * 選んだ内容から、見積明細と金額をすべて計算する。
 * 小計 ＝ 本体 ＋ オプション ＋ 出張費 − 割引 ／ 消費税 ＝ 小計 × 10%（切り捨て） ／ 合計 ＝ 小計 ＋ 消費税
 */
export function calculateQuote(selection: QuoteSelection): QuoteCalculation {
  const items: QuoteLine[] = [];
  const push = (line: Omit<QuoteLine, "sortOrder">) => {
    items.push({ ...line, sortOrder: items.length + 1 });
  };

  let acCount = 0;
  let acTotal = 0;
  for (const ac of AC_TYPES) {
    const quantity = countOf(selection.counts, ac.code);
    if (quantity === 0) continue; // 台数が0の項目は明細に出さない
    const amount = ac.unitPrice * quantity;
    acCount += quantity;
    acTotal += amount;
    push({ code: ac.code, name: ac.name, quantity, unitPrice: ac.unitPrice, amount });
  }

  let optionTotal = 0;
  for (const option of OPTIONS) {
    const quantity = countOf(selection.counts, option.code);
    if (quantity === 0) continue;
    const amount = option.unitPrice * quantity;
    optionTotal += amount;
    push({ code: option.code, name: option.name, quantity, unitPrice: option.unitPrice, amount });
  }

  const travel = TRAVEL_FEES[selection.area];
  const travelFee = travel.unitPrice;
  push({ code: travel.code, name: travel.name, quantity: 1, unitPrice: travel.unitPrice, amount: travelFee });

  const discountUnits = Math.max(0, acCount - (MULTI_UNIT_DISCOUNT.fromUnit - 1));
  const discount = discountUnits * MULTI_UNIT_DISCOUNT.amountPerUnit;
  if (discountUnits > 0) {
    push({
      code: MULTI_UNIT_DISCOUNT.code,
      name: MULTI_UNIT_DISCOUNT.name,
      quantity: discountUnits,
      unitPrice: -MULTI_UNIT_DISCOUNT.amountPerUnit,
      amount: -discount,
    });
  }

  const subtotal = acTotal + optionTotal + travelFee - discount;
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;

  return { items, acCount, acTotal, optionTotal, travelFee, discount, subtotal, tax, total };
}

/** 入力内容のチェック。問題があれば日本語のメッセージを返す（問題なければ null） */
export function validateSelection(selection: QuoteSelection): string | null {
  if (selection.area !== "IN_CITY" && selection.area !== "OUT_OF_CITY") {
    return "訪問先（市内・市外）を選んでください。";
  }
  let acCount = 0;
  for (const item of [...AC_TYPES, ...OPTIONS]) {
    const raw = selection.counts[item.code] ?? 0;
    if (!Number.isInteger(raw) || raw < 0 || raw > MAX_COUNT_PER_ITEM) {
      return `「${item.name}」の台数は 0〜${MAX_COUNT_PER_ITEM} の数字で入力してください。`;
    }
  }
  for (const ac of AC_TYPES) acCount += selection.counts[ac.code] ?? 0;
  if (acCount === 0) {
    return "エアコンの台数を1台以上入れてください。";
  }
  for (const option of OPTIONS) {
    if ((selection.counts[option.code] ?? 0) > acCount) {
      return `「${option.name}」の台数は、エアコンの合計台数（${acCount}台）までにしてください。`;
    }
  }
  return null;
}

/** 保存済みの明細から、台数の入力内容を復元する（見積の編集画面で使う） */
export function countsFromItems(items: readonly { code: string; quantity: number }[]): Counts {
  const counts: Counts = {};
  const codes = new Set<string>([...AC_TYPES, ...OPTIONS].map((item) => item.code));
  for (const item of items) {
    if (codes.has(item.code)) counts[item.code as CountCode] = item.quantity;
  }
  return counts;
}

export const AREA_LABELS: Record<Area, string> = {
  IN_CITY: TRAVEL_FEES.IN_CITY.label,
  OUT_OF_CITY: TRAVEL_FEES.OUT_OF_CITY.label,
};
