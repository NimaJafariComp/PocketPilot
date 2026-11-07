import { describe, expect, it } from "vitest";
import { categorizeLocally } from "./local-categorization";

describe("local categorization", () => {
  const categories = ["Groceries", "Dining", "Transportation", "Uncategorized"];

  it("uses deterministic merchant rules without a network dependency", () => {
    expect(
      categorizeLocally({ merchant: "Trader Joe's", amount: -42 }, categories)
    ).toMatchObject({
      category: "Groceries",
      categorySource: "auto-rule",
      categoryNeedsReview: false,
    });
  });

  it("falls back to explicit Uncategorized with truthful local provenance", () => {
    expect(categorizeLocally({ merchant: "Unmapped Shop", amount: -9 }, categories)).toMatchObject({
      category: "Uncategorized",
      categorySource: "auto-rule",
      categoryNeedsReview: true,
    });
  });

  it("does not assign a category that the user has not configured", () => {
    expect(categorizeLocally({ merchant: "Uber", amount: -12 }, ["Groceries", "Uncategorized"])).toMatchObject({
      category: "Uncategorized",
    });
  });
});
