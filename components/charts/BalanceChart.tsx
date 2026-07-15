"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BalancePoint } from "@/lib/types";
import { moneyCompact } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

export default function BalanceChart({ points }: { points: BalancePoint[] }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--ink-muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--baseline)" }}
            minTickGap={32}
            tickMargin={6}
          />
          <YAxis
            tickFormatter={(v: number) => moneyCompact(v)}
            tick={{ fontSize: 10, fill: "var(--ink-muted)" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke="var(--series-balance)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 4, fill: "var(--series-balance)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
