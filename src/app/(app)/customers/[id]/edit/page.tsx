import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Loading, PageHeader } from "@/components/ui";
import { FreshOnNavigate } from "@/components/fresh-on-navigate";
import { CustomerForm } from "@/components/customer-form";
import { getCustomer } from "@/lib/data/customers";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "お客様の情報を変更する" };

async function EditCustomer({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireUser()]);
  const customer = await getCustomer(id);
  if (!customer) notFound();
  return (
    <FreshOnNavigate>
      <CustomerForm initial={customer} />
    </FreshOnNavigate>
  );
}

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader title="お客様の情報を変更する" />
      <Suspense fallback={<Loading />}>
        <EditCustomer params={params} />
      </Suspense>
    </>
  );
}
