export type CategoryKind = "income" | "expense" | "transfer";

export interface Transaction {
  /** Stable hash of date|amount|description|ref — used for dedupe and category overrides */
  id: string;
  /** ISO date, e.g. "2026-07-09" */
  date: string;
  description: string;
  /** Signed: positive = money in, negative = money out */
  amount: number;
  category: string;
  categorySource: "bank" | "auto" | "user";
  /** Running account balance after this transaction, when the export provides one */
  balance?: number;
  memo?: string;
}

export interface ImportResult {
  added: Transaction[];
  duplicates: number;
  skipped: number;
  errors: string[];
}

/** One bar-chart bucket (a day, a week, or a month depending on the period). */
export interface BucketPoint {
  key: string;
  label: string;
  revenue: number;
  spending: number;
}

export interface CategorySlice {
  category: string;
  total: number;
}

export interface BalancePoint {
  date: string;
  label: string;
  balance: number;
}

export interface PeriodStats {
  label: string;
  revenue: number;
  expenses: number;
  net: number;
  /** net / revenue × 100, or null when there was no revenue */
  marginPct: number | null;
  /** Internal transfers into this account — money you paid yourself */
  personalIn: number;
  /** Internal transfers out — money you moved back to the business account */
  personalOut: number;
}

export interface PeriodComparison {
  current: PeriodStats;
  previous: PeriodStats | null;
}
