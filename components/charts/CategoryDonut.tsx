"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySlice } from "@/lib/types";
import { money, moneyCompact } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

const SLOT_COLORS = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
  "var(--cat-6)",
  "var(--cat-7)",
  "var(--cat-8)",
];

const MAX_SLICES = 8;

/**
 * Donut of spending by category. At most 8 colored slices; everything past
 * that folds into a muted "Other" slice so hues are never cycled.
 */
export default function CategoryDonut({ slices }: { slices: CategorySlice[] }) {
  const shown = slices.slice(0, MAX_SLICES);
  const rest = slices.slice(MAX_SLICES);
  const restTotal = rest.reduce((sum, s) => sum + s.total, 0);

  const data = shown.map((s, i) => ({
    category: s.category,
    total: s.total,
    color: SLOT_COLORS[i],
  }));
  if (restTotal > 0) {
    data.push({
      category: `Other (${rest.length} more)`,
      total: Math.round(restTotal * 100) / 100,
      color: "var(--cat-other)",
    });
  }

  const grandTotal = slices.reduce((sum, s) => sum + s.total, 0);

  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">No spending in this period.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius={58}
              outerRadius={88}
              stroke="var(--surface)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.category} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-ink">{moneyCompact(grandTotal)}</span>
          <span className="text-[11px] text-muted">total spent</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-xs">
        {data.map((d) => (
          <li key={d.category} className="flex items-center gap-2">
            <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="truncate text-ink-2">{d.category}</span>
            <span className="ml-auto pl-2 text-ink tabular-nums">{money(d.total)}</span>
            <span className="w-10 text-right text-muted tabular-nums">
              {grandTotal > 0 ? `${Math.round((d.total / grandTotal) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
