import type { Transaction } from "./types";

const TXNS_KEY = "fd.transactions.v1";
const OVERRIDES_KEY = "fd.categoryOverrides.v1";

export function loadTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TXNS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveTransactions(txns: Transaction[]): boolean {
  try {
    window.localStorage.setItem(TXNS_KEY, JSON.stringify(txns));
    return true;
  } catch {
    // localStorage full or unavailable
    return false;
  }
}

/** Category overrides survive re-imports: id → category chosen by the user. */
export function loadOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function saveOverrides(overrides: Record<string, string>): void {
  try {
    window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // best effort
  }
}

export function clearAll(): void {
  window.localStorage.removeItem(TXNS_KEY);
  window.localStorage.removeItem(OVERRIDES_KEY);
}

/**
 * Merge newly imported transactions into the existing set, skipping ids we
 * already have and re-applying the user's category overrides. New rows go
 * first so bank exports (newest-first) keep their intra-day order.
 */
export function mergeTransactions(
  existing: Transaction[],
  incoming: Transaction[],
  overrides: Record<string, string>
): { merged: Transaction[]; addedCount: number; duplicateCount: number } {
  const have = new Set(existing.map((t) => t.id));
  const fresh: Transaction[] = [];
  let duplicateCount = 0;
  for (const t of incoming) {
    if (have.has(t.id)) {
      duplicateCount++;
      continue;
    }
    have.add(t.id);
    const override = overrides[t.id];
    fresh.push(override ? { ...t, category: override, categorySource: "user" } : t);
  }
  const merged = [...fresh, ...existing].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { merged, addedCount: fresh.length, duplicateCount };
}
