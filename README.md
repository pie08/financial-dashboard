# Detailing Finance

Dark-mode financial dashboard for a mobile detailing business. Upload bank CSV
exports, get weekly revenue/spending charts, a category breakdown, a balance
line, month-over-month comparison, and a searchable transactions table with
editable categories. All data stays in your browser (localStorage) — nothing
is uploaded to any server.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

`npm run build && npm start` for a production build. The app is fully static,
so it also deploys anywhere that hosts Next.js (e.g. Vercel).

## Importing data

Click **Import CSV** (or drag a file anywhere onto the page). The parser
handles the common bank-export shapes:

- A single signed **Amount** column (`-13.00`, `(13.00)`, `13.00-`) **or**
  separate **Debit** / **Credit** columns
- A **Debit/Credit indicator** column for banks that export unsigned amounts
- Flexible header names (`Date` / `Posting Date` / `Transaction Date`,
  `Description` / `Payee` / `Merchant`, …)
- Optional **Category**, **Balance**, **Memo**, and **Reference Number** columns
- `Pending` rows are skipped (they re-export once posted)

Re-importing an overlapping export is safe: rows you already have are skipped,
so you can export monthly and just upload the newest file.

## How the numbers are computed

Every transaction lands in one category, and each category has a *kind*:

- **income** (Customer Payments, Other Income) → counts as revenue
- **expense** (Fuel & Gas, Supplies & Chemicals, …) → counts as spending
- **transfer** (Internal Transfer) → excluded from both, since moving your own
  money between accounts isn't revenue or spending. It still affects the
  balance chart, because it changes what's in the account.

Categorization order: structural rules (Venmo cashouts → Customer Payments,
"Transfer to/from … Business" → Internal Transfer) beat the bank's own label,
then the bank's category column is mapped in, then description keywords, then
a fallback. Fix anything it gets wrong with the category dropdown in the
transactions table — your edits are stored separately and survive re-imports.

The balance chart uses the export's Balance column when present (anchored to
the newest transaction and walked backwards by daily net, so row order never
matters). Without one it shows a running total of imported transactions.

## Dev scripts

```bash
node scripts/gen-sample.mjs                     # regenerate public/sample.csv
npx tsx scripts/test-parse.ts <export.csv>      # parse a real export, print what the dashboard would show
npx tsx scripts/test-merge.ts                   # re-import dedupe + category-override regression check
```

## Stack

Next.js (App Router) · Tailwind CSS v4 · Recharts · PapaParse · localStorage
