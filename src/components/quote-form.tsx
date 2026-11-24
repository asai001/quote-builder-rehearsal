"use client";

import { useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AC_TYPES,
  AREA_LABELS,
  MAX_COUNT_PER_ITEM,
  MULTI_UNIT_DISCOUNT,
  OPTIONS,
  TAX_RATE_PERCENT,
  TRAVEL_FEES,
  calculateQuote,
  validateSelection,
  type Area,
  type CountCode,
  type Counts,
} from "@/config/pricing";
import { QUOTE_VALID_DAYS } from "@/config/company";
import { saveQuote } from "@/lib/actions/quotes";
import { addDays, parseDateString, toDateString } from "@/lib/dates";
import { formatYen } from "@/lib/format";
import { buttonStyles, inputStyles, labelStyles } from "@/components/ui";

export type CustomerOption = { id: string; name: string; phone: string; address: string; area: Area };

export type QuoteFormProps = {
  quoteId?: string;
  customers: CustomerOption[];
  /** 担当者の候補。管理者のときだけ渡す（社員は自分で固定） */
  assignees: { id: string; name: string }[] | null;
  currentUserName: string;
  initial: {
    customerId: string | null;
    area: Area;
    counts: Counts;
    assigneeId: string;
    issueDate: string;
    validUntil: string;
    note: string;
  };
};

const AREAS: Area[] = ["IN_CITY", "OUT_OF_CITY"];

/** 電話番号をハイフンなどを除いた数字だけにする（探しやすくするため） */
function digits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function StepTitle({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-slate-900">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-lg text-white">{step}</span>
      {children}
    </h2>
  );
}

