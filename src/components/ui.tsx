import Link from "next/link";
import type { ReactNode } from "react";
import type { QuoteStatus } from "@/generated/prisma/enums";
import { QUOTE_STATUS_LABELS } from "@/lib/labels";

/** ボタンの見た目（文字とボタンは大きめ） */
export const buttonStyles = {
  primary:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 text-base font-bold text-white shadow-sm hover:bg-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400",
  secondary:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-slate-400 bg-white px-6 text-base font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-red-700 bg-white px-6 text-base font-bold text-red-800 hover:bg-red-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-50",
} as const;

export const inputStyles =
  "block min-h-12 w-full rounded-lg border-2 border-slate-400 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

export const labelStyles = "mb-1 block text-base font-bold text-slate-800";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-base text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {title ? <h2 className="mb-4 text-xl font-bold text-slate-900">{title}</h2> : null}
      {children}
    </section>
  );
}

const statusStyles: Record<QuoteStatus, string> = {
  DRAFT: "border-slate-400 bg-slate-100 text-slate-800",
  SUBMITTED: "border-blue-400 bg-blue-50 text-blue-900",
  ORDERED: "border-green-600 bg-green-50 text-green-900",
  LOST: "border-slate-400 bg-white text-slate-600",
  INVOICED: "border-violet-400 bg-violet-50 text-violet-900",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-3 py-0.5 text-sm font-bold ${statusStyles[status]}`}>
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}

/** 請求の入金状況（入金済み／未入金／期限超過＝赤字） */
export function PaymentBadge({ paidDate, dueDate, today }: { paidDate: Date | null; dueDate: Date; today: Date }) {
  if (paidDate) {
    return (
      <span className="inline-block whitespace-nowrap rounded-full border border-green-600 bg-green-50 px-3 py-0.5 text-sm font-bold text-green-900">
        入金済み
      </span>
    );
  }
  if (dueDate < today) {
    return (
      <span className="inline-block whitespace-nowrap rounded-full border border-red-600 bg-red-50 px-3 py-0.5 text-sm font-bold text-red-700">⚠ 期限超過</span>
    );
  }
  return (
    <span className="inline-block whitespace-nowrap rounded-full border border-amber-500 bg-amber-50 px-3 py-0.5 text-sm font-bold text-amber-900">未入金</span>
  );
}

/** 絞り込みのタブ（リンク） */
export function FilterTabs({ tabs, current }: { tabs: { key: string; label: string; href: string }[]; current: string }) {
  return (
    <nav aria-label="絞り込み" className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border-2 px-5 text-base font-bold ${
              active ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonStyles.secondary}>
          ← 前の{pageSize}件
        </Link>
      ) : (
        <span />
      )}
      <p className="text-base text-slate-600">
        {page} / {pages} ページ
      </p>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={buttonStyles.secondary}>
          次の{pageSize}件 →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-lg text-slate-600">{children}</p>;
}

/** 読み込み中の表示 */
export function Loading({ label = "読み込んでいます…" }: { label?: string }) {
  return (
    <div role="status" className="rounded-xl border border-slate-200 bg-white p-10 text-center text-lg text-slate-500">
      {label}
    </div>
  );
}

export const tableStyles = {
  wrap: "overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm",
  table: "w-full min-w-[720px] border-collapse text-left text-base",
  th: "border-b-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold whitespace-nowrap text-slate-700",
  td: "border-b border-slate-100 px-4 py-3 align-middle",
  tdNum: "border-b border-slate-100 px-4 py-3 text-right align-middle tabular-nums whitespace-nowrap",
} as const;
