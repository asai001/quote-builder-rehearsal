import "server-only";
import { prisma } from "@/lib/db";

/** お客様一覧（名前・電話番号・住所で探せる） */
export async function listCustomers(query?: string) {
  const q = query?.trim();
  return prisma.customer.findMany({
    where: q
      ? {
          OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { address: { contains: q, mode: "insensitive" } }],
        }
      : undefined,
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, phone: true, address: true, area: true },
  });
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, address: true, area: true },
  });
}

/** 担当者の候補（管理者が見積の担当者を選ぶときに使う） */
export async function listAssignees() {
  return prisma.user.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });
}
