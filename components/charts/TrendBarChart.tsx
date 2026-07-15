"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BucketPoint } from "@/lib/types";
import { moneyCompact } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

/** Single-series bar chart over day/week/month buckets. */
export default function TrendBarChart({
  data,
  dataKey,
  name,
  color,
}: {
  data: BucketPoint[];
  dataKey: "revenue" | "spending";
  name: string;
  color: string;
}) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--ink-muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--baseline)" }}
            minTickGap={20}
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
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
          />
          <Bar
            dataKey={dataKey}
            name={name}
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
