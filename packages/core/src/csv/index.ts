import type { Transaction } from "../models/index";

export interface CsvRow {
  [key: string]: string;
}

export interface CsvTransactionColumnMapping {
  date: string;
  merchant: string;
  amount?: string;
  debit?: string;
  credit?: string;
  category?: string;
  notes?: string;
  account?: string;
}

export interface CsvTransactionParseOptions {
  invertAmounts?: boolean;
  /** Used when the CSV has no account column (or the cell is empty). */
  fallbackAccount?: string;
}

export interface CsvTransactionParseResult {
  transaction: Omit<Transaction, "id">;
  errors: string[];
}

/**
 * Bounds are intentionally small enough for a local, interactive import. They
 * cap memory and error handling before rows reach the data store.
 */
export const CSV_IMPORT_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxRows: 10_000,
  maxColumns: 40,
  maxFieldLength: 4_096,
} as const;

export function validateCsvText(csvText: string): string | null {
  const byteLength = new TextEncoder().encode(csvText).byteLength;
  if (byteLength > CSV_IMPORT_LIMITS.maxFileBytes) {
    return `CSV exceeds the ${CSV_IMPORT_LIMITS.maxFileBytes} byte import limit`;
  }

  // This is an inexpensive pre-parse bound. The parsed-row bound below remains
  // authoritative because quoted cells may legally contain line breaks.
  const physicalRows = csvText.split(/\r\n|\n|\r/).length - 1;
  if (physicalRows > CSV_IMPORT_LIMITS.maxRows + 1) {
    return `CSV exceeds the ${CSV_IMPORT_LIMITS.maxRows} rows import limit`;
  }

  return null;
}

export function validateCsvHeaders(headers: string[]): { headers: string[]; error: string | null } {
  if (headers.length === 0) {
    return { headers: [], error: "CSV has no headers" };
  }
  if (headers.length > CSV_IMPORT_LIMITS.maxColumns) {
    return { headers: [], error: `CSV exceeds the ${CSV_IMPORT_LIMITS.maxColumns} column import limit` };
  }

  const normalizedHeaders = headers.map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim()
  );
  const seen = new Set<string>();
  for (const [index, header] of normalizedHeaders.entries()) {
    if (!header) {
      return { headers: [], error: `CSV header ${index + 1} is empty` };
    }
    if (seen.has(header)) {
      return { headers: [], error: `Duplicate CSV header: ${header}` };
    }
    seen.add(header);
  }

  return { headers: normalizedHeaders, error: null };
}

export function validateCsvRow(row: CsvRow, rowNumber: number): string | null {
  const fields = Object.entries(row);
  if (fields.length > CSV_IMPORT_LIMITS.maxColumns) {
    return `Row ${rowNumber}: exceeds the ${CSV_IMPORT_LIMITS.maxColumns} column import limit`;
  }
  for (const [header, value] of fields) {
    if (String(value).length > CSV_IMPORT_LIMITS.maxFieldLength) {
      return `Row ${rowNumber}: field "${header}" exceeds the ${CSV_IMPORT_LIMITS.maxFieldLength} character import limit`;
    }
  }
  return null;
}

export function normalizeAmount(rawAmount: string): number {
  const amount = parseCsvAmount(rawAmount);
  return amount ?? Number.NaN;
}

export function parseCsvAmount(rawAmount: string): number | null {
  let original = String(rawAmount || "").trim();
  if (!original) {
    return null;
  }

  let isNegative = false;
  if (original.startsWith("(") || original.endsWith(")")) {
    if (!/^\([^()]+\)$/.test(original)) {
      return null;
    }
    isNegative = true;
    original = original.slice(1, -1);
  } else if (original.startsWith("-")) {
    isNegative = true;
    original = original.slice(1);
  } else if (original.endsWith("-")) {
    isNegative = true;
    original = original.slice(0, -1);
  }

  if (original.startsWith("$")) {
    original = original.slice(1);
  }

  // The beta accepts one explicit US-dollar representation only. Locale
  // formats and scientific notation are rejected instead of guessed.
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(original)) {
    return null;
  }

  const parsed = Number(original.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || !Number.isSafeInteger(Math.round(parsed * 100))) {
    return null;
  }

  return isNegative ? -Math.abs(parsed) : parsed;
}

