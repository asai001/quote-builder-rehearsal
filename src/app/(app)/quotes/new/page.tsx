import { Suspense } from "react";
import type { Metadata } from "next";
import { Loading, PageHeader } from "@/components/ui";
import { FreshOnNavigate } from "@/components/fresh-on-navigate";
import { QuoteForm } from "@/components/quote-form";
import { QUOTE_VALID_DAYS } from "@/config/company";
import { listAssignees, listCustomers } from "@/lib/data/customers";
import { addDays, toDateString, todayJst } from "@/lib/dates";
import { isAdmin, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "見積を作る" };

async function NewQuote() {
  const user = await requireUser();
  const admin = isAdmin(user);
  const [customers, assignees] = await Promise.all([listCustomers(), admin ? listAssignees() : Promise.resolve(null)]);
  const today = todayJst();

  return (
    <FreshOnNavigate>
      <QuoteForm
        customers={customers}
        assignees={assignees ? assignees.map(({ id, name }) => ({ id, name })) : null}
        currentUserName={user.name}
        initial={{
          customerId: null,
          area: "IN_CITY",
          counts: {},
          assigneeId: user.id,
          issueDate: toDateString(today),
          validUntil: toDateString(addDays(today, QUOTE_VALID_DAYS)),
          note: "",
        }}
      />
    </FreshOnNavigate>
  );
}

export default function NewQuotePage() {
  return (
    <>
      <PageHeader title="見積を作る" description="上から順に選ぶだけで、料金表どおりの金額が右側に出ます。" />
      <Suspense fallback={<Loading />}>
        <NewQuote />
      </Suspense>
    </>
  );
}
