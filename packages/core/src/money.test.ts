import { describe, expect, it } from "vitest";
import {
  decimalToMinorUnits,
  isCalendarDate,
  minorUnitsToDecimal,
  normalizeOptionalCalendarDate,
} from "./money";

describe("financial value contract", () => {
  it("converts exact USD decimal values to integer cents and back", () => {
    expect(decimalToMinorUnits("-1234.56")).toBe(-123456);
    expect(minorUnitsToDecimal(123456)).toBe(1234.56);
  });

  it.each(["1.234", "1e3", "NaN", "Infinity", "", " 1.00 ", "90071992547409.92"])(
    "rejects ambiguous or unsafe amount %s",
    (amount) => {
      expect(decimalToMinorUnits(amount)).toBeNull();
    }
  );

  it("accepts leap days without timezone conversion and rejects invalid dates", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2026-03-08T00:00:00.000Z")).toBe(false);
  });

  it("omits an empty optional deadline and preserves a valid date-only deadline", () => {
    expect(normalizeOptionalCalendarDate("")).toBeUndefined();
    expect(normalizeOptionalCalendarDate("2026-12-31")).toBe("2026-12-31");
    expect(normalizeOptionalCalendarDate("2026-02-29")).toBeNull();
  });
});
