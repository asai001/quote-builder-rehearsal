import { TAX_RATE_PERCENT } from "@/config/pricing";
import { formatNumber, formatYen } from "@/lib/format";

export type ItemRow = { id: string; name: string; quantity: number; unitPrice: number; amount: number };

function signed(value: number): string {
  return value < 0 ? `−${formatNumber(-value)}` : formatNumber(value);
}

/** 明細と金額の表（詳細画面用） */
export function ItemsTable({ items, subtotal, tax, total }: { items: ItemRow[]; subtotal: number; tax: number; total: number }) {
  const th = "border-b-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700";
  const td = "border-b border-slate-100 px-4 py-2";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-base">
        <thead>
          <tr>
            <th className={`${th} text-left`}>品名</th>
            <th className={`${th} text-right`}>数量</th>
            <th className={`${th} text-right`}>単価（円）</th>
            <th className={`${th} text-right`}>金額（円）</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className={td}>{item.name}</td>
              <td className={`${td} text-right tabular-nums`}>{item.quantity}</td>
              <td className={`${td} text-right tabular-nums ${item.unitPrice < 0 ? "text-red-700" : ""}`}>{signed(item.unitPrice)}</td>
              <td className={`${td} text-right tabular-nums ${item.amount < 0 ? "text-red-700" : ""}`}>{signed(item.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="px-4 pt-3 text-right text-slate-700">
              小計（税抜）
            </td>
            <td className="px-4 pt-3 text-right tabular-nums">{formatYen(subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="px-4 py-1 text-right text-slate-700">
              消費税（{TAX_RATE_PERCENT}%）
            </td>
            <td className="px-4 py-1 text-right tabular-nums">{formatYen(tax)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="px-4 py-2 text-right text-lg font-bold">
              合計（税込）
            </td>
            <td className="px-4 py-2 text-right text-2xl font-bold tabular-nums text-blue-900">{formatYen(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function InfoList({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-base">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-bold text-slate-600">{label}</dt>
          <dd className="text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
