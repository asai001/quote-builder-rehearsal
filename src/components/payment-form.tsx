"use client";

import { useId, useState, useTransition } from "react";
import { cancelPayment, registerPayment } from "@/lib/actions/invoices";
import type { ActionResult } from "@/lib/actions/result";
import { buttonStyles, inputStyles, labelStyles } from "@/components/ui";

/** 入金日の登録（管理者だけに表示する） */
export function PaymentForm({ invoiceId, paid, today, minDate }: { invoiceId: string; paid: boolean; today: string; minDate: string }) {
  const uid = useId();
  const [paidDate, setPaidDate] = useState(today);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    setResult(null);
    startTransition(async () => {
      const response = await action();
      if (response) setResult(response);
    });
  }

  return (
    <div>
      {paid ? (
        <button
          type="button"
          disabled={pending}
          className={buttonStyles.danger}
          onClick={() => {
            if (window.confirm("入金の登録を取り消して、未入金に戻します。よろしいですか？")) run(() => cancelPayment(invoiceId));
          }}
        >
          入金の登録を取り消す
        </button>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`${uid}-paid-date`} className={labelStyles}>
              入金日
            </label>
            <input
              id={`${uid}-paid-date`}
              type="date"
              value={paidDate}
              min={minDate}
              max={today}
              onChange={(e) => setPaidDate(e.target.value)}
              className={`${inputStyles} w-52`}
            />
          </div>
          <button type="button" disabled={pending} className={buttonStyles.primary} onClick={() => run(() => registerPayment(invoiceId, paidDate))}>
            {pending ? "登録しています…" : "入金を登録する"}
          </button>
        </div>
      )}
      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={`mt-3 rounded-lg border-2 p-3 text-base font-bold ${
            result.ok ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
