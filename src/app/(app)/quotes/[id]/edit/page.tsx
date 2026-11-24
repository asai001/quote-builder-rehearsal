import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Loading, PageHeader, buttonStyles } from "@/components/ui";
import { FreshOnNavigate } from "@/components/fresh-on-navigate";
import { QuoteForm } from "@/components/quote-form";
import { countsFromItems } from "@/config/pricing";
import { listAssignees, listCustomers } from "@/lib/data/customers";
import { getQuote } from "@/lib/data/quotes";
import { toDateString } from "@/lib/dates";
import { isAdmin, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "見積を編集する" };

async function EditQuote({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const admin = isAdmin(user);
  const [quote, customers, assignees] = await Promise.all([getQuote(user, id), listCustomers(), admin ? listAssignees() : Promise.resolve(null)]);
  if (!quote) notFound();

  if (quote.status === "INVOICED") {
    return (
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-6 text-lg text-amber-900">
        <p className="font-bold">この見積（{quote.quoteNumber}）は請求済みのため、編集できません。</p>
        <Link href={`/quotes/${quote.id}`} className={`${buttonStyles.secondary} mt-4`}>
          見積の内容に戻る
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-lg font-bold text-slate-700">見積番号：{quote.quoteNumber}</p>
      <FreshOnNavigate>
        <QuoteForm
          quoteId={quote.id}
          customers={customers}
          assignees={assignees ? assignees.map(({ id: userId, name }) => ({ id: userId, name })) : null}
          currentUserName={quote.assignee.name}
          initial={{
            customerId: quote.customerId,
            area: quote.area,
            counts: countsFromItems(quote.items),
            assigneeId: quote.assigneeId,
            issueDate: toDateString(quote.issueDate),
            validUntil: toDateString(quote.validUntil),
            note: quote.note,
          }}
        />
      </FreshOnNavigate>
    </>
  );
}

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader title="見積を編集する" description="内容を変えると、金額は料金表から自動で計算し直されます。" />
      <Suspense fallback={<Loading />}>
        <EditQuote params={params} />
      </Suspense>
    </>
  );
}
