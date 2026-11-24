import { Suspense } from "react";
import type { Metadata } from "next";
import { EmptyState, Loading, PageHeader } from "@/components/ui";
import { InvoiceTable } from "@/components/invoice-table";
import { getReceivables } from "@/lib/data/invoices";
import { formatNumber } from "@/lib/format";
import { isAdmin, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "売掛金" };

async function Receivables() {
  const user = await requireUser();
  const data = await getReceivables(user);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-base font-bold text-slate-700">売掛金の合計（{isAdmin(user) ? "会社全体" : "あなたの担当分"}・税込）</p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-slate-900">
            {formatNumber(data.totalAmount)}
            <span className="ml-1 text-xl">円</span>
          </p>
          <p className="mt-2 text-sm text-slate-600">未入金の請求：{formatNumber(data.count)}件</p>
        </div>
        <div className={`rounded-xl border bg-white p-5 shadow-sm ${data.overdueCount > 0 ? "border-red-300" : "border-slate-200"}`}>
          <p className="text-base font-bold text-slate-700">うち、支払期限を過ぎたもの</p>
          <p className={`mt-2 text-4xl font-bold tabular-nums ${data.overdueCount > 0 ? "text-red-700" : "text-slate-900"}`}>
            {formatNumber(data.overdueAmount)}
            <span className="ml-1 text-xl">円</span>
          </p>
          <p className={`mt-2 text-sm ${data.overdueCount > 0 ? "font-bold text-red-700" : "text-slate-600"}`}>期限超過：{formatNumber(data.overdueCount)}件</p>
        </div>
      </div>
      {data.rows.length === 0 ? (
        <EmptyState>未入金の請求はありません。</EmptyState>
      ) : (
        <>
          <p className="text-base text-slate-600">支払期限が近い順に並んでいます。</p>
          <InvoiceTable rows={data.rows} today={data.today} />
        </>
      )}
    </div>
  );
}

export default function ReceivablesPage() {
  return (
    <>
      <PageHeader title="売掛金（未入金の請求）" description="請求したけれど、まだ入金されていないものの一覧です。" />
      <Suspense fallback={<Loading />}>
        <Receivables />
      </Suspense>
    </>
  );
}
