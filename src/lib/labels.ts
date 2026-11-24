import type { QuoteStatus } from "@/generated/prisma/enums";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "下書き",
  SUBMITTED: "提出済み",
  ORDERED: "受注",
  LOST: "失注",
  INVOICED: "請求済み",
};

export const QUOTE_STATUSES = ["DRAFT", "SUBMITTED", "ORDERED", "LOST", "INVOICED"] as const satisfies readonly QuoteStatus[];

/** 状態の変更ルール：下書き → 提出済み → 受注 / 失注（請求済みは「請求書に変換」でのみ設定） */
export const QUOTE_STATUS_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["ORDERED", "LOST"],
  ORDERED: ["SUBMITTED"],
  LOST: ["SUBMITTED"],
  INVOICED: [],
};

export const ROLE_LABELS = { ADMIN: "管理者", EMPLOYEE: "社員" } as const;

export type InvoiceFilter = "all" | "unpaid" | "overdue" | "paid";
export const INVOICE_FILTER_LABELS: Record<InvoiceFilter, string> = {
  all: "すべて",
  unpaid: "未入金",
  overdue: "期限超過",
  paid: "入金済み",
};
