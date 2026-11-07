import { describe, expect, it } from "vitest";
import {
  createImportOperation,
  createImportOperationId,
  createImportRowIds,
  partitionNewTransactions,
} from "./dedupe";

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

  it("derives stable operation and occurrence-aware row identities", () => {
    const operationId = createImportOperationId([charge, charge]);
    expect(operationId).toMatch(/^import_[a-f0-9]{16}$/);
    expect(createImportOperationId([charge, charge])).toBe(operationId);
    expect(createImportRowIds(operationId, [charge, charge])).toEqual([
      expect.stringMatching(new RegExp(`^${operationId}_[a-f0-9]{16}_000001$`)),
      expect.stringMatching(new RegExp(`^${operationId}_[a-f0-9]{16}_000002$`)),
    ]);
  });

  it("retains the full-statement row identities when a partial operation is resumed", () => {
    const groceries = { ...charge, merchant: "Market", amount: -22.5 };
    const operation = createImportOperation([charge, charge, groceries]);

    const remaining = partitionNewTransactions([operation.rows[0]], operation.rows);

    expect(operation.id).toBe(createImportOperationId([groceries, charge, charge]));
    expect(remaining.unique.map((row) => row.id)).toEqual([
      operation.rows[1].id,
      operation.rows[2].id,
    ]);
  });

  it("uses the stable account identity rather than a mutable account label or filename", () => {
    const original = { ...charge, account: "September checking.csv", accountId: "checking-main" };
    const renamed = { ...charge, account: "My primary checking", accountId: "checking-main" };
    const differentAccount = { ...charge, account: "My primary checking", accountId: "savings-main" };

    expect(createImportOperationId([renamed])).toBe(createImportOperationId([original]));
    expect(createImportOperationId([differentAccount])).not.toBe(createImportOperationId([original]));
  });
});
