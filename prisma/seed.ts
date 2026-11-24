/**
 * デモ用データ（シード）。
 * - ユーザーが1人もいないときだけデータを入れる（すでにデータがあれば何もしない）
 * - 金額は必ず src/config/pricing.ts の料金表と計算ルールで計算する
 * - 乱数は固定のシード値を使うので、同じ日に何度実行しても同じ結果になる
 */
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Area, QuoteStatus } from "../src/generated/prisma/enums";
import { AC_TYPES, OPTIONS, calculateQuote, type Counts } from "../src/config/pricing";
import { QUOTE_VALID_DAYS } from "../src/config/company";
import { addDays, addMonths, endOfNextMonth, startOfMonth, todayJst } from "../src/lib/dates";

const RANDOM_SEED = 20260401;
const DEMO_PASSWORD = "demo1234";

// ---- 固定シードの乱数（mulberry32） ----
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(RANDOM_SEED);
const randInt = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
function weighted<T>(choices: readonly (readonly [T, number])[]): T {
  const total = choices.reduce((sum, [, weight]) => sum + weight, 0);
  let r = random() * total;
  for (const [value, weight] of choices) {
    r -= weight;
    if (r < 0) return value;
  }
  return choices[choices.length - 1][0];
}
/** 固定シードの乱数から作る ID（UUID v4 形式） */
function uuid(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = "89ab"[Math.floor(random() * 4)];
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

// ---- ユーザー ----
const ADMIN = { name: "管理者", email: "admin@example.com" };
/** 社員。weight＝見積件数の割合、winRate＝受注率（グラフで違いが見えるよう差をつける） */
const EMPLOYEES = [
  { name: "佐藤", email: "sato@example.com", weight: 35, winRate: 0.76 },
  { name: "鈴木", email: "suzuki@example.com", weight: 28, winRate: 0.63 },
  { name: "高橋", email: "takahashi@example.com", weight: 22, winRate: 0.52 },
  { name: "田中", email: "tanaka@example.com", weight: 15, winRate: 0.4 },
] as const;

// ---- お客様30件（すべて架空。市内＝あおば市、市外＝わかくさ市・さくら川町） ----
const INDIVIDUAL_NAMES = [
  "山田 太郎",
  "小林 花子",
  "中村 健一",
  "加藤 美咲",
  "吉田 大輔",
  "山本 由美",
  "渡辺 誠",
  "伊藤 さくら",
  "松本 浩二",
  "井上 恵子",
  "木村 修",
  "林 直子",
  "清水 一郎",
  "山口 真由美",
  "森 健太",
  "池田 陽子",
  "橋本 茂",
  "石川 千尋",
];
const COMPANY_NAMES = [
  "株式会社ほしみ台不動産管理",
  "医療法人こもれび坂歯科",
  "株式会社ゆめさき学習塾",
  "合同会社そらいろ保育サービス",
  "カフェひだまり坂",
  "株式会社あおば中央会計事務所",
  "有限会社つきかげ美容室",
  "株式会社かぜのね介護センター",
  "ビジネスホテルあおば星見",
  "株式会社にじいろ食堂",
  "合同会社もりのこ動物病院",
  "株式会社さくら川オフィスサポート",
];
const IN_CITY_TOWNS = ["中央", "東町", "みどり台", "星見台", "ひだまり坂", "駅前通", "若葉", "川原町"];
const OUT_OF_CITY_TOWNS = ["わかくさ市本町", "わかくさ市南台", "わかくさ市緑ヶ丘", "さくら川町上野", "さくら川町新田"];

function buildCustomers() {
  const customers: { id: string; name: string; phone: string; address: string; area: Area; isCompany: boolean }[] = [];
  const add = (name: string, isCompany: boolean, index: number) => {
    // 3件に1件くらいを市外にする
    const area: Area = random() < 0.35 ? "OUT_OF_CITY" : "IN_CITY";
    const town =
      area === "IN_CITY" ? `あおば市${IN_CITY_TOWNS[randInt(0, IN_CITY_TOWNS.length - 1)]}` : OUT_OF_CITY_TOWNS[randInt(0, OUT_OF_CITY_TOWNS.length - 1)];
    const address = `${town}${randInt(1, 5)}丁目${randInt(1, 20)}番${randInt(1, 15)}号`;
    const phone = isCompany ? `050-0000-01${String(index).padStart(2, "0")}` : `090-0000-00${String(index).padStart(2, "0")}`;
    customers.push({ id: uuid(), name, phone, address, area, isCompany });
  };
  INDIVIDUAL_NAMES.forEach((name, i) => add(name, false, i + 1));
  COMPANY_NAMES.forEach((name, i) => add(name, true, i + 1));
  return customers;
}

/** エアコン1〜5台と、ばらつきのあるオプションを選ぶ */
function buildCounts(isCompany: boolean): Counts {
  const units = weighted(
    isCompany
      ? ([
          [1, 10],
          [2, 25],
          [3, 25],
          [4, 20],
          [5, 20],
        ] as const)
      : ([
          [1, 45],
          [2, 32],
          [3, 15],
          [4, 5],
          [5, 3],
        ] as const),
  );
  const typeWeights = isCompany
    ? ([
        [AC_TYPES[0].code, 25],
        [AC_TYPES[1].code, 20],
        [AC_TYPES[2].code, 55],
      ] as const)
    : ([
        [AC_TYPES[0].code, 55],
        [AC_TYPES[1].code, 38],
        [AC_TYPES[2].code, 7],
      ] as const);
  const counts: Counts = {};
  for (let i = 0; i < units; i++) {
    const code = weighted(typeWeights);
    counts[code] = (counts[code] ?? 0) + 1;
  }
  if (random() < 0.4) counts[OPTIONS[0].code] = randInt(1, units); // 室外機洗浄
  if (random() < 0.5) counts[OPTIONS[1].code] = randInt(1, units); // 防カビコート
  return counts;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL が設定されていません（シードは直結の DATABASE_URL を使います）。");
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    if ((await prisma.user.count()) > 0) {
      console.log("シード：すでにデータがあるため、何もしませんでした。");
      return;
    }

    const today = todayJst();
    const thisMonth = startOfMonth(today);

    // ---- ユーザー ----
    const admin = { id: uuid(), ...ADMIN, role: "ADMIN" as const, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) };
    const employees: { id: string; name: string; email: string; weight: number; winRate: number; passwordHash: string }[] = [];
    for (const employee of EMPLOYEES) {
      employees.push({ ...employee, id: uuid(), passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) });
    }

    const customers = buildCustomers();

    // ---- 今日から過去12か月分（今月を含む12か月）の見積と請求 ----
    type SeedQuote = {
      id: string;
      customerId: string;
      assigneeId: string;
      area: Area;
      issueDate: Date;
      status: QuoteStatus;
      calc: ReturnType<typeof calculateQuote>;
      invoice: { id: string; issueDate: Date; dueDate: Date; paidDate: Date | null } | null;
    };
    const quotes: SeedQuote[] = [];

    for (let m = 0; m < 12; m++) {
      const monthStart = addMonths(thisMonth, m - 11);
      const month = monthStart.getUTCMonth() + 1;
      const daysInMonth = addDays(addMonths(monthStart, 1), -1).getUTCDate();
      const isCurrent = m === 11;
      const lastDay = isCurrent ? today.getUTCDate() : daysInMonth;

      // 月に20〜40件。夏（6〜8月）と年末（12月）は多め。今月は今日までの日数ぶんだけ
      const busy = month === 6 || month === 7 || month === 8 || month === 12;
      const fullCount = busy ? randInt(34, 40) : randInt(20, 28);
      const count = Math.max(1, Math.round((fullCount * lastDay) / daysInMonth));

      for (let i = 0; i < count; i++) {
        const issueDate = addDays(monthStart, randInt(0, lastDay - 1));
        const customer = customers[randInt(0, customers.length - 1)];
        const employee = weighted(employees.map((e) => [e, e.weight] as const));
        const calc = calculateQuote({ area: customer.area, counts: buildCounts(customer.isCompany) });
        const ageDays = Math.round((today.getTime() - issueDate.getTime()) / 86400000);

        let status: QuoteStatus;
        let invoice: SeedQuote["invoice"] = null;

        if (ageDays <= 2) {
          // 出したばかりの見積は、まだ下書きか提出済み
          status = random() < 0.4 ? "DRAFT" : "SUBMITTED";
        } else if (random() < employee.winRate) {
          // 受注 → 数日〜2週間後に請求書に変換
          const invoiceDate = addDays(issueDate, randInt(3, 14));
          if (invoiceDate > today) {
            status = "ORDERED";
          } else {
            status = "INVOICED";
            const dueDate = endOfNextMonth(invoiceDate);
            const monthsAgo = (thisMonth.getUTCFullYear() - invoiceDate.getUTCFullYear()) * 12 + (thisMonth.getUTCMonth() - invoiceDate.getUTCMonth());
            // 古い請求はほぼ入金済み。直近の請求は一部が未入金で、数件は支払期限を過ぎている
            const paidRate = monthsAgo >= 3 ? 0.985 : monthsAgo === 2 ? 0.85 : monthsAgo === 1 ? 0.5 : 0.15;
            let paidDate: Date | null = null;
            if (random() < paidRate) {
              const latest = dueDate < today ? dueDate : today;
              const candidate = addDays(invoiceDate, randInt(5, 45));
              paidDate = candidate > latest ? latest : candidate;
            }
            invoice = { id: uuid(), issueDate: invoiceDate, dueDate, paidDate };
          }
        } else if (ageDays > 30) {
          status = random() < 0.9 ? "LOST" : "SUBMITTED";
        } else {
          status = weighted([
            ["SUBMITTED", 55],
            ["LOST", 40],
            ["DRAFT", 5],
          ] as const);
        }

        quotes.push({ id: uuid(), customerId: customer.id, assigneeId: employee.id, area: customer.area, issueDate, status, calc, invoice });
      }
    }

    // ---- 番号を付ける（発行日の順に、年ごとの連番） ----
    const sequences = new Map<string, number>();
    const nextNumber = (prefix: "Q" | "INV", date: Date) => {
      const key = `${prefix}-${date.getUTCFullYear()}`;
      const value = (sequences.get(key) ?? 0) + 1;
      sequences.set(key, value);
      return `${key}-${String(value).padStart(4, "0")}`;
    };

    quotes.sort((a, b) => a.issueDate.getTime() - b.issueDate.getTime());
    const quoteRows = quotes.map((q) => ({
      id: q.id,
      quoteNumber: nextNumber("Q", q.issueDate),
      customerId: q.customerId,
      assigneeId: q.assigneeId,
      area: q.area,
      issueDate: q.issueDate,
      validUntil: addDays(q.issueDate, QUOTE_VALID_DAYS),
      status: q.status,
      subtotal: q.calc.subtotal,
      tax: q.calc.tax,
      total: q.calc.total,
      note: "",
    }));
    const quoteItemRows = quotes.flatMap((q) => q.calc.items.map((item) => ({ ...item, quoteId: q.id })));

    const invoiced = quotes
      .filter((q): q is SeedQuote & { invoice: NonNullable<SeedQuote["invoice"]> } => q.invoice !== null)
      .sort((a, b) => a.invoice.issueDate.getTime() - b.invoice.issueDate.getTime());
    const invoiceRows = invoiced.map((q) => ({
      id: q.invoice.id,
      invoiceNumber: nextNumber("INV", q.invoice.issueDate),
      quoteId: q.id,
      customerId: q.customerId,
      assigneeId: q.assigneeId,
      issueDate: q.invoice.issueDate,
      dueDate: q.invoice.dueDate,
      subtotal: q.calc.subtotal,
      tax: q.calc.tax,
      total: q.calc.total,
      paidDate: q.invoice.paidDate,
    }));
    const invoiceItemRows = invoiced.flatMap((q) => q.calc.items.map((item) => ({ ...item, invoiceId: q.invoice.id })));

    // ---- まとめて登録（途中で失敗したら全部取り消す） ----
    const inserted = await prisma.$transaction(
      async (tx) => {
        // 同時に2つのビルドが走っても二重に入らないよう、順番待ちにしてから確認する
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(727100)`;
        if ((await tx.user.count()) > 0) return false;

        await tx.user.createMany({
          data: [
            { id: admin.id, name: admin.name, email: admin.email, role: admin.role, passwordHash: admin.passwordHash },
            ...employees.map((e) => ({ id: e.id, name: e.name, email: e.email, role: "EMPLOYEE" as const, passwordHash: e.passwordHash })),
          ],
        });
        await tx.customer.createMany({ data: customers.map(({ id, name, phone, address, area }) => ({ id, name, phone, address, area })) });
        await tx.quote.createMany({ data: quoteRows });
        await tx.quoteItem.createMany({ data: quoteItemRows });
        await tx.invoice.createMany({ data: invoiceRows });
        await tx.invoiceItem.createMany({ data: invoiceItemRows });
        await tx.numberSequence.createMany({ data: [...sequences].map(([key, value]) => ({ key, value })) });
        return true;
      },
      { maxWait: 30_000, timeout: 120_000 },
    );

    if (!inserted) {
      console.log("シード：すでにデータがあるため、何もしませんでした。");
      return;
    }
    const unpaid = invoiceRows.filter((i) => !i.paidDate);
    console.log(
      `シード完了：ユーザー${employees.length + 1}名、お客様${customers.length}件、見積${quoteRows.length}件、請求${invoiceRows.length}件` +
        `（未入金${unpaid.length}件、うち期限超過${unpaid.filter((i) => i.dueDate < today).length}件）`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
