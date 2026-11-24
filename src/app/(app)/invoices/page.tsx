import { Suspense } from "react";
import type { Metadata } from "next";
import { EmptyState, FilterTabs, Loading, PageHeader, Pagination } from "@/components/ui";
import { InvoiceTable } from "@/components/invoice-table";
import { listInvoices } from "@/lib/data/invoices";
import { PAGE_SIZE } from "@/lib/data/quotes";
import { INVOICE_FILTER_LABELS, type InvoiceFilter } from "@/lib/labels";
import { isAdmin, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "請求の一覧" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS: InvoiceFilter[] = ["all", "unpaid", "overdue", "paid"];

function hrefFor(filter: InvoiceFilter, page = 1) {
  const query = new URLSearchParams();
  if (filter !== "all") query.set("filter", filter);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `/invoices?${text}` : "/invoices";
}

async function InvoiceList({ searchParams }: { searchParams: SearchParams }) {
  const [query, user] = await Promise.all([searchParams, requireUser()]);
  const filter = FILTERS.find((f) => f === query.filter) ?? "all";
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  const { rows, total, today } = await listInvoices(user, { filter, page });

  return (
    <>
      <FilterTabs current={filter} tabs={FILTERS.map((f) => ({ key: f, label: INVOICE_FILTER_LABELS[f], href: hrefFor(f) }))} />
      <p className="mb-3 text-base text-slate-600">
        {isAdmin(user) ? "すべての担当者の請求" : "あなたが担当の請求"}：{total.toLocaleString("ja-JP")}件
        {filter === "unpaid" ? "（期限超過のものも含みます）" : ""}
      </p>
      {rows.length === 0 ? <EmptyState>この条件の請求はありません。</EmptyState> : <InvoiceTable rows={rows} today={today} />}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => hrefFor(filter, p)} />
    </>
  );
}

export default function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title="請求の一覧" description="請求書は、受注した見積の画面で「請求書に変換」を押すと作られます。" />
      <Suspense fallback={<Loading />}>
        <InvoiceList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