export function resolveCsvAmount(
  row: CsvRow,
  mapping: CsvTransactionColumnMapping,
  options: CsvTransactionParseOptions = {}
): number | null {
  let amount: number | null = null;

  if (mapping.amount) {
    amount = parseCsvAmount(row[mapping.amount] || "");
  } else {
    const debit = mapping.debit ? parseCsvAmount(row[mapping.debit] || "") : null;
    const credit = mapping.credit ? parseCsvAmount(row[mapping.credit] || "") : null;

    if (debit !== null || credit !== null) {
      amount = Math.abs(credit ?? 0) - Math.abs(debit ?? 0);
    }
  }

  if (amount === null) {
    return null;
  }

  return options.invertAmounts ? -amount : amount;
}

function findHeader(headers: string[], patterns: RegExp[]): string {
  const matches = headers.filter((header) => patterns.some((pattern) => pattern.test(header)));
  return matches.length === 1 ? matches[0] : "";
}

export function detectCsvTransactionColumns(headers: string[]): CsvTransactionColumnMapping {
  const debit = findHeader(headers, [
    /\b(debit|withdrawal|withdrawals|charge|charges|paid out|outflow)\b/i,
  ]);
  const credit = findHeader(headers, [/\b(credit|deposit|deposits|paid in|inflow)\b/i]);
  const amount =
    headers.find(
      (header) =>
        header !== debit &&
        header !== credit &&
        /\b(amount|total|value)\b/i.test(header) &&
        !/\b(debit|withdrawal|withdrawals|credit|deposit|deposits)\b/i.test(header)
    ) || "";

  return {
    date: findHeader(headers, [/\b(date|posted|posting date|transaction date)\b/i]),
    merchant: findHeader(headers, [/\b(merchant|description|name|payee|vendor)\b/i]),
    amount,
    debit,
    credit,
    category: findHeader(headers, [/\b(category|type)\b/i]),
    notes: findHeader(headers, [/\b(note|notes|memo|details|location|time)\b/i]),
    account: findHeader(headers, [
      /\b(account|account name|account number|acct|card|card number|card member)\b/i,
    ]),
  };
}

export function parseCsvTransactionRow(
  row: CsvRow,
  mapping: CsvTransactionColumnMapping,
  rowNumber: number,
  options: CsvTransactionParseOptions = {}
): CsvTransactionParseResult {
  const errors: string[] = [];
  const rowError = validateCsvRow(row, rowNumber);
  if (rowError) {
    errors.push(rowError);
  }
  const merchant = String(row[mapping.merchant] || "").trim();
  const amount = resolveCsvAmount(row, mapping, options);
  const date = parseDateOnly(String(row[mapping.date] || ""));

  if (!merchant) {
    errors.push(`Row ${rowNumber}: Merchant is missing`);
  }

  if (amount === null) {
    errors.push(`Row ${rowNumber}: Amount is invalid`);
  }

  if (!date) {
    errors.push(`Row ${rowNumber}: Date is invalid`);
  }

  const account =
    (mapping.account && row[mapping.account] ? String(row[mapping.account]).trim() : "") ||
    String(options.fallbackAccount || "").trim();

  const transaction: Omit<Transaction, "id"> = {
    date: date || "1970-01-01",
    merchant,
    amount: amount ?? 0,
    category:
      mapping.category && row[mapping.category]
        ? String(row[mapping.category]).trim()
        : "Uncategorized",
    notes: mapping.notes && row[mapping.notes] ? String(row[mapping.notes]).trim() : "",
  };

  if (account) {
    transaction.account = account;
  }

  return {
    transaction,
    errors,
  };
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function getTodayLocalDate(): string {
  return formatLocalDate(new Date());
}

export function parseDateOnly(rawDate: string): string | null {
  const normalized = rawDate.trim();
  if (!normalized) {
    return null;
  }

  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateOnlyMatch) {
    return null;
  }

  const year = Number(dateOnlyMatch[1]);
  const month = Number(dateOnlyMatch[2]);
  const day = Number(dateOnlyMatch[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return normalized;
}

export * from "./dedupe";
