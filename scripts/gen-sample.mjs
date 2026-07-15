// Generates public/sample.csv — a synthetic mobile-detailing bank export in a
// debit/credit-column format (no category column) to demo auto-categorization.
// Deterministic so the sample is stable. Run: node scripts/gen-sample.mjs
import { writeFileSync } from "node:fs";

let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const dollars = (min, max) => (min + rand() * (max - min)).toFixed(2);

const jobs = [
  "VENMO CASHOUT",
  "ZELLE PAYMENT FROM SARAH M",
  "SQUARE INC *DETAIL DEPOSIT",
  "ZELLE PAYMENT FROM MIKE D",
  "CASH APP *JOHN T",
  "ZELLE PAYMENT FROM LINDA K",
];
const gas = ["SHELL OIL 5754", "CIRCLE K 07226", "EXXON MR MIKES", "CITGO SPAULDING", "SUNOCO 800304"];
const supplies = [
  "CHEMICAL GUYS DETAILING",
  "DETAIL SUPPLY OUTLET",
  "AUTOZONE #4127",
  "OREILLY AUTO 5544",
  "ADAMS POLISHES LLC",
];
const equipment = ["HARBOR FREIGHT TOOLS", "HOME DEPOT #3502", "NORTHERN TOOL EQUIP"];
const food = ["CHIPOTLE 3156", "DUNKIN #358769", "FIVE GUYS 1516", "MARKET BASKET 0000", "WENDYS 909 CENTRAL"];
const misc = ["USPS PO 3304890", "TOWN OF DOVER NH", "WALMART #1749"];

const rows = [["Date", "Description", "Debit", "Credit"]];
const start = new Date(Date.UTC(2026, 3, 6)); // Apr 6 2026, a Monday — ~14 weeks of data

for (let week = 0; week < 14; week++) {
  const day = (offset) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + week * 7 + offset);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
  };

  const nJobs = 2 + Math.floor(rand() * 4);
  for (let i = 0; i < nJobs; i++) {
    rows.push([day(Math.floor(rand() * 6)), pick(jobs), "", dollars(90, 380)]);
  }
  const nGas = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < nGas; i++) {
    rows.push([day(Math.floor(rand() * 7)), pick(gas), dollars(28, 62), ""]);
  }
  if (week % 2 === 0) rows.push([day(2), pick(supplies), dollars(35, 160), ""]);
  if (rand() < 0.3) rows.push([day(4), pick(equipment), dollars(40, 220), ""]);
  const nFood = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < nFood; i++) {
    rows.push([day(Math.floor(rand() * 7)), pick(food), dollars(8, 26), ""]);
  }
  if (rand() < 0.25) rows.push([day(5), pick(misc), dollars(10, 70), ""]);
}

// Monthly fixed costs
for (const [month, dayNum] of [[3, 15], [4, 15], [5, 15], [6, 6]]) {
  const d = `${month + 1}/${dayNum}/2026`;
  rows.push([d, "PROGRESSIVE INSURANCE PREM", "148.50", ""]);
  rows.push([d, "URABLE.COM SUBSCRIPTION", "25.00", ""]);
  rows.push([d, "FACEBK ADS 8823-11", "60.00", ""]);
}

// Sort ascending by date (opposite of the typical newest-first export)
const toKey = (r) => {
  const [m, d, y] = r[0].split("/").map(Number);
  return y * 10000 + m * 100 + d;
};
const body = rows.slice(1).sort((a, b) => toKey(a) - toKey(b));

const csv = [rows[0], ...body]
  .map((r) => r.map((c) => `"${c}"`).join(","))
  .join("\r\n");
writeFileSync(new URL("../public/sample.csv", import.meta.url), csv + "\r\n");
console.log(`wrote public/sample.csv with ${body.length} rows`);
