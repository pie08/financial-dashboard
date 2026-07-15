import { addDays, daysBetween, daysInMonth, rangeLabel, weekStartOf } from "./dates";
import type { Transaction } from "./types";

export type PeriodPreset =
  | "this-week"
  | "this-month"
  | "last-month"
  | "4-weeks"
  | "12-weeks"
  | "this-year"
  | "all";

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "this-week", label: "This week" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "4-weeks", label: "4 weeks" },
  { id: "12-weeks", label: "12 weeks" },
  { id: "this-year", label: "This year" },
  { id: "all", label: "All" },
];

export type Granularity = "day" | "week" | "month";

export interface DateRange {
  start: string;
  end: string;
  label: string;
}

export interface Period {
  preset: PeriodPreset;
  current: DateRange;
  /** Equal-length span immediately before `current`, so comparisons are fair.
   *  A partial month compares against the same day-span of the prior month. */
  previous: DateRange | null;
  granularity: Granularity;
}

function range(start: string, end: string): DateRange {
  return { start, end, label: rangeLabel(start, end) };
}

/**
 * Resolve a preset into concrete date ranges, anchored to the newest
 * transaction (so an older export still shows data, and a half-elapsed month
 * is only compared against the same slice of the month before).
 */
export function resolvePeriod(preset: PeriodPreset, anchor: string, earliest: string): Period {
  const [y, m, d] = anchor.split("-").map(Number);

  switch (preset) {
    case "this-week": {
      const start = weekStartOf(anchor);
      return {
        preset,
        current: range(start, anchor),
        previous: range(addDays(start, -7), addDays(anchor, -7)),
        granularity: "day",
      };
    }
    case "this-month": {
      const start = `${anchor.slice(0, 7)}-01`;
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      const prevDay = Math.min(d, daysInMonth(py, pm));
      const pmStr = String(pm).padStart(2, "0");
      return {
        preset,
        current: range(start, anchor),
        previous: range(`${py}-${pmStr}-01`, `${py}-${pmStr}-${String(prevDay).padStart(2, "0")}`),
        granularity: "day",
      };
    }
    case "last-month": {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      const ppy = pm === 1 ? py - 1 : py;
      const ppm = pm === 1 ? 12 : pm - 1;
      const pmStr = String(pm).padStart(2, "0");
      const ppmStr = String(ppm).padStart(2, "0");
      return {
        preset,
        current: range(`${py}-${pmStr}-01`, `${py}-${pmStr}-${String(daysInMonth(py, pm)).padStart(2, "0")}`),
        previous: range(`${ppy}-${ppmStr}-01`, `${ppy}-${ppmStr}-${String(daysInMonth(ppy, ppm)).padStart(2, "0")}`),
        granularity: "day",
      };
    }
    case "4-weeks":
      return {
        preset,
        current: range(addDays(anchor, -27), anchor),
        previous: range(addDays(anchor, -55), addDays(anchor, -28)),
        granularity: "week",
      };
    case "12-weeks":
      return {
        preset,
        current: range(addDays(anchor, -83), anchor),
        previous: range(addDays(anchor, -167), addDays(anchor, -84)),
        granularity: "week",
      };
    case "this-year": {
      // Same day-of-year span last year; Feb 29 falls back to Feb 28.
      let prevEnd = `${y - 1}${anchor.slice(4)}`;
      if (prevEnd.endsWith("02-29")) prevEnd = `${y - 1}-02-28`;
      return {
        preset,
        current: range(`${y}-01-01`, anchor),
        previous: range(`${y - 1}-01-01`, prevEnd),
        granularity: "month",
      };
    }
    case "all": {
      const span = daysBetween(earliest, anchor);
      return {
        preset,
        current: range(earliest, anchor),
        previous: null,
        granularity: span > 120 ? "month" : span > 21 ? "week" : "day",
      };
    }
  }
}

export function inRange(t: Transaction, r: DateRange): boolean {
  return t.date >= r.start && t.date <= r.end;
}

export function filterByRange(txns: Transaction[], r: DateRange): Transaction[] {
  return txns.filter((t) => inRange(t, r));
}
