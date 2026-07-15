"use client";

import { useMemo, useState } from "react";
import { CATEGORY_NAMES, categoryKind } from "@/lib/categories";
import { money, prettyDate } from "@/lib/format";
import type { Transaction } from "@/lib/types";

const PAGE = 50;

export default function TransactionsTable({
  txns,
  onCategoryChange,
}: {
  txns: Transaction[];
  onCategoryChange: (id: string, category: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [limit, setLimit] = useState(PAGE);

  const usedCategories = useMemo(
    () => [...new Set(txns.map((t) => t.category))].sort(),
    [txns]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txns.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.description.toLowerCase().includes(q) ||
        (t.memo ?? "").toLowerCase().includes(q)
      );
    });
  }, [txns, query, category]);

  const visible = filtered.slice(0, limit);

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="Search descriptions…"
          className="w-full rounded-lg border border-hairline bg-raised px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-baseline focus:outline-none sm:max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setLimit(PAGE);
          }}
          className="w-full rounded-lg border border-hairline bg-raised px-3 py-2 text-sm text-ink focus:outline-none sm:w-56"
        >
          <option value="all">All categories</option>
          {usedCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="self-center text-xs text-muted sm:ml-auto">
          {filtered.length} of {txns.length} transactions
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-hairline bg-raised text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id} className="border-b border-hairline last:border-b-0">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-2">
                  {prettyDate(t.date)}
                </td>
                <td className="max-w-[220px] px-3 py-2">
                  <span className="block truncate text-ink" title={t.memo || t.description}>
                    {t.description}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={t.category}
                    onChange={(e) => onCategoryChange(t.id, e.target.value)}
                    title={
                      t.categorySource === "user"
                        ? "Category set by you"
                        : t.categorySource === "bank"
                          ? "Category from bank export"
                          : "Category auto-assigned"
                    }
                    className={`w-full max-w-[190px] rounded-md border bg-transparent px-2 py-1 text-xs focus:outline-none ${
                      t.categorySource === "user"
                        ? "border-baseline text-ink"
                        : "border-hairline text-ink-2"
                    }`}
                  >
                    {CATEGORY_NAMES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                    t.amount > 0 && categoryKind(t.category) === "income"
                      ? "text-good"
                      : t.amount > 0
                        ? "text-ink"
                        : "text-ink-2"
                  }`}
                >
                  {t.amount > 0 ? `+${money(t.amount)}` : money(t.amount)}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted">
                  No transactions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > limit && (
        <button
          onClick={() => setLimit((n) => n + PAGE)}
          className="mt-3 w-full rounded-lg border border-hairline bg-raised py-2 text-sm text-ink-2 hover:text-ink"
        >
          Show {Math.min(PAGE, filtered.length - limit)} more
        </button>
      )}
    </div>
  );
}
