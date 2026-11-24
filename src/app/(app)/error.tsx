"use client";

import { buttonStyles } from "@/components/ui";

export default function AppError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="rounded-xl border-2 border-red-300 bg-red-50 p-8 text-center">
      <h1 className="text-2xl font-bold text-red-900">うまく表示できませんでした</h1>
      <p className="mt-3 text-lg text-red-900">少し待ってから、下のボタンを押してもう一度お試しください。</p>
      <button type="button" onClick={() => retry()} className={`${buttonStyles.primary} mt-6`}>
        もう一度試す
      </button>
    </div>
  );
}
