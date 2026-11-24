import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, Loading, PageHeader, QuoteStatusBadge, buttonStyles } from "@/components/ui";
import { InfoList, ItemsTable } from "@/components/items-table";
import { FreshOnNavigate } from "@/components/fresh-on-navigate";
import { QuoteActions } from "@/components/quote-actions";
import { AREA_LABELS } from "@/config/pricing";
import { getQuote } from "@/lib/data/quotes";
import { formatDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "見積の内容" };

const NEXT_STEP_HINT = {
  DRAFT: "お客様に見積を伝えたら、「提出済みにする」を押してください。",
  SUBMITTED: "お客様からお返事があったら、「受注」か「失注」を選んでください。",
  ORDERED: "作業が終わって請求するときは、「請求書に変換」を押してください。",
  LOST: "お客様の気が変わったときは、「提出済みに戻す」でやり直せます。",
  INVOICED: "この見積は請求書に変換済みです。内容の変更はできません。",
} as const;

async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const quote = await getQuote(user, id);
  if (!quote) notFound();
  const locked = quote.status === "INVOICED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-2xl font-bold text-slate-900">{quote.quoteNumber}</p>
          <QuoteStatusBadge status={quote.status} />
        </div>
        <div className="flex flex-wrap gap-3">
          {locked ? null : (
            <Link href={`/quotes/${quote.id}/edit`} className={buttonStyles.secondary}>
              内容を編集する
            </Link>
          )}
          <Link href={`/quotes/${quote.id}/print`} className={buttonStyles.secondary}>
            見積書を印刷する
          </Link>
        </div>
      </div>

      <Card title="次にすること">
        <p className="mb-4 text-lg text-slate-800">{NEXT_STEP_HINT[quote.status]}</p>
        {locked ? (
          quote.invoice ? (
            <Link href={`/invoices/${quote.invoice.id}`} className={buttonStyles.primary}>
              請求書（{quote.invoice.invoiceNumber}）を開く
            </Link>
          ) : null
        ) : (
          <FreshOnNavigate>
            <QuoteActions quoteId={quote.id} status={quote.status} />
          </FreshOnNavigate>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="お客様">
          <InfoList
            rows={[
              ["お客様名", quote.customer.name],
              ["電話番号", quote.customer.phone],
              ["住所", quote.customer.address],
              ["訪問先", AREA_LABELS[quote.area]],
            ]}
          />
        </Card>
        <Card title="見積の情報">
          <InfoList
            rows={[
              ["担当者", quote.assignee.name],
              ["発行日", formatDate(quote.issueDate)],
              ["有効期限", formatDate(quote.validUntil)],
              ["備考", quote.note ? <span className="whitespace-pre-wrap">{quote.note}</span> : "（なし）"],
            ]}
          />
        </Card>
      </div>

      <Card title="明細">
        <ItemsTable items={quote.items} subtotal={quote.subtotal} tax={quote.tax} total={quote.total} />
      </Card>
    </div>
  );
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader
        title="見積の内容"
        actions={
          <Link href="/quotes" className={buttonStyles.secondary}>
            ← 見積の一覧に戻る
          </Link>
        }
      />
      <Suspense fallback={<Loading />}>
        <QuoteDetail params={params} />
      </Suspense>
    </>
  );
}
