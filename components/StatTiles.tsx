import { money, pctChange } from "@/lib/format";
import type { PeriodComparison } from "@/lib/types";

function DeltaLine({
  text,
  good,
  vsLabel,
  fallback,
}: {
  text: string | null;
  good: boolean;
  vsLabel: string;
  fallback?: string;
}) {
  if (text === null) {
    return <p className="mt-1 text-xs text-muted">{fallback ?? `no activity in ${vsLabel}`}</p>;
  }
  return (
    <p className="mt-1 text-xs">
      <span className={good ? "text-good" : "text-bad"}>{text}</span>{" "}
      <span className="text-muted">vs {vsLabel}</span>
    </p>
  );
}

/**
 * KPI row for the selected period: revenue, expenses, net profit, and profit
 * margin, each compared against the equal-length previous period.
 */
export default function StatTiles({ comparison }: { comparison: PeriodComparison }) {
  const { current, previous } = comparison;

  const moneyDelta = (cur: number, prev: number, upIsGood: boolean) => {
    const pct = pctChange(cur, prev);
    if (pct === null) return { text: null, good: true };
    const up = pct >= 0;
    return {
      text: `${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%`,
      good: up === upIsGood,
    };
  };

  const marginDelta = () => {
    if (current.marginPct === null || !previous || previous.marginPct === null) {
      return { text: null, good: true };
    }
    const diff = current.marginPct - previous.marginPct;
    return {
      text: `${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(1)} pts`,
      good: diff >= 0,
    };
  };

  const tiles = [
    {
      label: "Revenue",
      value: money(current.revenue),
      negative: false,
      delta: previous ? moneyDelta(current.revenue, previous.revenue, true) : null,
    },
    {
      label: "Expenses",
      value: money(current.expenses),
      negative: false,
      delta: previous ? moneyDelta(current.expenses, previous.expenses, false) : null,
    },
    {
      label: "Net profit",
      value: money(current.net),
      negative: current.net < 0,
      delta: previous ? moneyDelta(current.net, previous.net, true) : null,
    },
    {
      label: "Profit margin",
      value: current.marginPct !== null ? `${current.marginPct.toFixed(1)}%` : "—",
      negative: current.marginPct !== null && current.marginPct < 0,
      delta: previous ? marginDelta() : null,
      fallback: "needs revenue in both periods",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="min-w-0 rounded-xl border border-hairline bg-surface p-4">
          <p className="text-xs text-muted">
            {t.label} · {current.label}
          </p>
          <p
            className={`mt-1 truncate text-xl font-semibold sm:text-2xl ${
              t.negative ? "text-bad" : "text-ink"
            }`}
          >
            {t.value}
          </p>
          {t.delta ? (
            <DeltaLine
              text={t.delta.text}
              good={t.delta.good}
              vsLabel={previous!.label}
              fallback={"fallback" in t ? (t.fallback as string) : undefined}
            />
          ) : (
            <p className="mt-1 text-xs text-muted">all data — nothing to compare</p>
          )}
        </div>
      ))}
    </div>
  );
}
