"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { customerFields } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/result";

const customerSchema = z.object({
  id: z.string().uuid().optional(),
  ...customerFields,
});

export type CustomerFormState = ActionResult | null;

/** お客様の追加・編集（ログインしていれば管理者・社員とも使える） */
export async function saveCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = customerSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    area: formData.get("area"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "入力内容をご確認ください。" };
  }
  const { id, ...data } = parsed.data;

  if (id) {
    const updated = await prisma.customer.updateMany({ where: { id }, data });
    if (updated.count === 0) return { ok: false, message: "お客様が見つかりません。" };
  } else {
    await prisma.customer.create({ data });
  }

  revalidatePath("/", "layout");
  redirect("/customers");
}
