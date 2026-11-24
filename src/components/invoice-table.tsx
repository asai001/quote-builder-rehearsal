import Link from "next/link";
import { PaymentBadge, tableStyles } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatYen } from "@/lib/format";

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  total: number;
  paidDate: Date | null;
  customer: { name: string };
  assignee: { name: string };
};

/** 請求の一覧表（請求一覧と売掛金の両方で使う） */
export function InvoiceTable({ rows, today }: { rows: InvoiceRow[]; today: Date }) {
  return (
    <div className={tableStyles.wrap}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th className={tableStyles.th}>請求番号</th>
            <th className={tableStyles.th}>発行日</th>
            <th className={tableStyles.th}>お客様</th>
            <th className={tableStyles.th}>担当者</th>
            <th className={tableStyles.th}>支払期限</th>
            <th className={tableStyles.th}>入金</th>
            <th className={`${tableStyles.th} text-right`}>請求金額（税込）</th>
            <th className={tableStyles.th}>
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((invoice) => {
            const overdue = !invoice.paidDate && invoice.dueDate < today;
            return (
              <tr key={invoice.id} className="hover:bg-blue-50/50">
                <td className={`${tableStyles.td} font-bold whitespace-nowrap`}>{invoice.invoiceNumber}</td>
                <td className={`${tableStyles.td} whitespace-nowrap tabular-nums`}>{formatDate(invoice.issueDate)}</td>
                <td className={tableStyles.td}>{invoice.customer.name}</td>
                <td className={`${tableStyles.td} whitespace-nowrap`}>{invoice.assignee.name}</td>
                <td className={`${tableStyles.td} whitespace-nowrap tabular-nums ${overdue ? "font-bold text-red-700" : ""}`}>{formatDate(invoice.dueDate)}</td>
                <td className={tableStyles.td}>
                  <PaymentBadge paidDate={invoice.paidDate} dueDate={invoice.dueDate} today={today} />
                  {invoice.paidDate ? <span className="ml-2 text-sm whitespace-nowrap text-slate-600 tabular-nums">{formatDate(invoice.paidDate)}</span> : null}
                </td>
                <td className={`${tableStyles.tdNum} ${overdue ? "font-bold text-red-700" : ""}`}>{formatYen(invoice.total)}</td>
                <td className={`${tableStyles.td} text-right`}>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="inline-flex min-h-10 items-center rounded-lg border-2 border-blue-700 px-4 text-base font-bold whitespace-nowrap text-blue-800 hover:bg-blue-50"
                  >
                    開く
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
