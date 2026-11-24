import "server-only";
import { prisma } from "@/lib/db";
import { ownerScope, type CurrentUser } from "@/lib/session";
import { todayJst } from "@/lib/dates";
import type { InvoiceFilter } from "@/lib/labels";
import { PAGE_SIZE } from "@/lib/data/quotes";

function filterWhere(filter: InvoiceFilter, today: Date) {
  switch (filter) {
    case "paid":
      return { paidDate: { not: null } };
    case "unpaid":
      return { paidDate: null };
    case "overdue":
      return { paidDate: null, dueDate: { lt: today } };
    default:
      return {};
  }
}

const listSelect = {
  id: true,
  invoiceNumber: true,
  issueDate: true,
  dueDate: true,
  total: true,
  paidDate: true,
  customer: { select: { name: true } },
  assignee: { select: { name: true } },
} as const;

/** 請求一覧（入金済み・未入金・期限超過で絞り込み） */
export async function listInvoices(user: CurrentUser, options: { filter: InvoiceFilter; page: number }) {
  const today = todayJst();
  const where = { ...ownerScope(user), ...filterWhere(options.filter, today) };
  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ issueDate: "desc" }, { invoiceNumber: "desc" }],
      skip: (options.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: listSelect,
    }),
    prisma.invoice.count({ where }),
  ]);
  return { rows, total, today };
}

/** 請求の詳細。見てよい範囲でなければ null */
export async function getInvoice(user: CurrentUser, id: string) {
  return prisma.invoice.findFirst({
    where: { id, ...ownerScope(user) },
    include: {
      customer: true,
      assignee: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: "asc" } },
      quote: { select: { id: true, quoteNumber: true, note: true } },
    },
  });
}

/** 売掛金：未入金の請求の一覧と、合計・期限超過の集計（集計はデータベース側で行う） */
export async function getReceivables(user: CurrentUser) {
  const today = todayJst();
  const where = { ...ownerScope(user), paidDate: null };
  const [rows, summary, overdue] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { invoiceNumber: "asc" }],
      select: listSelect,
    }),
    prisma.invoice.aggregate({ where, _sum: { total: true }, _count: true }),
    prisma.invoice.aggregate({ where: { ...where, dueDate: { lt: today } }, _sum: { total: true }, _count: true }),
  ]);
  return {
    rows,
    today,
    totalAmount: summary._sum.total ?? 0,
    count: summary._count,
    overdueAmount: overdue._sum.total ?? 0,
    overdueCount: overdue._count,
  };
}
