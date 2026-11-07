import { describe, expect, it } from "vitest";
import {
  CSV_IMPORT_LIMITS,
  parseCsvAmount,
  parseCsvTransactionRow,
  parseDateOnly,
  detectCsvTransactionColumns,
  validateCsvHeaders,
  validateCsvRow,
  validateCsvText,
} from "./index";

describe("supported CSV input", () => {
  it.each([
    ["1,234.56", 1234.56],
    ["$1,234.56", 1234.56],
    ["(23.50)", -23.5],
    ["12.00-", -12],
    ["0.00", 0],
    ["", null],
  ])("parses %s", (input, expected) => {
    expect(parseCsvAmount(input)).toBe(expected);
  });

  it("rejects an invalid ISO calendar date", () => {
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("2024-02-29")).toBe("2024-02-29");
    expect(parseDateOnly("02/30/2026")).toBeNull();
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

  it("does not guess when more than one header can represent a required field", () => {
    const mapping = detectCsvTransactionColumns([
      "Posting Date",
      "Transaction Date",
      "Merchant",
      "Amount",
    ]);
    expect(mapping.date).toBe("");
  });

  it.each(["12.34.56", "1e3", "1.234,56", "Debit 12.00", "$12.00 USD"])(
    "rejects unsupported or ambiguous amount %s",
    (value) => {
      expect(parseCsvAmount(value)).toBeNull();
    }
  );

  it("rejects unsafe CSV headers and fields", () => {
    expect(validateCsvHeaders(["\ufeffDate", "Merchant", "Amount"])).toEqual({
      headers: ["Date", "Merchant", "Amount"],
      error: null,
    });
    expect(validateCsvHeaders(["Date", "Date"])).toMatchObject({ error: "Duplicate CSV header: Date" });
    expect(validateCsvHeaders(["Date", " "])).toMatchObject({ error: "CSV header 2 is empty" });
    expect(validateCsvRow({ Note: "x".repeat(CSV_IMPORT_LIMITS.maxFieldLength + 1) }, 1)).toMatch(
      /field "Note" exceeds/
    );
  });

  it("enforces byte and row limits before parsing", () => {
    expect(validateCsvText("Date,Merchant,Amount\n2026-01-01,Shop,1.00")).toBeNull();
    expect(validateCsvText("x".repeat(CSV_IMPORT_LIMITS.maxFileBytes + 1))).toMatch(/exceeds/);
    expect(validateCsvText("h\n" + "x\n".repeat(CSV_IMPORT_LIMITS.maxRows + 1))).toMatch(/rows/);
  });
});
