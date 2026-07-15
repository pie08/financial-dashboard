import Papa from "papaparse";
import { categorize } from "./categories";
import type { ImportResult, Transaction } from "./types";

/** Normalize a header for matching: lowercase, alphanumeric only. */
function norm(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Pick the first column whose normalized header exactly matches a candidate. */
function pick(headers: string[], candidates: string[]): string | undefined {
  for (const c of candidates) {
    const hit = headers.find((h) => norm(h) === c);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

const DATE_COLS = ["postingdate", "date", "transactiondate", "postdate", "effectivedate", "bookingdate"];
const DESC_COLS = ["description", "merchant", "payee", "name", "details", "transactiondescription"];
const AMOUNT_COLS = ["amount", "transactionamount", "amountusd"];
const DEBIT_COLS = ["debit", "withdrawal", "withdrawals", "moneyout", "debitamount"];
const CREDIT_COLS = ["credit", "deposit", "deposits", "moneyin", "creditamount"];
const CATEGORY_COLS = ["category", "transactioncategory"];
const BALANCE_COLS = ["balance", "runningbalance", "runningbal"];
const MEMO_COLS = ["memo", "extendeddescription", "notes", "note"];
const TYPE_COLS = ["transactiontype", "creditdebitindicator", "drcr"];
const REF_COLS = ["referencenumber", "reference", "transactionid", "fitid"];
const STATUS_COLS = ["postingstatus", "status"];

/** Parse "$1,234.56", "(45.10)", "45.10-", "-45.10000" → signed number, or null. */
export function parseMoney(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  s = s.replace(/[$,\s]/g, "");
  if (!s || !/^\d*\.?\d+$/.test(s)) return null;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

/** Parse common bank date formats → ISO "YYYY-MM-DD", or null. */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  let y: number, m: number, d: number;

  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    [y, m, d] = [+match[1], +match[2], +match[3]];
  } else if ((match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/))) {
    // US order: month/day/year
    [m, d, y] = [+match[1], +match[2], +match[3]];
  } else if ((match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/))) {
    [m, d, y] = [+match[1], +match[2], 2000 + +match[3]];
  } else if ((match = s.match(/^(\d{4})(\d{2})(\d{2})$/))) {
    [y, m, d] = [+match[1], +match[2], +match[3]];
  } else {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** FNV-1a hash → 8-char hex, stable across sessions for dedupe/overrides. */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Parse a bank CSV export into transactions. Handles both a single signed
 * Amount column and separate Debit/Credit columns; a category column is
 * optional (missing categories are auto-assigned from the description).
 */
export function parseBankCsv(csvText: string): ImportResult {
  const result: ImportResult = { added: [], duplicates: 0, skipped: 0, errors: [] };

  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    result.errors.push(`Could not parse file: ${parsed.errors[0].message}`);
    return result;
  }

  const headers = parsed.meta.fields ?? [];
  const dateCol = pick(headers, DATE_COLS);
  const descCol = pick(headers, DESC_COLS);
  const amountCol = pick(headers, AMOUNT_COLS);
  const debitCol = pick(headers, DEBIT_COLS);
  const creditCol = pick(headers, CREDIT_COLS);
  const categoryCol = pick(headers, CATEGORY_COLS);
  const balanceCol = pick(headers, BALANCE_COLS);
  const memoCol = pick(headers, MEMO_COLS);
  const typeCol = pick(headers, TYPE_COLS);
  const refCol = pick(headers, REF_COLS);
  const statusCol = pick(headers, STATUS_COLS);

  if (!dateCol) {
    result.errors.push(`No date column found. Headers seen: ${headers.join(", ")}`);
    return result;
  }
  if (!amountCol && !debitCol && !creditCol) {
    result.errors.push(`No amount (or debit/credit) column found. Headers seen: ${headers.join(", ")}`);
    return result;
  }

  const seenInFile = new Map<string, number>();

  for (const row of parsed.data) {
    const date = parseDate(row[dateCol]);
    if (!date) {
      result.skipped++;
      continue;
    }

    // Pending rows get re-exported once posted — importing them now would
    // double count later.
    if (statusCol && /pending/i.test(row[statusCol] ?? "")) {
      result.skipped++;
      continue;
    }

    let amount: number | null = null;
    if (amountCol) amount = parseMoney(row[amountCol]);
    if (amount == null) {
      const debit = debitCol ? parseMoney(row[debitCol]) : null;
      const credit = creditCol ? parseMoney(row[creditCol]) : null;
      if (debit != null && debit !== 0) amount = -Math.abs(debit);
      else if (credit != null) amount = Math.abs(credit);
    }
    if (amount == null) {
      result.skipped++;
      continue;
    }

    // Some banks export unsigned amounts plus a Debit/Credit indicator.
    if (typeCol) {
      const t = (row[typeCol] ?? "").trim().toLowerCase();
      if (t === "debit" || t === "withdrawal" || t === "dr") amount = -Math.abs(amount);
      else if (t === "credit" || t === "deposit" || t === "cr") amount = Math.abs(amount);
    }

    const description = (descCol ? row[descCol] : "")?.trim() || "(no description)";
    const memo = memoCol ? row[memoCol]?.trim() || undefined : undefined;
    const balance = balanceCol ? parseMoney(row[balanceCol]) ?? undefined : undefined;
    const bankCategory = categoryCol ? row[categoryCol]?.trim() || undefined : undefined;

    const ref = refCol ? row[refCol]?.trim() : "";
    let id: string;
    if (ref) {
      id = hash(`${date}|${amount}|${ref}`);
    } else {
      // No reference number: disambiguate identical same-day rows by their
      // occurrence index so legitimate repeats aren't dropped as duplicates.
      const key = `${date}|${amount}|${description}`;
      const n = seenInFile.get(key) ?? 0;
      seenInFile.set(key, n + 1);
      id = hash(`${key}|${n}`);
    }

    const { category, source } = categorize(description, amount, bankCategory, memo);

    result.added.push({
      id,
      date,
      description,
      amount: Math.round(amount * 100) / 100,
      category,
      categorySource: source,
      balance,
      memo,
    });
  }

  return result;
}
