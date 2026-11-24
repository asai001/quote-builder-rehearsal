import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { isAdmin, type CurrentUser } from "@/lib/session";
import { addMonths, startOfMonth, toDateString, todayJst } from "@/lib/dates";

export type MonthlySales = { month: string; label: string; sales: number };
export type EmployeeSales = { id: string; name: string; monthSales: number; yearSales: number };

export type DashboardData = {
  monthLabel: string;
  monthSales: number;
  receivable: number;
  overdueCount: number;
  monthly: MonthlySales[];
  /** 社員別の売上（管理者のみ。社員には null） */
  byEmployee: EmployeeSales[] | null;
};

/**
 * ダッシュボードの数字をまとめて取得する。
 * 売上は「請求書の発行日」基準の税抜金額（小計）。集計はすべてデータベース側で行い、
 * 問い合わせは最大3回（同時に実行）。社員は自分の担当分だけが集計される。
 */
export async function getDashboard(user: CurrentUser): Promise<DashboardData> {
  const today = todayJst();
  const monthStart = startOfMonth(today);
  const nextMonthStart = addMonths(monthStart, 1);
  const yearStart = addMonths(monthStart, -11); // 今月を含む直近12か月

  const todayStr = toDateString(today);
  const monthStartStr = toDateString(monthStart);
  const nextMonthStartStr = toDateString(nextMonthStart);
  const yearStartStr = toDateString(yearStart);

  const admin = isAdmin(user);
  const scope = admin ? Prisma.empty : Prisma.sql`AND "assigneeId" = ${user.id}`;

  const kpiQuery = prisma.$queryRaw<{ monthSales: bigint; receivable: bigint; overdueCount: bigint }[]>`
    SELECT
      COALESCE(SUM("subtotal") FILTER (
        WHERE "issueDate" >= ${monthStartStr}::date AND "issueDate" < ${nextMonthStartStr}::date
      ), 0)::bigint AS "monthSales",
      COALESCE(SUM("total") FILTER (WHERE "paidDate" IS NULL), 0)::bigint AS "receivable",
      COUNT(*) FILTER (WHERE "paidDate" IS NULL AND "dueDate" < ${todayStr}::date)::bigint AS "overdueCount"
    FROM "Invoice"
    WHERE ("paidDate" IS NULL OR "issueDate" >= ${monthStartStr}::date) ${scope}
  `;

  const monthlyQuery = prisma.$queryRaw<{ month: string; sales: bigint }[]>`
    SELECT to_char(date_trunc('month', "issueDate"), 'YYYY-MM') AS "month",
           SUM("subtotal")::bigint AS "sales"
    FROM "Invoice"
    WHERE "issueDate" >= ${yearStartStr}::date AND "issueDate" < ${nextMonthStartStr}::date ${scope}
    GROUP BY 1
  `;

  const byEmployeeQuery = admin
    ? prisma.$queryRaw<{ id: string; name: string; monthSales: bigint; yearSales: bigint }[]>`
        SELECT u."id", u."name",
               COALESCE(SUM(i."subtotal") FILTER (WHERE i."issueDate" >= ${monthStartStr}::date), 0)::bigint AS "monthSales",
               COALESCE(SUM(i."subtotal"), 0)::bigint AS "yearSales"
        FROM "User" u
        LEFT JOIN "Invoice" i
          ON i."assigneeId" = u."id"
         AND i."issueDate" >= ${yearStartStr}::date
         AND i."issueDate" < ${nextMonthStartStr}::date
        GROUP BY u."id", u."name", u."role", u."createdAt"
        HAVING u."role" = 'EMPLOYEE' OR COUNT(i."id") > 0
        ORDER BY u."createdAt", u."name"
      `
    : Promise.resolve(null);

  const [kpiRows, monthlyRows, employeeRows] = await Promise.all([kpiQuery, monthlyQuery, byEmployeeQuery]);

  const salesByMonth = new Map(monthlyRows.map((row) => [row.month, Number(row.sales)]));
  const monthly: MonthlySales[] = [];
  for (let i = 0; i < 12; i++) {
    const date = addMonths(yearStart, i);
    const key = toDateString(date).slice(0, 7);
    const month = date.getUTCMonth() + 1;
    // 1月と最初の月には年を付けて、年の切り替わりが分かるようにする
    const label = i === 0 || month === 1 ? `${date.getUTCFullYear()}年${month}月` : `${month}月`;
    monthly.push({ month: key, label, sales: salesByMonth.get(key) ?? 0 });
  }

  const kpi = kpiRows[0];
  return {
    monthLabel: `${today.getUTCFullYear()}年${today.getUTCMonth() + 1}月`,
    monthSales: Number(kpi?.monthSales ?? 0),
    receivable: Number(kpi?.receivable ?? 0),
    overdueCount: Number(kpi?.overdueCount ?? 0),
    monthly,
    byEmployee: employeeRows
      ? employeeRows.map((row) => ({
          id: row.id,
          name: row.name,
          monthSales: Number(row.monthSales),
          yearSales: Number(row.yearSales),
        }))
      : null,
  };
}
