import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, Loading, PageHeader, PaymentBadge, buttonStyles } from "@/components/ui";
import { InfoList, ItemsTable } from "@/components/items-table";
import { FreshOnNavigate } from "@/components/fresh-on-navigate";
import { PaymentForm } from "@/components/payment-form";
import { getInvoice } from "@/lib/data/invoices";
import { formatDate, toDateString, todayJst } from "@/lib/dates";
import { isAdmin, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "請求の内容" };

async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const invoice = await getInvoice(user, id);
  if (!invoice) notFound();
  const today = todayJst();
  const overdue = !invoice.paidDate && invoice.dueDate < today;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</p>
          <PaymentBadge paidDate={invoice.paidDate} dueDate={invoice.dueDate} today={today} />
        </div>
        <Link href={`/invoices/${invoice.id}/print`} className={`${buttonStyles.primary} text-lg`}>
          請求書を印刷する
        </Link>
      </div>

      <Card title="入金の状況">
        {invoice.paidDate ? (
          <p className="text-lg text-slate-800">
            <span className="font-bold text-green-800">{formatDate(invoice.paidDate)}</span> に入金済みです。
          </p>
        ) : overdue ? (
          <p className="text-lg font-bold text-red-700">期限超過：支払期限（{formatDate(invoice.dueDate)}）を過ぎていますが、まだ入金がありません。</p>
        ) : (
          <p className="text-lg text-slate-800">まだ入金がありません。支払期限は {formatDate(invoice.dueDate)} です。</p>
        )}
        {isAdmin(user) ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <FreshOnNavigate>
              <PaymentForm invoiceId={invoice.id} paid={Boolean(invoice.paidDate)} today={toDateString(today)} minDate={toDateString(invoice.issueDate)} />
            </FreshOnNavigate>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="お客様">
          <InfoList
            rows={[
              ["お客様名", invoice.customer.name],
              ["電話番号", invoice.customer.phone],
              ["住所", invoice.customer.address],
            ]}
          />
        </Card>
        <Card title="請求の情報">
          <InfoList
            rows={[
              ["担当者", invoice.assignee.name],
              ["発行日", formatDate(invoice.issueDate)],
              [
                "支払期限",
                <span key="due" className={overdue ? "font-bold text-red-700" : undefined}>
                  {formatDate(invoice.dueDate)}
                </span>,
              ],
              [
                "元の見積",
                <Link key="quote" href={`/quotes/${invoice.quote.id}`} className="font-bold text-blue-800 underline">
                  {invoice.quote.quoteNumber}
                </Link>,
              ],
            ]}
          />
        </Card>
      </div>

      <Card title="明細">
        <ItemsTable items={invoice.items} subtotal={invoice.subtotal} tax={invoice.tax} total={invoice.total} />
      </Card>
    </div>
  );
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader
        title="請求の内容"
        actions={
          <Link href="/invoices" className={buttonStyles.secondary}>
            ← 請求の一覧に戻る
          </Link>
        }
      />
      <Suspense fallback={<Loading />}>
        <InvoiceDetail params={params} />
      </Suspense>
    </>
  );
}
