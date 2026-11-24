"use client";

import { useState, useTransition } from "react";
import { changeQuoteStatus, convertQuoteToInvoice } from "@/lib/actions/quotes";
import type { ActionResult } from "@/lib/actions/result";
import { buttonStyles } from "@/components/ui";
import type { QuoteStatus } from "@/generated/prisma/enums";

/** 見積の状態を変えるボタン（提出済み・受注・失注・請求書に変換） */
export function QuoteActions({ quoteId, status }: { quoteId: string; status: QuoteStatus }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setResult(null);
    startTransition(async () => {
      const response = await action();
      if (response) setResult(response);
    });
  }

  const change = (next: "SUBMITTED" | "ORDERED" | "LOST", confirmText?: string) => run(() => changeQuoteStatus(quoteId, next), confirmText);

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {status === "DRAFT" ? (
          <button type="button" disabled={pending} className={buttonStyles.primary} onClick={() => change("SUBMITTED")}>
            お客様に提出した（提出済みにする）
          </button>
        ) : null}
        {status === "SUBMITTED" ? (
          <>
            <button type="button" disabled={pending} className={buttonStyles.primary} onClick={() => change("ORDERED")}>
              注文をいただいた（受注にする）
            </button>
            <button
              type="button"
              disabled={pending}
              className={buttonStyles.danger}
              onClick={() => change("LOST", "この見積を「失注」にします。よろしいですか？")}
            >
              お断りされた（失注にする）
            </button>
          </>
        ) : null}
        {status === "ORDERED" ? (
          <>
            <button
              type="button"
              disabled={pending}
              className={`${buttonStyles.primary} text-lg`}
              onClick={() =>
                run(() => convertQuoteToInvoice(quoteId), "この見積から請求書を作ります。\n作ったあとは、見積を編集できなくなります。よろしいですか？")
              }
            >
              請求書に変換
            </button>
            <button type="button" disabled={pending} className={buttonStyles.secondary} onClick={() => change("SUBMITTED")}>
              提出済みに戻す
            </button>
          </>
        ) : null}
        {status === "LOST" ? (
          <button type="button" disabled={pending} className={buttonStyles.secondary} onClick={() => change("SUBMITTED")}>
            提出済みに戻す
          </button>
        ) : null}
      </div>
      {pending ? <p className="mt-3 text-base text-slate-600">処理しています…</p> : null}
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
