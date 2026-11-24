import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { EmptyState, Loading, PageHeader, buttonStyles, inputStyles, tableStyles } from "@/components/ui";
import { AREA_LABELS } from "@/config/pricing";
import { listCustomers } from "@/lib/data/customers";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "お客様の一覧" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function CustomerList({ searchParams }: { searchParams: SearchParams }) {
  const [query] = await Promise.all([searchParams, requireUser()]);
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const customers = await listCustomers(q);

  return (
    <>
      <form action="/customers" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label htmlFor="customer-list-q" className="mb-1 block text-base font-bold text-slate-800">
            名前・電話番号・住所で探す
          </label>
          <input id="customer-list-q" name="q" type="search" defaultValue={q} placeholder="例：山田　／　090-1234" className={inputStyles} />
        </div>
        <button type="submit" className={buttonStyles.secondary}>
          探す
        </button>
        {q ? (
          <Link href="/customers" className={buttonStyles.secondary}>
            すべて表示
          </Link>
        ) : null}
      </form>
      <p className="mb-3 text-base text-slate-600">{customers.length.toLocaleString("ja-JP")}件</p>
      {customers.length === 0 ? (
        <EmptyState>該当するお客様がいません。</EmptyState>
      ) : (
        <div className={tableStyles.wrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th className={tableStyles.th}>お客様名</th>
                <th className={tableStyles.th}>電話番号</th>
                <th className={tableStyles.th}>住所</th>
                <th className={tableStyles.th}>市内・市外</th>
                <th className={tableStyles.th}>
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-blue-50/50">
                  <td className={`${tableStyles.td} font-bold`}>{customer.name}</td>
                  <td className={`${tableStyles.td} whitespace-nowrap tabular-nums`}>{customer.phone}</td>
                  <td className={tableStyles.td}>{customer.address}</td>
                  <td className={`${tableStyles.td} whitespace-nowrap`}>{AREA_LABELS[customer.area]}</td>
                  <td className={`${tableStyles.td} text-right`}>
                    <Link
                      href={`/customers/${customer.id}/edit`}
                      className="inline-flex min-h-10 items-center rounded-lg border-2 border-blue-700 px-4 text-base font-bold whitespace-nowrap text-blue-800 hover:bg-blue-50"
                    >
                      変更する
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        title="お客様の一覧"
        actions={
          <Link href="/customers/new" className={`${buttonStyles.primary} text-lg`}>
            ＋ お客様を追加する
          </Link>
        }
      />
      <Suspense fallback={<Loading />}>
        <CustomerList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