function AreaChoice({ name, value, onChange, legend }: { name: string; value: Area; onChange: (area: Area) => void; legend: string }) {
  return (
    <fieldset>
      <legend className={labelStyles}>{legend}</legend>
      <div className="grid grid-cols-2 gap-3">
        {AREAS.map((area) => {
          const fee = TRAVEL_FEES[area].unitPrice;
          const checked = value === area;
          return (
            <label
              key={area}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-2 text-lg font-bold ${
                checked ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              <input type="radio" name={name} value={area} checked={checked} onChange={() => onChange(area)} className="h-5 w-5 accent-blue-700" />
              <span>
                {AREA_LABELS[area]}
                <span className="ml-2 text-sm font-normal text-slate-600">出張費 {formatYen(fee)}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function CountRow({
  name,
  unitPrice,
  value,
  max,
  onChange,
}: {
  name: string;
  unitPrice: number;
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const stepButton =
    "flex h-14 w-14 items-center justify-center rounded-lg border-2 border-blue-700 bg-white text-3xl font-bold leading-none text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-300 disabled:hover:bg-white";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0 sm:flex-nowrap">
      <div className="min-w-40 flex-1">
        <p className="text-lg font-bold text-slate-900">{name}</p>
        <p className="text-base text-slate-600">1台 {formatYen(unitPrice)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" className={stepButton} onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label={`${name}を1台減らす`}>
          −
        </button>
        <p className="w-18 text-center text-3xl font-bold tabular-nums" aria-live="polite">
          {value}
          <span className="ml-1 text-base font-normal text-slate-600">台</span>
        </p>
        <button type="button" className={stepButton} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`${name}を1台増やす`}>
          ＋
        </button>
      </div>
      <p className="w-28 shrink-0 text-right text-lg font-bold tabular-nums text-slate-900">{formatYen(unitPrice * value)}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong = false, minus = false }: { label: string; value: number; strong?: boolean; minus?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? "text-lg font-bold" : "text-base"}`}>
      <dt className="text-slate-700">{label}</dt>
      <dd className={`tabular-nums ${minus && value > 0 ? "text-red-700" : "text-slate-900"}`}>
        {minus && value > 0 ? "−" : ""}
        {formatYen(value)}
      </dd>
    </div>
  );
}

export function QuoteForm({ quoteId, customers, assignees, currentUserName, initial }: QuoteFormProps) {
  const isEdit = Boolean(quoteId);
  // 画面内で重複しない id（ラベルと入力欄を結び付けるため）
  const uid = useId();

  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState<string | null>(initial.customerId);
  const [search, setSearch] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "", area: "IN_CITY" as Area });

  const [area, setArea] = useState<Area>(initial.area);
  const [counts, setCounts] = useState<Counts>(initial.counts);
  const [assigneeId, setAssigneeId] = useState(initial.assigneeId);
  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [validUntil, setValidUntil] = useState(initial.validUntil);
  const [note, setNote] = useState(initial.note);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    const qDigits = digits(q);
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q) || (qDigits.length > 0 && digits(c.phone).includes(qDigits)),
    );
  }, [customers, search]);

  // 入力するたびに、料金表から内訳を計算し直す
  const calc = useMemo(() => calculateQuote({ area, counts }), [area, counts]);

  function chooseCustomer(customer: CustomerOption) {
    setCustomerId(customer.id);
    setArea(customer.area); // お客様を選ぶと、訪問先の市内・市外が自動で入る
    setSearch("");
  }

  function changeCount(code: CountCode, next: number) {
    setCounts((prev) => {
      const updated: Counts = { ...prev, [code]: Math.min(MAX_COUNT_PER_ITEM, Math.max(0, next)) };
      // オプションは、エアコンの合計台数までに自動でそろえる
      const acCount = AC_TYPES.reduce((sum, ac) => sum + (updated[ac.code] ?? 0), 0);
      for (const option of OPTIONS) {
        if ((updated[option.code] ?? 0) > acCount) updated[option.code] = acCount;
      }
      return updated;
    });
  }

  function changeIssueDate(value: string) {
    setIssueDate(value);
    const date = parseDateString(value);
    if (date) setValidUntil(toDateString(addDays(date, QUOTE_VALID_DAYS)));
  }

  function submit() {
    setError(null);
    if (customerMode === "existing" && !customerId) {
      setError("お客様を選んでください。");
      return;
    }
    if (customerMode === "new" && (!newCustomer.name.trim() || !newCustomer.phone.trim() || !newCustomer.address.trim())) {
      setError("新しいお客様の名前・電話番号・住所を入力してください。");
      return;
    }
    const selectionError = validateSelection({ area, counts });
    if (selectionError) {
      setError(selectionError);
      return;
    }
    startTransition(async () => {
      const result = await saveQuote({
        id: quoteId,
        customer: customerMode === "existing" ? { mode: "existing", id: customerId ?? "" } : { mode: "new", ...newCustomer },
        area,
        counts: counts as Record<string, number>,
        assigneeId: assignees ? assigneeId : undefined,
        issueDate,
        validUntil,
        note,
      });
      if (result && !result.ok) setError(result.message);
    });
  }

  const cardClass = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
  const modeButton = (active: boolean) =>
    `min-h-12 flex-1 rounded-md px-4 text-base font-bold ${active ? "bg-blue-700 text-white shadow" : "text-slate-700 hover:bg-white"}`;

  return (
    <div className="grid items-start gap-6 min-[1000px]:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        {/* 1. お客様 */}
        <section className={cardClass}>
          <StepTitle step={1}>お客様</StepTitle>
          <div className="mb-4 flex rounded-lg border-2 border-slate-300 bg-slate-100 p-1">
            <button
              type="button"
              className={modeButton(customerMode === "existing")}
              aria-pressed={customerMode === "existing"}
              onClick={() => setCustomerMode("existing")}
            >
              一覧から選ぶ
            </button>
            <button
              type="button"
              className={modeButton(customerMode === "new")}
              aria-pressed={customerMode === "new"}
              onClick={() => {
                setCustomerMode("new");
                setArea(newCustomer.area);
              }}
            >
              新しいお客様を入力する
            </button>
          </div>

          {customerMode === "existing" ? (
            selectedCustomer ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-blue-700 bg-blue-50 p-4">
                <div>
                  <p className="text-xl font-bold text-slate-900">{selectedCustomer.name}</p>
                  <p className="text-base text-slate-700">
                    {selectedCustomer.phone}　{selectedCustomer.address}（{AREA_LABELS[selectedCustomer.area]}）
                  </p>
                </div>
                <button type="button" className={buttonStyles.secondary} onClick={() => setCustomerId(null)}>
                  選び直す
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor={`${uid}-customer-search`} className={labelStyles}>
                  名前・電話番号・住所で探す
                </label>
                <input
                  id={`${uid}-customer-search`}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="例：山田　／　090-1234"
                  className={inputStyles}
                  autoComplete="off"
                />
                <ul className="mt-3 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-300">
                  {matches.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => chooseCustomer(customer)}
                        className="flex w-full flex-wrap items-baseline gap-x-4 px-4 py-3 text-left hover:bg-blue-50 focus-visible:bg-blue-50"
                      >
                        <span className="text-lg font-bold text-slate-900">{customer.name}</span>
                        <span className="text-base text-slate-600">
                          {customer.phone}　{customer.address}（{AREA_LABELS[customer.area]}）
                        </span>
                      </button>
                    </li>
                  ))}
                  {matches.length === 0 ? (
                    <li className="px-4 py-6 text-center text-base text-slate-600">見つかりません。「新しいお客様を入力する」を押して登録できます。</li>
                  ) : null}
                </ul>
              </div>
            )
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-new-name`} className={labelStyles}>
                  お客様名（個人名または会社名）
                </label>
                <input
                  id={`${uid}-new-name`}
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className={inputStyles}
                  maxLength={100}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-new-phone`} className={labelStyles}>
                  電話番号
                </label>
                <input
                  id={`${uid}-new-phone`}
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className={inputStyles}
                  maxLength={20}
                  placeholder="例：058-123-4567"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor={`${uid}-new-address`} className={labelStyles}>
                  住所
                </label>
                <input
                  id={`${uid}-new-address`}
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className={inputStyles}
                  maxLength={200}
                />
              </div>
              <div className="md:col-span-2">
                <AreaChoice
                  name={`${uid}-new-customer-area`}
                  legend="お客様の住所は市内ですか、市外ですか"
                  value={newCustomer.area}
                  onChange={(next) => {
                    setNewCustomer({ ...newCustomer, area: next });
                    setArea(next);
                  }}
                />
              </div>
            </div>
          )}
        </section>

        {/* 2. 訪問先 */}
        <section className={cardClass}>
          <StepTitle step={2}>訪問先</StepTitle>
          <AreaChoice
            name={`${uid}-visit-area`}
            legend="訪問先は市内ですか、市外ですか（お客様を選ぶと自動で入ります。変更もできます）"
            value={area}
            onChange={setArea}
          />
        </section>

        {/* 3. エアコン */}
        <section className={cardClass}>
          <StepTitle step={3}>エアコンの種類と台数</StepTitle>
          {AC_TYPES.map((ac) => (
            <CountRow
              key={ac.code}
              name={ac.name}
              unitPrice={ac.unitPrice}
              value={counts[ac.code] ?? 0}
              max={MAX_COUNT_PER_ITEM}
              onChange={(next) => changeCount(ac.code, next)}
            />
          ))}
          <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-base text-amber-900">
            合計{MULTI_UNIT_DISCOUNT.fromUnit}台以上のときは、{MULTI_UNIT_DISCOUNT.fromUnit}台目以降が1台につき{formatYen(MULTI_UNIT_DISCOUNT.amountPerUnit)}
            引きになります（自動で計算されます）。
          </p>
        </section>

        {/* 4. オプション */}
        <section className={cardClass}>
          <StepTitle step={4}>オプション</StepTitle>
          {OPTIONS.map((option) => (
            <CountRow
              key={option.code}
              name={option.name}
              unitPrice={option.unitPrice}
              value={counts[option.code] ?? 0}
              max={Math.min(MAX_COUNT_PER_ITEM, calc.acCount)}
              onChange={(next) => changeCount(option.code, next)}
            />
          ))}
          <p className="mt-3 text-base text-slate-600">オプションは、エアコンの合計台数（いま {calc.acCount}台）まで選べます。</p>
        </section>

        {/* 5. そのほか */}
        <section className={cardClass}>
          <StepTitle step={5}>担当者・日付・備考</StepTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor={`${uid}-assignee`} className={labelStyles}>
                担当者
              </label>
              {assignees ? (
                <select id={`${uid}-assignee`} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputStyles}>
                  {assignees.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p id={`${uid}-assignee`} className="flex min-h-12 items-center rounded-lg bg-slate-100 px-3 text-base font-bold text-slate-800">
                  {currentUserName}
                </p>
              )}
            </div>
            <div>
              <label htmlFor={`${uid}-issue-date`} className={labelStyles}>
                発行日
              </label>
              <input id={`${uid}-issue-date`} type="date" value={issueDate} onChange={(e) => changeIssueDate(e.target.value)} className={inputStyles} />
            </div>
            <div>
              <label htmlFor={`${uid}-valid-until`} className={labelStyles}>
                有効期限
              </label>
              <input
                id={`${uid}-valid-until`}
                type="date"
                value={validUntil}
                min={issueDate}
                onChange={(e) => setValidUntil(e.target.value)}
                className={inputStyles}
              />
            </div>
            <div className="md:col-span-3">
              <label htmlFor={`${uid}-note`} className={labelStyles}>
                備考（見積書に印刷されます。空欄でもかまいません）
              </label>
              <textarea
                id={`${uid}-note`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={1000}
                className={`${inputStyles} py-2`}
                placeholder="例：駐車場あり。作業は午前中を希望。"
              />
            </div>
          </div>
        </section>
      </div>

      {/* 内訳（入力するたびにすぐ変わる） */}
      <aside className="rounded-xl border-2 border-blue-700 bg-white p-5 shadow-md min-[1000px]:sticky min-[1000px]:top-4" aria-label="見積の内訳">
        <h2 className="mb-3 text-xl font-bold text-slate-900">見積の内訳</h2>
        {calc.acCount === 0 ? (
          <p className="mb-3 rounded-lg bg-slate-100 px-4 py-3 text-base text-slate-700">エアコンの台数を入れると、ここに金額が出ます。</p>
        ) : (
          <ul className="mb-3 space-y-1 border-b border-slate-200 pb-3 text-base">
            {calc.items.map((item) => (
              <li key={item.code} className="flex items-baseline justify-between gap-3">
                <span className="text-slate-800">
                  {item.name}
                  {item.code.startsWith("TRAVEL") ? "" : ` × ${item.quantity}台`}
                </span>
                <span className={`whitespace-nowrap tabular-nums ${item.amount < 0 ? "text-red-700" : "text-slate-900"}`}>
                  {item.amount < 0 ? `−${formatYen(-item.amount)}` : formatYen(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <dl>
          <SummaryRow label={`本体（${calc.acCount}台）`} value={calc.acTotal} />
          <SummaryRow label="オプション" value={calc.optionTotal} />
          <SummaryRow label={`出張費（${AREA_LABELS[area]}）`} value={calc.travelFee} />
          <SummaryRow label="割引" value={calc.discount} minus />
          <div className="mt-2 border-t border-slate-200 pt-2">
            <SummaryRow label="小計（税抜）" value={calc.subtotal} strong />
            <SummaryRow label={`消費税（${TAX_RATE_PERCENT}%）`} value={calc.tax} />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-slate-900 pt-3">
            <dt className="text-xl font-bold text-slate-900">合計（税込）</dt>
            <dd className="text-4xl font-bold tabular-nums text-blue-900" aria-live="polite">
              {formatYen(calc.total)}
            </dd>
          </div>
        </dl>

        {error ? (
          <p role="alert" className="mt-4 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-base font-bold text-red-800">
            {error}
          </p>
        ) : null}

        <button type="button" onClick={submit} disabled={pending} className={`${buttonStyles.primary} mt-4 w-full text-lg`}>
          {pending ? "保存しています…" : isEdit ? "変更を保存する" : "この内容で見積書を保存する"}
        </button>
        <Link href={quoteId ? `/quotes/${quoteId}` : "/quotes"} className={`${buttonStyles.secondary} mt-3 w-full`}>
          保存せずに戻る
        </Link>
      </aside>
    </div>
  );
}
