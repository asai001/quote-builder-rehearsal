import { z } from "zod";

/** お客様の入力チェック（お客様の追加・編集と、見積作成時の新しいお客様の両方で使う） */
export const customerFields = {
  name: z.string().trim().min(1, "お客様名を入力してください。").max(100, "お客様名は100文字までで入力してください。"),
  phone: z
    .string()
    .trim()
    .min(1, "電話番号を入力してください。")
    .max(20, "電話番号は20文字までで入力してください。")
    .regex(/^[0-9０-９+\-ー－() （）]+$/, "電話番号は数字とハイフンで入力してください。"),
  address: z.string().trim().min(1, "住所を入力してください。").max(200, "住所は200文字までで入力してください。"),
  area: z.enum(["IN_CITY", "OUT_OF_CITY"], { message: "市内か市外かを選んでください。" }),
};
