import type { CategorizationInput, CategorizationResult } from "./interfaces/categorization";

const merchantRules: Array<{ match: RegExp; category: string }> = [
  { match: /trader joe'?s|whole foods|kroger|safeway|aldi|costco|walmart/i, category: "Groceries" },
  { match: /starbucks|coffee|restaurant|doordash|uber eats|grubhub/i, category: "Dining" },
  { match: /uber|lyft|shell|exxon|chevron|parking|transit/i, category: "Transportation" },
  { match: /netflix|spotify|hulu|steam|cinema/i, category: "Entertainment" },
  { match: /electric|water|internet|verizon|t-mobile|at&t/i, category: "Bills" },
];

export function normalizeMerchant(merchant: string) {
  return merchant.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function categorizeLocally(
  transaction: CategorizationInput,
  categories: string[]
): CategorizationResult {
  const normalizedMerchant = normalizeMerchant(transaction.merchant);
  const category = merchantRules.find((rule) => rule.match.test(transaction.merchant))?.category;

  if (category && categories.includes(category)) {
    return {
      category,
      categorySource: "auto-rule",
      categoryConfidence: 0.9,
      categoryNeedsReview: false,
      normalizedMerchant,
      reason: "Matched a deterministic on-device merchant rule.",
    };
  }

  return {
    category: "Uncategorized",
    categorySource: "auto-rule",
    categoryConfidence: 0,
    categoryNeedsReview: true,
    normalizedMerchant,
    reason: "No on-device category rule matched.",
  };
}
