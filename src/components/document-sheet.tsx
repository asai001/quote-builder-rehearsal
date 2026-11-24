import { COMPANY } from "@/config/company";
import { TAX_RATE_PERCENT } from "@/config/pricing";
import { formatDateJa } from "@/lib/dates";
import { formatNumber } from "@/lib/format";

export type DocumentSheetProps = {
  kind: "quote" | "invoice";
  number: string;
  issueDate: Date;
  /** 見積書：有効期限 ／ 請求書：お支払期限 */
  limitDate: Date;
  customer: { name: string; address: string };
  assigneeName: string;
  items: { id: string; name: string; quantity: number; unitPrice: number; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  note?: string;
};

/** 会社あては「御中」、個人あては「様」 */
function honorific(name: string): string {
  return /(株式会社|有限会社|合同会社|合資会社|法人|（株）|\(株\)|（有）|\(有\))/.test(name) ? "御中" : "様";
}

function signed(value: number): string {
  return value < 0 ? `−${formatNumber(-value)}` : formatNumber(value);
}

/** 見積書・請求書の印刷用の紙面（A4） */
export function DocumentSheet(props: DocumentSheetProps) {
  const isInvoice = props.kind === "invoice";
  const title = isInvoice ? "御請求書" : "御見積書";
  const cell = "border border-slate-500 px-[3mm] py-[1.8mm]";
  const head = `${cell} bg-slate-100 font-bold`;

  return (
    <article className="mx-auto my-6 min-h-[297mm] w-[210mm] bg-white p-[14mm] text-[10.5pt] leading-relaxed text-black shadow-lg print:m-0 print:min-h-0 print:w-auto print:p-0 print:shadow-none">
      <h1 className="mb-[8mm] text-center text-[22pt] font-bold tracking-[0.5em]">{title}</h1>

      <div className="flex justify-between gap-[8mm]">
        <div className="flex-1">
          <p className="border-b-2 border-black pb-[1mm] text-[15pt] font-bold">
            {props.customer.name} {honorific(props.customer.name)}
          </p>
          <p className="mt-[2mm]">{props.customer.address}</p>
          <p className="mt-[6mm]">{isInvoice ? "下記のとおりご請求申し上げます。" : "下記のとおりお見積り申し上げます。"}</p>
          <div className="mt-[4mm] flex items-baseline justify-between border-b-4 border-double border-black px-[2mm] pb-[1mm]">
            <span className="text-[12pt] font-bold">{isInvoice ? "ご請求金額（税込）" : "お見積金額（税込）"}</span>
            <span className="text-[20pt] font-bold tabular-nums">¥{formatNumber(props.total)}−</span>
          </div>
          <table className="mt-[4mm] border-collapse">
            <tbody>
              <tr>
                <th className="pr-[4mm] text-left font-bold">{isInvoice ? "お支払期限" : "有効期限"}</th>
                <td>{formatDateJa(props.limitDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="w-[72mm] text-[9.5pt]">
          <table className="mb-[4mm] w-full border-collapse">
            <tbody>
              <tr>
                <th className="pr-[3mm] text-left font-bold whitespace-nowrap">{isInvoice ? "請求番号" : "見積番号"}</th>
                <td className="text-right tabular-nums">{props.number}</td>
              </tr>
              <tr>
                <th className="pr-[3mm] text-left font-bold whitespace-nowrap">発行日</th>
                <td className="text-right">{formatDateJa(props.issueDate)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[12pt] font-bold">{COMPANY.name}</p>
          <p>{COMPANY.postalCode}</p>
          <p>{COMPANY.address}</p>
          <p>電話：{COMPANY.tel}</p>
          <p>メール：{COMPANY.email}</p>
          {isInvoice ? <p>登録番号：{COMPANY.invoiceRegistrationNumber}</p> : null}
          <p>担当：{props.assigneeName}</p>
        </div>
      </div>

      <table className="mt-[8mm] w-full border-collapse">
        <thead>
          <tr>
            <th className={`${head} text-left`}>品名</th>
            <th className={`${head} w-[18mm] text-right`}>数量</th>
            <th className={`${head} w-[30mm] text-right`}>単価（円）</th>
            <th className={`${head} w-[34mm] text-right`}>金額（円）</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.id} className="break-inside-avoid">
              <td className={cell}>{item.name}</td>
              <td className={`${cell} text-right tabular-nums`}>{item.quantity}</td>
              <td className={`${cell} text-right tabular-nums`}>{signed(item.unitPrice)}</td>
              <td className={`${cell} text-right tabular-nums`}>{signed(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-[4mm] flex justify-end break-inside-avoid">
        <table className="w-[82mm] border-collapse">
          <tbody>
            <tr>
              <th className={`${head} text-left`}>小計（税抜・{TAX_RATE_PERCENT}%対象）</th>
              <td className={`${cell} w-[34mm] text-right tabular-nums`}>{formatNumber(props.subtotal)}</td>
            </tr>
            <tr>
              <th className={`${head} text-left`}>消費税（{TAX_RATE_PERCENT}%）</th>
              <td className={`${cell} text-right tabular-nums`}>{formatNumber(props.tax)}</td>
            </tr>
            <tr>
              <th className={`${head} text-left text-[12pt]`}>合計（税込）</th>
              <td className={`${cell} text-right text-[12pt] font-bold tabular-nums`}>{formatNumber(props.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {isInvoice ? (
        <section className="mt-[8mm] break-inside-avoid border border-slate-500 p-[3mm]">
          <h2 className="font-bold">お振込先</h2>
          <p>{COMPANY.bankAccount}</p>
          <p className="text-[9pt]">※ 恐れ入りますが、振込手数料はお客様にてご負担ください。</p>
        </section>
      ) : null}

      {props.note ? (
        <section className="mt-[6mm] break-inside-avoid border border-slate-500 p-[3mm]">
          <h2 className="font-bold">備考</h2>
          <p className="whitespace-pre-wrap">{props.note}</p>
        </section>
      ) : null}
    </article>
  );
}
