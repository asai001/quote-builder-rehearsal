"use client";

import Link from "next/link";
import { buttonStyles } from "@/components/ui";

/** 印刷用画面の上に出す操作ボタン（印刷される紙には出ない） */
export function PrintToolbar({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-center gap-4 border-b border-slate-300 bg-white p-4 shadow-sm print:hidden">
      <Link href={backHref} className={buttonStyles.secondary}>
        ← {backLabel}
      </Link>
      <button type="button" onClick={() => window.print()} className={`${buttonStyles.primary} text-lg`}>
        印刷する
      </button>
      <p className="w-full text-center text-base text-slate-600">
        PDFにしたいときは、「印刷する」を押したあと、プリンターの選択で「PDFに保存」を選んでください。
      </p>
    </div>
  );
}
