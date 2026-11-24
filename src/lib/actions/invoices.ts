"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { formatDate, parseDateString, todayJst } from "@/lib/dates";
import { NOT_ALLOWED, NOT_FOUND, type ActionResult } from "@/lib/actions/result";

const ADMIN_ONLY = "入金の登録は管理者だけが行えます。";

/** 入金日の登録（管理者のみ） */
export async function registerPayment(invoiceId: string, paidDateText: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user)) return { ok: false, message: ADMIN_ONLY };

  if (!z.string().uuid().safeParse(invoiceId).success) return { ok: false, message: NOT_ALLOWED };
  const paidDate = parseDateString(paidDateText);
  if (!paidDate) return { ok: false, message: "入金日を正しく入力してください。" };
  if (paidDate > todayJst()) return { ok: false, message: "入金日に、先の日付は登録できません。" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, issueDate: true, paidDate: true },
  });
  if (!invoice) return { ok: false, message: NOT_FOUND };
  if (invoice.paidDate) return { ok: false, message: "この請求はすでに入金済みです。" };
  if (paidDate < invoice.issueDate) {
    return { ok: false, message: `入金日は、請求書の発行日（${formatDate(invoice.issueDate)}）以降の日付にしてください。` };
  }

  const updated = await prisma.invoice.updateMany({ where: { id: invoice.id, paidDate: null }, data: { paidDate } });
  if (updated.count === 0) return { ok: false, message: "この請求はすでに入金済みです。" };

  revalidatePath("/", "layout");
  return { ok: true, message: "入金を登録しました。" };
}

/** 入金の取り消し（登録を間違えたとき用。管理者のみ） */
export async function cancelPayment(invoiceId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user)) return { ok: false, message: ADMIN_ONLY };

  if (!z.string().uuid().safeParse(invoiceId).success) return { ok: false, message: NOT_ALLOWED };

  const updated = await prisma.invoice.updateMany({
    where: { id: invoiceId, paidDate: { not: null } },
    data: { paidDate: null },
  });
  if (updated.count === 0) return { ok: false, message: NOT_FOUND };

  revalidatePath("/", "layout");
  return { ok: true, message: "入金の登録を取り消しました。" };
}
