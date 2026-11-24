"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatYen } from "@/lib/format";

const SERIES_COLOR = "#2a78d6";
const GRID_COLOR = "#e2e8f0";
const AXIS_TEXT = { fill: "#475569", fontSize: 14 };

/** 軸の目盛り：万円単位（例：50万） */
function formatManYen(value: number): string {
  if (value === 0) return "0";
  const man = value / 10000;
  return `${Number.isInteger(man) ? man : man.toFixed(1)}万`;
}

/** きりのよい目盛り（0, 20万, 40万… のように）を作る */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 10000];
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let value = 0; value < max + step; value += step) ticks.push(Math.round(value));
  return ticks;
}

function SalesTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number | string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base shadow-md">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="font-bold text-slate-900 tabular-nums">{formatYen(Number(payload[0]?.value ?? 0))}</p>
    </div>
  );
}

function DataTable({ head, rows }: { head: [string, string]; rows: { key: string; label: string; value: number }[] }) {
  return (
    <details className="mt-3 text-base">
      <summary className="inline-block rounded px-1 font-bold text-blue-800 underline">数字を表で見る</summary>
      <table className="mt-2 w-full max-w-md border-collapse">
        <thead>
          <tr>
            <th className="border-b-2 border-slate-200 px-3 py-2 text-left text-sm text-slate-700">{head[0]}</th>
            <th className="border-b-2 border-slate-200 px-3 py-2 text-right text-sm text-slate-700">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="border-b border-slate-100 px-3 py-2">{row.label}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums">{formatYen(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** 直近12か月の月別売上（棒グラフ） */
export function MonthlySalesChart({ data }: { data: { month: string; label: string; sales: number }[] }) {
  const ticks = niceTicks(Math.max(...data.map((d) => d.sales)));
  return (
    <div>
      <div className="h-80 w-full" role="img" aria-label="直近12か月の月別売上の棒グラフ">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey="label" tick={AXIS_TEXT} tickLine={false} axisLine={{ stroke: "#94a3b8" }} interval={0} height={36} />
            <YAxis
              tick={AXIS_TEXT}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatManYen}
              width={56}
              ticks={ticks}
              domain={[0, ticks[ticks.length - 1]]}
            />
            <Tooltip content={<SalesTooltip />} cursor={{ fill: "#f1f5f9" }} />
            <Bar dataKey="sales" name="売上（税抜）" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable head={["月", "売上（税抜）"]} rows={data.map((d) => ({ key: d.month, label: d.label, value: d.sales }))} />
    </div>
  );
}

type Period = "month" | "year";

/** 社員別の売上（棒グラフ。今月／直近12か月を切り替え） */
export function EmployeeSalesChart({ data }: { data: { id: string; name: string; monthSales: number; yearSales: number }[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const rows = data.map((d) => ({ id: d.id, name: d.name, sales: period === "month" ? d.monthSales : d.yearSales })).sort((a, b) => b.sales - a.sales);
  const height = Math.max(160, rows.length * 52 + 40);
  const ticks = niceTicks(Math.max(...rows.map((r) => r.sales)));

  return (
    <div>
      <div role="group" aria-label="集計する期間" className="mb-4 inline-flex rounded-lg border-2 border-slate-300 bg-slate-100 p-1">
        {(
          [
            ["month", "今月"],
            ["year", "直近12か月"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={period === key}
            onClick={() => setPeriod(key)}
            className={`min-h-11 rounded-md px-5 text-base font-bold ${period === key ? "bg-blue-700 text-white shadow" : "text-slate-700 hover:bg-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ height }} className="w-full" role="img" aria-label="社員別の売上の棒グラフ">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 120, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
            <XAxis
              type="number"
              tick={AXIS_TEXT}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatManYen}
              ticks={ticks}
              domain={[0, ticks[ticks.length - 1]]}
            />
            <YAxis type="category" dataKey="name" tick={{ fill: "#0f172a", fontSize: 16 }} tickLine={false} axisLine={{ stroke: "#94a3b8" }} width={72} />
            <Tooltip content={<SalesTooltip />} cursor={{ fill: "#f1f5f9" }} />
            <Bar dataKey="sales" name="売上（税抜）" fill={SERIES_COLOR} radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={false}>
              <LabelList
                dataKey="sales"
                position="right"
                formatter={(value) => formatYen(Number(value ?? 0))}
                style={{ fill: "#0f172a", fontSize: 15, fontVariantNumeric: "tabular-nums" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        head={["社員", period === "month" ? "今月の売上（税抜）" : "直近12か月の売上（税抜）"]}
        rows={rows.map((r) => ({ key: r.id, label: r.name, value: r.sales }))}
      />
    </div>
  );
}
