"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, isAdmin, ownerScope } from "@/lib/session";
import { AC_TYPES, OPTIONS, calculateQuote, validateSelection, type Counts } from "@/config/pricing";
import { endOfNextMonth, parseDateString, todayJst } from "@/lib/dates";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_TRANSITIONS } from "@/lib/labels";
import { customerFields } from "@/lib/validation";
import { NOT_ALLOWED, NOT_FOUND, type ActionResult } from "@/lib/actions/result";

type Tx = Prisma.TransactionClient;

/** 連番を1つ進めて番号を作る（例：Q-2026-0001 / INV-2026-0001）。同時に操作しても重複しない */
async function nextNumber(tx: Tx, prefix: "Q" | "INV", year: number): Promise<string> {
  const key = `${prefix}-${year}`;
  const sequence = await tx.numberSequence.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${key}-${String(sequence.value).padStart(4, "0")}`;
}

const countCodes = [...AC_TYPES, ...OPTIONS].map((item) => item.code);

const quoteSchema = z.object({
  id: z.string().uuid().optional(),
  customer: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("existing"), id: z.string().uuid("お客様を選んでください。") }),
    z.object({ mode: z.literal("new"), ...customerFields }),
  ]),
  area: z.enum(["IN_CITY", "OUT_OF_CITY"], { message: "訪問先（市内・市外）を選んでください。" }),
  counts: z.record(z.string(), z.number().int().min(0).max(1000)),
  assigneeId: z.string().uuid().optional(),
  issueDate: z.string(),
  validUntil: z.string(),
  note: z.string().trim().max(1000, "備考は1000文字までで入力してください。"),
});

export type QuoteInput = z.input<typeof quoteSchema>;

/**
 * 見積の保存（新規・編集）。
 * 画面からは「お客様・訪問先・台数」だけを受け取り、明細と金額は必ずサーバー側で料金表から計算し直す。
 */
export async function saveQuote(input: QuoteInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "入力内容をご確認ください。" };
  }
  const data = parsed.data;

  // 料金表にある項目だけを取り出して計算する
  const counts: Counts = {};
  for (const code of countCodes) counts[code] = data.counts[code] ?? 0;
  const selection = { area: data.area, counts };
  const selectionError = validateSelection(selection);
  if (selectionError) return { ok: false, message: selectionError };
  const calc = calculateQuote(selection);

  const issueDate = parseDateString(data.issueDate);
  const validUntil = parseDateString(data.validUntil);
  if (!issueDate) return { ok: false, message: "発行日を正しく入力してください。" };
  if (!validUntil) return { ok: false, message: "有効期限を正しく入力してください。" };
  if (validUntil < issueDate) return { ok: false, message: "有効期限は、発行日より後の日付にしてください。" };

  // 担当者：社員は必ず自分。管理者だけが変更できる
  let assigneeId: string | undefined = user.id;
  if (isAdmin(user)) {
    assigneeId = data.assigneeId;
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true } });
      if (!assignee) return { ok: false, message: "担当者を選び直してください。" };
    }
  }

  const result = await prisma.$transaction(async (tx): Promise<ActionResult & { id?: string }> => {
    let existing: { id: string; status: string; assigneeId: string } | null = null;
    if (data.id) {
      existing = await tx.quote.findFirst({
        where: { id: data.id, ...ownerScope(user) },
        select: { id: true, status: true, assigneeId: true },
      });
      if (!existing) return { ok: false, message: NOT_FOUND };
      if (existing.status === "INVOICED") {
        return { ok: false, message: "請求済みの見積は編集できません。" };
      }
    }

    let customerId: string;
    if (data.customer.mode === "new") {
      const { name, phone, address, area } = data.customer;
      const customer = await tx.customer.create({ data: { name, phone, address, area }, select: { id: true } });
      customerId = customer.id;
    } else {
      const customer = await tx.customer.findUnique({ where: { id: data.customer.id }, select: { id: true } });
      if (!customer) return { ok: false, message: "お客様を選び直してください。" };
      customerId = customer.id;
    }

    const common = {
      customerId,
      area: data.area,
      issueDate,
      validUntil,
      subtotal: calc.subtotal,
      tax: calc.tax,
      total: calc.total,
      note: data.note,
    };

    if (existing) {
      // 請求済みになった直後の上書きを防ぐため、状態も条件に入れて更新する
      const updated = await tx.quote.updateMany({
        where: { id: existing.id, status: { not: "INVOICED" } },
        data: { ...common, assigneeId: assigneeId ?? existing.assigneeId },
      });
      if (updated.count === 0) return { ok: false, message: "請求済みの見積は編集できません。" };
      await tx.quoteItem.deleteMany({ where: { quoteId: existing.id } });
      await tx.quoteItem.createMany({ data: calc.items.map((item) => ({ ...item, quoteId: existing.id })) });
      return { ok: true, id: existing.id };
    }

    const quoteNumber = await nextNumber(tx, "Q", issueDate.getUTCFullYear());
    const created = await tx.quote.create({
      data: {
        ...common,
        quoteNumber,
        assigneeId: assigneeId ?? user.id,
        status: "DRAFT",
        items: { createMany: { data: calc.items } },
      },
      select: { id: true },
    });
    return { ok: true, id: created.id };
  });

  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect(`/quotes/${result.id}`);
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["SUBMITTED", "ORDERED", "LOST"]),
});

/** 見積の状態の変更（提出済み・受注・失注） */
export async function changeQuoteStatus(id: string, status: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = statusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, message: NOT_ALLOWED };

  const quote = await prisma.quote.findFirst({
    where: { id: parsed.data.id, ...ownerScope(user) },
    select: { id: true, status: true },
  });
  if (!quote) return { ok: false, message: NOT_FOUND };
  if (!QUOTE_STATUS_TRANSITIONS[quote.status].includes(parsed.data.status)) {
    return {
      ok: false,
      message: `「${QUOTE_STATUS_LABELS[quote.status]}」の見積は「${QUOTE_STATUS_LABELS[parsed.data.status]}」に変更できません。`,
    };
  }

  const updated = await prisma.quote.updateMany({
    where: { id: quote.id, status: quote.status },
    data: { status: parsed.data.status },
  });
  if (updated.count === 0) return { ok: false, message: NOT_ALLOWED };

  revalidatePath("/", "layout");
  return { ok: true, message: `状態を「${QUOTE_STATUS_LABELS[parsed.data.status]}」に変更しました。` };
}

/**
 * 請求書への変換。受注した見積の内容をコピーして請求書を作る。
 * 発行日は今日、支払期限は翌月末。変換後、見積は「請求済み」になる。
 */
export async function convertQuoteToInvoice(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: NOT_ALLOWED };

  const result = await prisma.$transaction(async (tx): Promise<ActionResult & { invoiceId?: string }> => {
    const quote = await tx.quote.findFirst({
      where: { id, ...ownerScope(user) },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!quote) return { ok: false, message: NOT_FOUND };
    if (quote.status !== "ORDERED") {
      return { ok: false, message: "請求書に変換できるのは「受注」の見積だけです。" };
    }

    // 二重に変換されないよう、「受注」のままであることを条件に状態を進める
    const locked = await tx.quote.updateMany({
      where: { id: quote.id, status: "ORDERED" },
      data: { status: "INVOICED" },
    });
    if (locked.count === 0) return { ok: false, message: "この見積はすでに請求書に変換されています。" };

    const issueDate = todayJst();
    const invoiceNumber = await nextNumber(tx, "INV", issueDate.getUTCFullYear());
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        quoteId: quote.id,
        customerId: quote.customerId,
        assigneeId: quote.assigneeId,
        issueDate,
        dueDate: endOfNextMonth(issueDate),
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        items: {
          createMany: {
            data: quote.items.map(({ code, name, quantity, unitPrice, amount, sortOrder }) => ({
              code,
              name,
              quantity,
              unitPrice,
              amount,
              sortOrder,
            })),
          },
        },
      },
      select: { id: true },
    });
    return { ok: true, invoiceId: invoice.id };
  });

  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect(`/invoices/${result.invoiceId}`);
}
