import { readFileSync } from "node:fs";
import { parseBankCsv } from "../lib/parseCsv";
import { mergeTransactions } from "../lib/storage";

const csv = readFileSync("public/sample.csv", "utf8");
const first = parseBankCsv(csv).added;
const overrides: Record<string, string> = { [first[0].id]: "Supplies & Chemicals" };
const initial = mergeTransactions([], first, overrides);
const again = mergeTransactions(initial.merged, parseBankCsv(csv).added, overrides);
const edited = again.merged.find((t) => t.id === first[0].id)!;
console.log(
  JSON.stringify(
    {
      firstImport: { added: initial.addedCount, dupes: initial.duplicateCount },
      reImport: { added: again.addedCount, dupes: again.duplicateCount },
      editedRowAfterReimport: { category: edited.category, source: edited.categorySource },
      totalAfter: again.merged.length,
    },
    null,
    2
  )
);
