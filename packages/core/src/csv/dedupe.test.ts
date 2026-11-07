import { describe, expect, it } from "vitest";
import { partitionNewTransactions } from "./dedupe";

const charge = {
  date: "2026-09-01",
  merchant: "Example Coffee",
  amount: -5,
  account: "Checking",
};

describe("statement deduplication", () => {
  it("skips an identical reimport", () => {
    expect(partitionNewTransactions([charge], [charge])).toEqual({
      unique: [],
      duplicateCount: 1,
    });
  });

  it("preserves legitimate repeated charges beyond existing occurrences", () => {
    expect(partitionNewTransactions([charge], [charge, charge])).toEqual({
      unique: [charge],
      duplicateCount: 1,
    });
  });

  it("does not merge equal charges from different accounts", () => {
    const otherAccount = { ...charge, account: "Savings" };
    expect(partitionNewTransactions([charge], [otherAccount]).unique).toEqual([otherAccount]);
  });

  it("normalizes merchant case and spacing without changing inputs", () => {
    const incoming = Object.freeze({ ...charge, merchant: "  EXAMPLE   COFFEE  " });
    const existing = Object.freeze([Object.freeze({ ...charge })]);
    expect(partitionNewTransactions(existing, [incoming]).duplicateCount).toBe(1);
    expect(incoming.merchant).toBe("  EXAMPLE   COFFEE  ");
  });
});
