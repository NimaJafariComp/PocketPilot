/** The initial beta supports USD only; cross-currency aggregation is forbidden. */
export const BETA_CURRENCY = "USD" as const;
export const CURRENCY_DECIMAL_PLACES = 2;

/**
 * Converts an exact decimal string to persisted integer minor units. Deliberate
 * string validation avoids rounding, scientific notation, and locale guessing.
 */
export function decimalToMinorUnits(value: string | number): number | null {
  const source = typeof value === "number" ? String(value) : value;
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(source)) return null;

  const negative = source.startsWith("-");
  const unsigned = negative ? source.slice(1) : source;
  const [wholeText, fractionText = ""] = unsigned.split(".");
  const whole = Number(wholeText);
  const fraction = Number(fractionText.padEnd(CURRENCY_DECIMAL_PLACES, "0"));
  const minor = whole * 100 + fraction;

  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}

/** Converts a persisted safe integer minor-unit value for display calculations. */
export function minorUnitsToDecimal(minorUnits: number): number | null {
  if (!Number.isSafeInteger(minorUnits)) return null;
  return minorUnits / 100;
}

/** Validates a date-only calendar value without local-timezone interpretation. */
export function isCalendarDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Empty optional date input is omitted; malformed values are never persisted. */
export function normalizeOptionalCalendarDate(value: string): string | null | undefined {
  if (value === "") return undefined;
  return isCalendarDate(value) ? value : null;
}
