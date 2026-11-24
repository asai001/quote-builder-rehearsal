import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Card, Loading, PageHeader, buttonStyles } from "@/components/ui";
import { EmployeeSalesChart, MonthlySalesChart } from "@/components/charts";
import { getDashboard } from "@/lib/data/dashboard";
import { isAdmin, requireUser } from "@/lib/session";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "ホーム" };

function StatTile({
  label,
  value,
  unit,
  note,
  alert = false,
  href,
}: {
  label: string;
  value: string;
  unit: string;
  note: string;
  alert?: boolean;
  href?: string;
}) {
  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${alert ? "border-red-300" : "border-slate-200"}`}>
      <p className="text-base font-bold text-slate-700">{label}</p>
      <p className={`mt-2 text-4xl font-bold tabular-nums ${alert ? "text-red-700" : "text-slate-900"}`}>
        {value}
        <span className="ml-1 text-xl">{unit}</span>
      </p>
      <p className="mt-2 text-sm text-slate-600">{note}</p>
      {href ? (
        <Link href={href} className="mt-2 inline-block text-base font-bold text-blue-800 underline">
          一覧を見る
        </Link>
      ) : null}
    </div>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const data = await getDashboard(user);
  const admin = isAdmin(user);
  const scopeNote = admin ? "会社全体" : `${user.name}さんの担当分`;

  return (
    <div className="space-y-6">
      <p className="text-base text-slate-600">
        {admin ? "会社全体の数字を表示しています。" : "あなたが担当している分だけを表示しています。"}
        売上は、請求書の発行日をもとにした税抜の金額です。
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label={`今月の売上（${data.monthLabel}）`} value={formatNumber(data.monthSales)} unit="円" note={`${scopeNote}・税抜`} />
        <StatTile
          label="売掛金の残高（まだ入金されていない金額）"
          value={formatNumber(data.receivable)}
          unit="円"
          note={`${scopeNote}・税込`}
          href="/receivables"
        />
        <StatTile
          label="支払期限を過ぎた請求"
          value={formatNumber(data.overdueCount)}
          unit="件"
          note={data.overdueCount > 0 ? "お客様への確認をおすすめします" : "期限を過ぎた請求はありません"}
          alert={data.overdueCount > 0}
          href={data.overdueCount > 0 ? "/invoices?filter=overdue" : undefined}
        />
      </div>
      <Card title="月ごとの売上（直近12か月・税抜）">
        <MonthlySalesChart data={data.monthly} />
      </Card>
      {data.byEmployee ? (
        <Card title="社員ごとの売上（税抜）">
          <EmployeeSalesChart data={data.byEmployee} />
        </Card>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="ホーム（売上のまとめ）"
        actions={
          <Link href="/quotes/new" className={`${buttonStyles.primary} text-lg`}>
            ＋ 見積を作る
          </Link>
        }
      />
      <Suspense fallback={<Loading />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
