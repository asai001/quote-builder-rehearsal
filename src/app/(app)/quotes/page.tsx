import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { EmptyState, FilterTabs, Loading, PageHeader, Pagination, QuoteStatusBadge, buttonStyles, tableStyles } from "@/components/ui";
import { PAGE_SIZE, listQuotes } from "@/lib/data/quotes";
import { formatDate } from "@/lib/dates";
import { formatYen } from "@/lib/format";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from "@/lib/labels";
import { isAdmin, requireUser } from "@/lib/session";
import type { QuoteStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "見積の一覧" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function hrefFor(status: QuoteStatus | undefined, page = 1) {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `/quotes?${text}` : "/quotes";
}

async function QuoteList({ searchParams }: { searchParams: SearchParams }) {
  const [query, user] = await Promise.all([searchParams, requireUser()]);
  const status = QUOTE_STATUSES.find((s) => s === query.status);
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  const { rows, total } = await listQuotes(user, { status, page });
  const admin = isAdmin(user);

  return (
    <>
      <FilterTabs
        current={status ?? "all"}
        tabs={[
          { key: "all", label: "すべて", href: hrefFor(undefined) },
          ...QUOTE_STATUSES.map((s) => ({ key: s, label: QUOTE_STATUS_LABELS[s], href: hrefFor(s) })),
        ]}
      />
      <p className="mb-3 text-base text-slate-600">
        {admin ? "すべての担当者の見積" : "あなたが担当の見積"}：{total.toLocaleString("ja-JP")}件
      </p>
      {rows.length === 0 ? (
        <EmptyState>この条件の見積はありません。</EmptyState>
      ) : (
        <div className={tableStyles.wrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th className={tableStyles.th}>見積番号</th>
                <th className={tableStyles.th}>発行日</th>
                <th className={tableStyles.th}>お客様</th>
                <th className={tableStyles.th}>担当者</th>
                <th className={tableStyles.th}>状態</th>
                <th className={`${tableStyles.th} text-right`}>合計（税込）</th>
                <th className={tableStyles.th}>
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((quote) => (
                <tr key={quote.id} className="hover:bg-blue-50/50">
                  <td className={`${tableStyles.td} font-bold whitespace-nowrap`}>{quote.quoteNumber}</td>
                  <td className={`${tableStyles.td} whitespace-nowrap tabular-nums`}>{formatDate(quote.issueDate)}</td>
                  <td className={tableStyles.td}>{quote.customer.name}</td>
                  <td className={`${tableStyles.td} whitespace-nowrap`}>{quote.assignee.name}</td>
                  <td className={tableStyles.td}>
                    <QuoteStatusBadge status={quote.status} />
                  </td>
                  <td className={tableStyles.tdNum}>{formatYen(quote.total)}</td>
                  <td className={`${tableStyles.td} text-right`}>
                    <Link
                      href={`/quotes/${quote.id}`}
                      className="inline-flex min-h-10 items-center rounded-lg border-2 border-blue-700 px-4 text-base font-bold whitespace-nowrap text-blue-800 hover:bg-blue-50"
                    >
                      開く
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => hrefFor(status, p)} />
    </>
  );
}

export default function QuotesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        title="見積の一覧"
        actions={
          <Link href="/quotes/new" className={`${buttonStyles.primary} text-lg`}>
            ＋ 見積を作る
          </Link>
        }
      />
      <Suspense fallback={<Loading />}>
        <QuoteList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
