import "server-only";
import { prisma } from "@/lib/db";
import { ownerScope, type CurrentUser } from "@/lib/session";
import type { QuoteStatus } from "@/generated/prisma/enums";

export const PAGE_SIZE = 50;

/** 見積一覧（状態で絞り込み）。一覧と件数を2回の問い合わせでまとめて取得する */
export async function listQuotes(user: CurrentUser, options: { status?: QuoteStatus; page: number }) {
  const where = { ...ownerScope(user), ...(options.status ? { status: options.status } : {}) };
  const [rows, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: [{ issueDate: "desc" }, { quoteNumber: "desc" }],
      skip: (options.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        quoteNumber: true,
        issueDate: true,
        status: true,
        total: true,
        customer: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    }),
    prisma.quote.count({ where }),
  ]);
  return { rows, total };
}

/** 見積の詳細。見てよい範囲（管理者はすべて／社員は自分の担当）でなければ null */
export async function getQuote(user: CurrentUser, id: string) {
  return prisma.quote.findFirst({
    where: { id, ...ownerScope(user) },
    include: {
      customer: true,
      assignee: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: "asc" } },
      invoice: { select: { id: true, invoiceNumber: true } },
    },
  });
}
