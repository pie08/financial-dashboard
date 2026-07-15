import { categoryKind } from "./categories";
import type {
  BalancePoint,
  CategorySlice,
  MonthComparison,
  MonthStats,
  Transaction,
  WeekPoint,
} from "./types";

function toUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing the given ISO date. */
function weekStartOf(iso: string): string {
  const d = toUTC(iso);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return toISO(d);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortLabel(iso: string): string {
  const d = toUTC(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function latestDate(txns: Transaction[]): string | null {
  let max: string | null = null;
  for (const t of txns) if (!max || t.date > max) max = t.date;
  return max;
}

/**
 * Weekly revenue and spending for the `weeks` most recent weeks, anchored to
 * the newest transaction (not today — so an older export still fills the
 * charts). Internal transfers are excluded from both sides.
 */
export function weeklySeries(txns: Transaction[], weeks = 12): WeekPoint[] {
  const anchor = latestDate(txns);
  if (!anchor) return [];

  const lastWeek = weekStartOf(anchor);
  const points = new Map<string, WeekPoint>();
  const start = toUTC(lastWeek);
  start.setUTCDate(start.getUTCDate() - 7 * (weeks - 1));
  for (let i = 0; i < weeks; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + 7 * i);
    const iso = toISO(d);
    points.set(iso, { weekStart: iso, label: shortLabel(iso), revenue: 0, spending: 0 });
  }

  for (const t of txns) {
    const wk = points.get(weekStartOf(t.date));
    if (!wk) continue;
    const kind = categoryKind(t.category);
    if (kind === "income") wk.revenue += t.amount;
    else if (kind === "expense") wk.spending += -t.amount;
  }

  const out = [...points.values()];
  for (const p of out) {
    p.revenue = Math.round(p.revenue * 100) / 100;
    p.spending = Math.round(p.spending * 100) / 100;
  }
  return out;
}

/** Expense totals by category within the same window as the weekly charts. */
export function categoryBreakdown(txns: Transaction[], weeks = 12): CategorySlice[] {
  const anchor = latestDate(txns);
  if (!anchor) return [];
  const start = toUTC(weekStartOf(anchor));
  start.setUTCDate(start.getUTCDate() - 7 * (weeks - 1));
  const startISO = toISO(start);

  const totals = new Map<string, number>();
  for (const t of txns) {
    if (t.date < startISO) continue;
    if (categoryKind(t.category) !== "expense") continue;
    const spent = -t.amount;
    totals.set(t.category, (totals.get(t.category) ?? 0) + spent);
  }

  return [...totals.entries()]
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * End-of-day balance series. When the export includes a balance column we
 * anchor to the newest transaction's balance and walk daily net amounts
 * backwards, so intra-day row order never matters. Without one, it's a
 * running total from zero (relative).
 */
export function balanceSeries(txns: Transaction[]): { points: BalancePoint[]; relative: boolean } {
  if (txns.length === 0) return { points: [], relative: false };

  const dailyNet = new Map<string, number>();
  for (const t of txns) {
    dailyNet.set(t.date, (dailyNet.get(t.date) ?? 0) + t.amount);
  }
  const days = [...dailyNet.keys()].sort();

  const anchorDate = latestDate(txns)!;
  const anchorTxn = txns.find((t) => t.date === anchorDate && t.balance !== undefined);

  const points: BalancePoint[] = [];
  if (anchorTxn) {
    // anchorTxn.balance is the balance after *some* transaction on the last
    // day; the true end-of-day figure is one of that day's balances. Pick the
    // candidate consistent with the day's net: end-of-day balance B satisfies
    // B = balance_i + (sum of that day's amounts that came after row i), so
    // the max/min alone isn't reliable — instead take the balance whose value
    // appears with the full day's activity applied. In practice bank exports
    // list newest first, so the first row's balance for the last day is the
    // end-of-day balance; fall back to any row's balance otherwise.
    const lastDayRows = txns.filter((t) => t.date === anchorDate && t.balance !== undefined);
    const endBalance = lastDayRows[0]!.balance!;

    let running = endBalance;
    const reversed = [...days].reverse();
    for (const day of reversed) {
      points.unshift({ date: day, label: shortLabel(day), balance: Math.round(running * 100) / 100 });
      running -= dailyNet.get(day)!;
    }
    return { points, relative: false };
  }

  let running = 0;
  for (const day of days) {
    running += dailyNet.get(day)!;
    points.push({ date: day, label: shortLabel(day), balance: Math.round(running * 100) / 100 });
  }
  return { points, relative: true };
}

function monthStats(txns: Transaction[], yearMonth: string): MonthStats {
  const [y, m] = yearMonth.split("-").map(Number);
  let revenue = 0;
  let expenses = 0;
  for (const t of txns) {
    if (!t.date.startsWith(yearMonth)) continue;
    const kind = categoryKind(t.category);
    if (kind === "income") revenue += t.amount;
    else if (kind === "expense") expenses += -t.amount;
  }
  revenue = Math.round(revenue * 100) / 100;
  expenses = Math.round(expenses * 100) / 100;
  return {
    label: `${MONTHS[m - 1]} ${y}`,
    revenue,
    expenses,
    net: Math.round((revenue - expenses) * 100) / 100,
  };
}

/** This month vs last month, anchored to the newest transaction's month. */
export function monthComparison(txns: Transaction[]): MonthComparison | null {
  const anchor = latestDate(txns);
  if (!anchor) return null;
  const currentYM = anchor.slice(0, 7);
  const [y, m] = currentYM.split("-").map(Number);
  const prevYM = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  return {
    current: monthStats(txns, currentYM),
    previous: monthStats(txns, prevYM),
  };
}
