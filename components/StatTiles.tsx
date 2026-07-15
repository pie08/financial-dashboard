import type { MonthComparison } from "@/lib/types";
import { money, pctChange } from "@/lib/format";

function Delta({
  current,
  previous,
  upIsGood,
  vsLabel,
}: {
  current: number;
  previous: number;
  upIsGood: boolean;
  vsLabel: string;
}) {
  const pct = pctChange(current, previous);
  if (pct === null) {
    return <p className="mt-1 text-xs text-muted">no activity in {vsLabel}</p>;
  }
  const up = pct >= 0;
  const good = up === upIsGood;
  const arrow = up ? "▲" : "▼";
  return (
    <p className="mt-1 text-xs">
      <span className={good ? "text-good" : "text-bad"}>
        {arrow} {Math.abs(pct).toFixed(1)}%
      </span>{" "}
      <span className="text-muted">vs {vsLabel}</span>
    </p>
  );
}

/** Month-over-month comparison: revenue, expenses, net profit. */
export default function StatTiles({ comparison }: { comparison: MonthComparison }) {
  const { current, previous } = comparison;
  const tiles = [
    {
      label: `Revenue · ${current.label}`,
      value: current.revenue,
      prev: previous.revenue,
      upIsGood: true,
    },
    {
      label: `Expenses · ${current.label}`,
      value: current.expenses,
      prev: previous.expenses,
      upIsGood: false,
    },
    {
      label: `Net profit · ${current.label}`,
      value: current.net,
      prev: previous.net,
      upIsGood: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-hairline bg-surface p-4">
          <p className="text-xs text-muted">{t.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${t.value < 0 ? "text-bad" : "text-ink"}`}>
            {money(t.value)}
          </p>
          <Delta
            current={t.value}
            previous={t.prev}
            upIsGood={t.upIsGood}
            vsLabel={previous.label}
          />
        </div>
      ))}
    </div>
  );
}
