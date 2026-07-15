/** Dev check: parse a real bank export and print what the dashboard would show.
 *  Usage: npx tsx scripts/test-parse.ts <path-to-csv> [preset] */
import { readFileSync } from "node:fs";
import { parseBankCsv } from "../lib/parseCsv";
import {
  balanceSeries,
  bucketedSeries,
  categoryBreakdown,
  earliestDate,
  latestDate,
  periodComparison,
} from "../lib/analytics";
import { categoryKind } from "../lib/categories";
import { resolvePeriod, type PeriodPreset, PERIOD_PRESETS } from "../lib/period";

const path = process.argv[2];
if (!path) {
  console.error("usage: npx tsx scripts/test-parse.ts <csv> [preset]");
  process.exit(1);
}
const presetArg = (process.argv[3] ?? "this-month") as PeriodPreset;
if (!PERIOD_PRESETS.some((p) => p.id === presetArg)) {
  console.error(`unknown preset "${presetArg}" — one of: ${PERIOD_PRESETS.map((p) => p.id).join(", ")}`);
  process.exit(1);
}

const result = parseBankCsv(readFileSync(path, "utf8"));
console.log(`parsed: ${result.added.length} txns, skipped: ${result.skipped}, errors: ${result.errors.join("; ") || "none"}`);

const txns = result.added;
const byCat = new Map<string, { n: number; total: number }>();
for (const t of txns) {
  const e = byCat.get(t.category) ?? { n: 0, total: 0 };
  e.n++;
  e.total += t.amount;
  byCat.set(t.category, e);
}
console.log("\ncategories (all data):");
for (const [cat, { n, total }] of [...byCat.entries()].sort((a, b) => a[1].total - b[1].total)) {
  console.log(`  ${cat.padEnd(26)} kind=${categoryKind(cat).padEnd(8)} n=${String(n).padStart(3)}  net=${total.toFixed(2)}`);
}

const period = resolvePeriod(presetArg, latestDate(txns)!, earliestDate(txns)!);
console.log(`\nperiod "${presetArg}": ${period.current.start}..${period.current.end} (${period.current.label})`);
if (period.previous) {
  console.log(`  previous:            ${period.previous.start}..${period.previous.end} (${period.previous.label})`);
}

console.log("\ncomparison:");
console.log(JSON.stringify(periodComparison(txns, period), null, 2));

console.log(`\nbuckets (${period.granularity}):`);
for (const b of bucketedSeries(txns, period.current, period.granularity)) {
  console.log(`  ${b.key}  rev=${b.revenue.toFixed(2).padStart(9)}  spend=${b.spending.toFixed(2).padStart(9)}`);
}

console.log("\ntop spending categories in period:");
for (const s of categoryBreakdown(txns, period.current).slice(0, 10)) {
  console.log(`  ${s.category.padEnd(26)} ${s.total.toFixed(2)}`);
}

const bal = balanceSeries(txns);
console.log(`\nbalance series: ${bal.points.length} days, relative=${bal.relative}`);
console.log(`  first: ${JSON.stringify(bal.points[0])}`);
console.log(`  last:  ${JSON.stringify(bal.points[bal.points.length - 1])}`);
