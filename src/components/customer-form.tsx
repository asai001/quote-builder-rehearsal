"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { AREA_LABELS, type Area } from "@/config/pricing";
import { saveCustomer } from "@/lib/actions/customers";
import { buttonStyles, inputStyles, labelStyles } from "@/components/ui";

type Initial = { id?: string; name: string; phone: string; address: string; area: Area };

export function CustomerForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState(saveCustomer, null);
  const uid = useId();

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div>
        <label htmlFor={`${uid}-name`} className={labelStyles}>
          お客様名（個人名または会社名）
        </label>
        <input id={`${uid}-name`} name="name" defaultValue={initial.name} required maxLength={100} className={inputStyles} />
      </div>
      <div>
        <label htmlFor={`${uid}-phone`} className={labelStyles}>
          電話番号
        </label>
        <input
          id={`${uid}-phone`}
          name="phone"
          type="tel"
          defaultValue={initial.phone}
          required
          maxLength={20}
          placeholder="例：058-123-4567"
          className={inputStyles}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-address`} className={labelStyles}>
          住所
        </label>
        <input id={`${uid}-address`} name="address" defaultValue={initial.address} required maxLength={200} className={inputStyles} />
      </div>
      <fieldset>
        <legend className={labelStyles}>市内か市外か（出張費の計算に使います）</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["IN_CITY", "OUT_OF_CITY"] as const).map((area) => (
            <label
              key={area}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-2 border-slate-300 bg-white px-4 text-lg font-bold has-checked:border-blue-700 has-checked:bg-blue-50"
            >
              <input type="radio" name="area" value={area} defaultChecked={initial.area === area} required className="h-5 w-5 accent-blue-700" />
              {AREA_LABELS[area]}
            </label>
          ))}
        </div>
      </fieldset>
      {state && !state.ok ? (
        <p role="alert" className="rounded-lg border-2 border-red-300 bg-red-50 p-3 text-base font-bold text-red-800">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={`${buttonStyles.primary} text-lg`}>
          {pending ? "保存しています…" : "保存する"}
        </button>
        <Link href="/customers" className={buttonStyles.secondary}>
          保存せずに戻る
        </Link>
      </div>
    </form>
  );
}
