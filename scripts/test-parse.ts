/** Dev check: parse a real bank export and print what the dashboard would show.
 *  Usage: npx tsx scripts/test-parse.ts <path-to-csv> */
import { readFileSync } from "node:fs";
import { parseBankCsv } from "../lib/parseCsv";
import { weeklySeries, categoryBreakdown, balanceSeries, monthComparison } from "../lib/analytics";
import { categoryKind } from "../lib/categories";

const path = process.argv[2];
if (!path) {
  console.error("usage: npx tsx scripts/test-parse.ts <csv>");
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
console.log("\ncategories:");
for (const [cat, { n, total }] of [...byCat.entries()].sort((a, b) => a[1].total - b[1].total)) {
  console.log(`  ${cat.padEnd(26)} kind=${categoryKind(cat).padEnd(8)} n=${String(n).padStart(3)}  net=${total.toFixed(2)}`);
}

console.log("\nweekly (last 12):");
for (const w of weeklySeries(txns)) {
  console.log(`  wk ${w.weekStart}  rev=${w.revenue.toFixed(2).padStart(9)}  spend=${w.spending.toFixed(2).padStart(9)}`);
}

console.log("\ntop spending categories (12wk):");
for (const s of categoryBreakdown(txns).slice(0, 10)) {
  console.log(`  ${s.category.padEnd(26)} ${s.total.toFixed(2)}`);
}

const bal = balanceSeries(txns);
console.log(`\nbalance series: ${bal.points.length} days, relative=${bal.relative}`);
console.log(`  first: ${JSON.stringify(bal.points[0])}`);
console.log(`  last:  ${JSON.stringify(bal.points[bal.points.length - 1])}`);

console.log("\nmonth comparison:");
console.log(JSON.stringify(monthComparison(txns), null, 2));
