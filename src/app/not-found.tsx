import Link from "next/link";
import { buttonStyles } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">ページが見つかりません</h1>
        <p className="mt-3 text-lg text-slate-700">データが見つからないか、見る権限がありません。</p>
        <Link href="/" className={`${buttonStyles.primary} mt-6`}>
          ホームに戻る
        </Link>
      </div>
    </main>
  );
}
