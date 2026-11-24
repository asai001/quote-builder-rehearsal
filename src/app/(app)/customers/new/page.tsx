import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { FreshOnNavigate } from "@/components/fresh-on-navigate";
import { CustomerForm } from "@/components/customer-form";

export const metadata: Metadata = { title: "お客様を追加する" };

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="お客様を追加する" />
      <FreshOnNavigate>
        <CustomerForm initial={{ name: "", phone: "", address: "", area: "IN_CITY" }} />
      </FreshOnNavigate>
    </>
  );
}
