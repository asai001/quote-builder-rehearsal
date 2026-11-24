import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentSheet } from "@/components/document-sheet";
import { PrintToolbar } from "@/components/print-toolbar";
import { Loading } from "@/components/ui";
import { getQuote } from "@/lib/data/quotes";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "見積書の印刷" };

async function QuotePrint({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const quote = await getQuote(user, id);
  if (!quote) notFound();

  return (
    <>
      <PrintToolbar backHref={`/quotes/${quote.id}`} backLabel="見積の内容に戻る" />
      <DocumentSheet
        kind="quote"
        number={quote.quoteNumber}
        issueDate={quote.issueDate}
        limitDate={quote.validUntil}
        customer={quote.customer}
        assigneeName={quote.assignee.name}
        items={quote.items}
        subtotal={quote.subtotal}
        tax={quote.tax}
        total={quote.total}
        note={quote.note}
      />
    </>
  );
}

export default function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <Loading />
        </div>
      }
    >
      <QuotePrint params={params} />
    </Suspense>
  );
}
