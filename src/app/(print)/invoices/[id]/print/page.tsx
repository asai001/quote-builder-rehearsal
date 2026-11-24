import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentSheet } from "@/components/document-sheet";
import { PrintToolbar } from "@/components/print-toolbar";
import { Loading } from "@/components/ui";
import { getInvoice } from "@/lib/data/invoices";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "請求書の印刷" };

async function InvoicePrint({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const invoice = await getInvoice(user, id);
  if (!invoice) notFound();

  return (
    <>
      <PrintToolbar backHref={`/invoices/${invoice.id}`} backLabel="請求の内容に戻る" />
      <DocumentSheet
        kind="invoice"
        number={invoice.invoiceNumber}
        issueDate={invoice.issueDate}
        limitDate={invoice.dueDate}
        customer={invoice.customer}
        assigneeName={invoice.assignee.name}
        items={invoice.items}
        subtotal={invoice.subtotal}
        tax={invoice.tax}
        total={invoice.total}
        note={invoice.quote.note}
      />
    </>
  );
}

export default function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <Loading />
        </div>
      }
    >
      <InvoicePrint params={params} />
    </Suspense>
  );
}
