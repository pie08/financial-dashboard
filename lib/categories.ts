import type { CategoryKind } from "./types";

/**
 * Canonical category set. Every transaction ends up in exactly one of these.
 * `kind` drives the math: income counts toward revenue, expense toward
 * spending, transfer is excluded from both (it's your own money moving
 * between accounts — counting it would inflate revenue and spending).
 */
export const CATEGORIES: { name: string; kind: CategoryKind }[] = [
  { name: "Customer Payments", kind: "income" },
  { name: "Other Income", kind: "income" },
  { name: "Internal Transfer", kind: "transfer" },
  { name: "Fuel & Gas", kind: "expense" },
  { name: "Supplies & Chemicals", kind: "expense" },
  { name: "Equipment & Tools", kind: "expense" },
  { name: "Vehicle & Maintenance", kind: "expense" },
  { name: "Insurance", kind: "expense" },
  { name: "Software & Subscriptions", kind: "expense" },
  { name: "Marketing", kind: "expense" },
  { name: "Meals & Dining", kind: "expense" },
  { name: "Groceries", kind: "expense" },
  { name: "Shopping", kind: "expense" },
  { name: "Entertainment", kind: "expense" },
  { name: "Health & Fitness", kind: "expense" },
  { name: "Education", kind: "expense" },
  { name: "Rent & Storage", kind: "expense" },
  { name: "Parking & Tolls", kind: "expense" },
  { name: "Venmo & P2P Payments", kind: "expense" },
  { name: "Fees & Charges", kind: "expense" },
  { name: "Other", kind: "expense" },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

const KIND_BY_NAME = new Map(CATEGORIES.map((c) => [c.name, c.kind]));

export function categoryKind(name: string): CategoryKind {
  return KIND_BY_NAME.get(name) ?? "expense";
}

/**
 * Highest-priority rules, matched against description + memo regardless of
 * any bank-provided category. These catch the flows where the bank's own
 * label is misleading — e.g. Venmo cashouts are labeled "Account Transfer In"
 * but they are customer revenue for this business.
 */
const STRUCTURAL_RULES: { pattern: RegExp; credit?: boolean; category: string }[] = [
  { pattern: /venmo\s*-?\s*cashout/i, category: "Customer Payments" },
  { pattern: /transfer (to|from) .*business/i, category: "Internal Transfer" },
  { pattern: /overdraft transfer/i, category: "Internal Transfer" },
  { pattern: /mobile check deposit|check deposit|remote deposit/i, category: "Customer Payments" },
  // A Venmo credit is money pulled from your own Venmo balance (where
  // customer payments land) — revenue. A Venmo debit is paying someone.
  { pattern: /venmo/i, credit: true, category: "Customer Payments" },
  { pattern: /venmo/i, credit: false, category: "Venmo & P2P Payments" },
  { pattern: /zelle|cash app|square inc|sq \*|stripe/i, credit: true, category: "Customer Payments" },
];

/** Maps categories that banks commonly put in exports onto the canonical set. */
const BANK_CATEGORY_MAP: [RegExp, string][] = [
  [/account transfer|internal transfer/i, "Internal Transfer"],
  [/^deposit$|^income$|paycheck|interest/i, "Other Income"],
  [/^gas$|fuel/i, "Fuel & Gas"],
  [/fast food|restaurant|coffee|food and drink|beer|wine|liquor|alcohol/i, "Meals & Dining"],
  [/groceries/i, "Groceries"],
  [/convenience store/i, "Fuel & Gas"],
  [/hardware/i, "Equipment & Tools"],
  [/automotive|auto parts|car wash|oil change|vehicle/i, "Vehicle & Maintenance"],
  [/insurance/i, "Insurance"],
  [/software|web services|music and audio|tv and movies|streaming/i, "Software & Subscriptions"],
  [/advertising|marketing/i, "Marketing"],
  [/clothing|department store|superstore|discount store|general merchandise|electronics|eye care/i, "Shopping"],
  [/entertainment|video games|sporting events|amusement|museums/i, "Entertainment"],
  [/pharmac|health|medical|dental|supplements|gyms and fitness/i, "Health & Fitness"],
  [/education/i, "Education"],
  [/^rent$|storage/i, "Rent & Storage"],
  [/parking|tolls/i, "Parking & Tolls"],
  [/fee|service charge|overdraft/i, "Fees & Charges"],
  [/general services/i, "Software & Subscriptions"],
];

/** Keyword rules on the description, for exports with no category column. */
const KEYWORD_RULES: [RegExp, string][] = [
  [/shell|exxon|mobil|citgo|sunoco|gulf oil|chevron|bp\b|speedway|nouria|irving|circle k|cumberland|gas/i, "Fuel & Gas"],
  [/chemical|detail supply|meguiar|adam'?s polish|griot|autogeek|car wash|chemguy|armor all|turtle wax/i, "Supplies & Chemicals"],
  [/home depot|lowe'?s|harbor freight|ace hardware|northern tool/i, "Equipment & Tools"],
  [/autozone|o'?reilly|napa|advance auto|jiffy lube|valvoline|firestone|midas|tire/i, "Vehicle & Maintenance"],
  [/insurance|geico|progressive|allstate|state farm|next insurance|hiscox/i, "Insurance"],
  [/vercel|adobe|google|spotify|tidal|soundcloud|netflix|apple\.com|microsoft|dropbox|canva|quickbooks|paddle|subscription|rekordbox/i, "Software & Subscriptions"],
  [/facebook|facebk|meta ads|google ads|yelp|vistaprint|thumbtack|angi\b/i, "Marketing"],
  [/mcdonald|wendy|burger|taco|chipotle|chick-?fil|kfc|dunkin|starbucks|pizza|deli|restaurant|grill|cafe|diner|subs|five guys|dairy queen|raising cane|panera|doordash|grubhub|uber\s*eats|dave'?s hot/i, "Meals & Dining"],
  [/market basket|hannaford|shaw'?s|walmart|wal-mart|target|costco|grocer|supermarket|aldi|kroger/i, "Groceries"],
  [/burlington|marshalls|tj\s*maxx|old navy|american eagle|calvin klein|nike|adidas|amazon|ebay|dollar general|clothing|factory store|sunglass/i, "Shopping"],
  [/cinema|regal|amc\b|theat|steam|playstation|xbox|nintendo|billiards|bowling|golf|park/i, "Entertainment"],
  [/cvs|walgreens|rite aid|pharmacy|planet fitness|gym|fitness/i, "Health & Fitness"],
  [/udemy|coursera|course|tuition|school/i, "Education"],
  [/storage|rent\b/i, "Rent & Storage"],
  [/parking|toll|ez-?pass/i, "Parking & Tolls"],
  [/overdraft fee|service charge|monthly fee|atm fee|wire fee/i, "Fees & Charges"],
];

/**
 * Categorize a transaction. Order: structural rules (they beat everything,
 * including the bank's label), then the bank category if the export has one,
 * then description keywords, then a kind-appropriate fallback.
 */
export function categorize(
  description: string,
  amount: number,
  bankCategory?: string,
  memo?: string
): { category: string; source: "bank" | "auto" } {
  const text = `${description} ${memo ?? ""}`;
  const isCredit = amount > 0;

  for (const rule of STRUCTURAL_RULES) {
    if (rule.credit !== undefined && rule.credit !== isCredit) continue;
    if (rule.pattern.test(text)) return { category: rule.category, source: "auto" };
  }

  if (bankCategory && bankCategory.trim()) {
    const bc = bankCategory.trim();
    if (KIND_BY_NAME.has(bc)) return { category: bc, source: "bank" };
    for (const [pattern, category] of BANK_CATEGORY_MAP) {
      if (pattern.test(bc)) return { category, source: "bank" };
    }
  }

  for (const [pattern, category] of KEYWORD_RULES) {
    if (pattern.test(text)) return { category, source: "auto" };
  }

  return { category: isCredit ? "Other Income" : "Other", source: "auto" };
}
