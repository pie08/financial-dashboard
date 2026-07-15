"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  balanceSeries,
  categoryBreakdown,
  monthComparison,
  weeklySeries,
} from "@/lib/analytics";
import { prettyDate } from "@/lib/format";
import { parseBankCsv } from "@/lib/parseCsv";
import {
  clearAll,
  loadOverrides,
  loadTransactions,
  mergeTransactions,
  saveOverrides,
  saveTransactions,
} from "@/lib/storage";
import type { Transaction } from "@/lib/types";
import ChartCard from "./ChartCard";
import StatTiles from "./StatTiles";
import TransactionsTable from "./TransactionsTable";
import BalanceChart from "./charts/BalanceChart";
import CategoryDonut from "./charts/CategoryDonut";
import WeeklyBarChart from "./charts/WeeklyBarChart";

export default function Dashboard() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTxns(loadTransactions());
    setHydrated(true);
  }, []);

  const importText = useCallback((csvText: string, sourceName: string) => {
    const result = parseBankCsv(csvText);
    if (result.errors.length > 0) {
      setNotice(`⚠ ${sourceName}: ${result.errors.join(" ")}`);
      return;
    }
    setTxns((prev) => {
      const { merged, addedCount, duplicateCount } = mergeTransactions(
        prev,
        result.added,
        loadOverrides()
      );
      const saved = saveTransactions(merged);
      const parts = [`${addedCount} added`];
      if (duplicateCount > 0) parts.push(`${duplicateCount} already imported`);
      if (result.skipped > 0) parts.push(`${result.skipped} rows skipped`);
      if (!saved) parts.push("could not save to this browser — data will not persist");
      setNotice(`${sourceName}: ${parts.join(", ")}.`);
      return merged;
    });
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        importText(await file.text(), file.name);
      }
    },
    [importText]
  );

  const loadSample = useCallback(async () => {
    const res = await fetch("/sample.csv");
    importText(await res.text(), "Sample data");
  }, [importText]);

  const handleClear = useCallback(() => {
    if (!window.confirm("Remove all imported transactions and category edits from this browser?")) return;
    clearAll();
    setTxns([]);
    setNotice(null);
  }, []);

  const handleCategoryChange = useCallback((id: string, category: string) => {
    const overrides = loadOverrides();
    overrides[id] = category;
    saveOverrides(overrides);
    setTxns((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, category, categorySource: "user" as const } : t
      );
      saveTransactions(next);
      return next;
    });
  }, []);

  const weekly = useMemo(() => weeklySeries(txns), [txns]);
  const slices = useMemo(() => categoryBreakdown(txns), [txns]);
  const balance = useMemo(() => balanceSeries(txns), [txns]);
  const comparison = useMemo(() => monthComparison(txns), [txns]);

  const dateRange = useMemo(() => {
    if (txns.length === 0) return null;
    let min = txns[0].date;
    let max = txns[0].date;
    for (const t of txns) {
      if (t.date < min) min = t.date;
      if (t.date > max) max = t.date;
    }
    return `${prettyDate(min)} – ${prettyDate(max)}`;
  }, [txns]);

  return (
    <div
      className="mx-auto max-w-5xl px-4 py-6 sm:px-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
    >
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-xl font-semibold text-ink">Detailing Finance</h1>
          <p className="text-xs text-muted">
            {dateRange ? `${dateRange} · ${txns.length} transactions` : "Upload a bank CSV to get started"}
          </p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInput.current?.click()}
          className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-page hover:opacity-90"
        >
          Import CSV
        </button>
        {txns.length > 0 && (
          <button
            onClick={handleClear}
            className="rounded-lg border border-hairline px-3.5 py-2 text-sm text-ink-2 hover:text-ink"
          >
            Clear data
          </button>
        )}
      </header>

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-hairline bg-surface px-3 py-2 text-xs text-ink-2">
          <span className="min-w-0 flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="text-muted hover:text-ink" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {!hydrated ? null : txns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-baseline bg-surface px-6 py-16 text-center">
          <p className="text-2xl">📄</p>
          <h2 className="mt-3 text-base font-medium text-ink">Drop your bank export here</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            CSV exports with a signed Amount column or separate Debit/Credit columns both work.
            Missing categories are auto-assigned from the description, and everything stays in
            this browser — nothing is uploaded anywhere.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => fileInput.current?.click()}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-page hover:opacity-90"
            >
              Choose CSV file
            </button>
            <button
              onClick={loadSample}
              className="rounded-lg border border-hairline px-4 py-2 text-sm text-ink-2 hover:text-ink"
            >
              Try sample data
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {comparison && <StatTiles comparison={comparison} />}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Weekly revenue" subtitle="Customer payments · last 12 weeks">
              <WeeklyBarChart
                data={weekly}
                dataKey="revenue"
                name="Revenue"
                color="var(--series-revenue)"
              />
            </ChartCard>
            <ChartCard title="Weekly spending" subtitle="Money out · internal transfers excluded">
              <WeeklyBarChart
                data={weekly}
                dataKey="spending"
                name="Spending"
                color="var(--series-spending)"
              />
            </ChartCard>
            <ChartCard title="Spending by category" subtitle="Last 12 weeks">
              <CategoryDonut slices={slices} />
            </ChartCard>
            <ChartCard
              title="Liquid funds"
              subtitle={
                balance.relative
                  ? "Running total of imported transactions (export had no balance column)"
                  : "End-of-day account balance"
              }
            >
              <BalanceChart points={balance.points} />
            </ChartCard>
          </div>

          <ChartCard title="Transactions" subtitle="Edit a category to reclassify — your change is remembered across re-imports">
            <TransactionsTable txns={txns} onCategoryChange={handleCategoryChange} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
