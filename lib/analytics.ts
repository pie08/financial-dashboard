import { categoryKind } from "./categories";
import { addDays, MONTHS, shortLabel, weekStartOf } from "./dates";
import type { DateRange, Granularity, Period } from "./period";
import { filterByRange } from "./period";
import type {
  BalancePoint,
  BucketPoint,
  CategorySlice,
  PeriodComparison,
  PeriodStats,
  Transaction,
} from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function latestDate(txns: Transaction[]): string | null {
  let max: string | null = null;
  for (const t of txns) if (!max || t.date > max) max = t.date;
  return max;
}

export function earliestDate(txns: Transaction[]): string | null {
  let min: string | null = null;
  for (const t of txns) if (!min || t.date < min) min = t.date;
  return min;
}

/** Revenue, expenses, net, margin, and self-payments within a date range. */
export function periodStats(txns: Transaction[], range: DateRange): PeriodStats {
  let revenue = 0;
  let expenses = 0;
  let personalIn = 0;
  let personalOut = 0;
  for (const t of filterByRange(txns, range)) {
    const kind = categoryKind(t.category);
    if (kind === "income") revenue += t.amount;
    else if (kind === "expense") expenses += -t.amount;
    else if (t.amount > 0) personalIn += t.amount;
    else personalOut += -t.amount;
  }
  revenue = round2(revenue);
  expenses = round2(expenses);
  const net = round2(revenue - expenses);
  return {
    label: range.label,
    revenue,
    expenses,
    net,
    marginPct: revenue > 0 ? round2((net / revenue) * 100) : null,
    personalIn: round2(personalIn),
    personalOut: round2(personalOut),
  };
}

/** Current period vs the equal-length previous period (fair by construction). */
export function periodComparison(txns: Transaction[], period: Period): PeriodComparison {
  return {
    current: periodStats(txns, period.current),
    previous: period.previous ? periodStats(txns, period.previous) : null,
  };
}

function bucketKeyOf(date: string, granularity: Granularity): string {
  if (granularity === "day") return date;
  if (granularity === "week") return weekStartOf(date);
  return date.slice(0, 7);
}

function monthLabel(key: string, withYear: boolean): string {
  const [y, m] = key.split("-").map(Number);
  return withYear ? `${MONTHS[m - 1]} '${String(y).slice(2)}` : MONTHS[m - 1];
}

/**
 * Revenue/spending bars bucketed by day, week, or month over a range.
 * Buckets are zero-filled so quiet stretches stay visible.
 */
export function bucketedSeries(
  txns: Transaction[],
  range: DateRange,
  granularity: Granularity
): BucketPoint[] {
  const points = new Map<string, BucketPoint>();
  const crossYear = range.start.slice(0, 4) !== range.end.slice(0, 4);

  if (granularity === "month") {
    let [y, m] = range.start.split("-").map(Number);
    const endKey = range.end.slice(0, 7);
    for (;;) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      points.set(key, { key, label: monthLabel(key, crossYear), revenue: 0, spending: 0 });
      if (key === endKey) break;
      if (m === 12) {
        y += 1;
        m = 1;
      } else {
        m += 1;
      }
    }
  } else {
    const step = granularity === "week" ? 7 : 1;
    let cursor = granularity === "week" ? weekStartOf(range.start) : range.start;
    while (cursor <= range.end) {
      points.set(cursor, { key: cursor, label: shortLabel(cursor), revenue: 0, spending: 0 });
      cursor = addDays(cursor, step);
    }
  }

  for (const t of filterByRange(txns, range)) {
    const bucket = points.get(bucketKeyOf(t.date, granularity));
    if (!bucket) continue;
    const kind = categoryKind(t.category);
    if (kind === "income") bucket.revenue += t.amount;
    else if (kind === "expense") bucket.spending += -t.amount;
  }

  const out = [...points.values()];
  for (const p of out) {
    p.revenue = round2(p.revenue);
    p.spending = round2(p.spending);
  }
  return out;
}

/** Expense totals by category within a range, largest first. */
export function categoryBreakdown(txns: Transaction[], range: DateRange): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const t of filterByRange(txns, range)) {
    if (categoryKind(t.category) !== "expense") continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + -t.amount);
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total: round2(total) }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * End-of-day balance series. When the export includes a balance column we
 * anchor to the newest transaction's balance and walk daily net amounts
 * backwards, so intra-day row order never matters. Without one, it's a
 * running total from zero (relative). Computed over all transactions (an
 * anchor outside the visible range must still count); slice to the visible
 * range afterwards.
 */
export function balanceSeries(txns: Transaction[]): { points: BalancePoint[]; relative: boolean } {
  if (txns.length === 0) return { points: [], relative: false };

  const dailyNet = new Map<string, number>();
  for (const t of txns) {
    dailyNet.set(t.date, (dailyNet.get(t.date) ?? 0) + t.amount);
  }
  const days = [...dailyNet.keys()].sort();

  const anchorDate = latestDate(txns)!;
  const lastDayRows = txns.filter((t) => t.date === anchorDate && t.balance !== undefined);

  const points: BalancePoint[] = [];
  if (lastDayRows.length > 0) {
    // Bank exports list newest first, so the first stored row for the last
    // day carries the end-of-day balance.
    let running = lastDayRows[0].balance!;
    for (const day of [...days].reverse()) {
      points.unshift({ date: day, label: shortLabel(day), balance: round2(running) });
      running -= dailyNet.get(day)!;
    }
    return { points, relative: false };
  }

  let running = 0;
  for (const day of days) {
    running += dailyNet.get(day)!;
    points.push({ date: day, label: shortLabel(day), balance: round2(running) });
  }
  return { points, relative: true };
}
