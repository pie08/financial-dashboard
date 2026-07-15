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

export interface WeekPoint {
  /** ISO date of the Monday starting the week */
  weekStart: string;
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

export interface MonthStats {
  label: string;
  revenue: number;
  expenses: number;
  net: number;
}

export interface MonthComparison {
  current: MonthStats;
  previous: MonthStats;
}
