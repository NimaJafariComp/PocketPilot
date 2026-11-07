import { describe, expect, it } from "vitest";
import { parseCsvAmount, parseCsvTransactionRow, parseDateOnly } from "./index";

describe("supported CSV input", () => {
  it.each([
    ["1,234.56", 1234.56],
    ["(23.50)", -23.5],
    ["12.00-", -12],
    ["", null],
  ])("parses %s", (input, expected) => {
    expect(parseCsvAmount(input)).toBe(expected);
  });

  it("rejects an invalid ISO calendar date", () => {
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("2024-02-29")).toBe("2024-02-29");
  });

  it("maps debit and credit columns with an explicit account", () => {
    const result = parseCsvTransactionRow(
      { Date: "2026-09-01", Merchant: "Example Store", Debit: "40.00", Credit: "5.00" },
      { date: "Date", merchant: "Merchant", debit: "Debit", credit: "Credit" },
      1,
      { fallbackAccount: "Checking" }
    );
    expect(result.errors).toEqual([]);
    expect(result.transaction).toMatchObject({
      date: "2026-09-01",
      merchant: "Example Store",
      amount: -35,
      account: "Checking",
    });
  });

  // Document unresolved audit cases without blessing the current incorrect output.
  // Add executable regression assertions with the strict-parser implementation.
  it.todo("rejects malformed amounts such as 12.34.56 (strict CSV parser follow-up)");
  it.todo("requires an explicit format for ambiguous locale amounts such as 1.234,56");
  it.todo("rejects impossible non-ISO dates such as 02/30/2026");
});
