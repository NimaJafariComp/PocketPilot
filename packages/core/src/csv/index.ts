import type { Transaction } from '../models/index';

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
}

export interface CsvTransactionParseOptions {
  invertAmounts?: boolean;
}

export interface CsvTransactionParseResult {
  transaction: Omit<Transaction, 'id'>;
  errors: string[];
}

export function normalizeAmount(rawAmount: string): number {
  const amount = parseCsvAmount(rawAmount);
  return amount ?? Number.NaN;
}

export function parseCsvAmount(rawAmount: string): number | null {
  const original = String(rawAmount || '').trim();
  if (!original) {
    return null;
  }

  const normalized = original.toLowerCase();
  const isParenthesizedNegative = /^\s*\(.*\)\s*$/.test(original);
  const hasTrailingMinus = /-\s*$/.test(original);
  const hasLeadingMinus = /^\s*-/.test(original);
  const hasDebitMarker = /\b(debit|dr|withdrawal|withdrawn)\b/.test(normalized);
  const hasCreditMarker = /\b(credit|cr|deposit|deposited)\b/.test(normalized);
  const isNegative = isParenthesizedNegative || hasTrailingMinus || hasLeadingMinus || (hasDebitMarker && !hasCreditMarker);

  const numericText = original
    .replace(/^\s*\((.*)\)\s*$/, '$1')
    .replace(/-\s*$/, '')
    .replace(/[^\d.]/g, '');

  if (!numericText) {
    return null;
  }

  const parsed = Number.parseFloat(numericText);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return isNegative ? -Math.abs(parsed) : parsed;
}

export function resolveCsvAmount(
  row: CsvRow,
  mapping: CsvTransactionColumnMapping,
  options: CsvTransactionParseOptions = {},
): number | null {
  let amount: number | null = null;

  if (mapping.amount) {
    amount = parseCsvAmount(row[mapping.amount] || '');
  } else {
    const debit = mapping.debit ? parseCsvAmount(row[mapping.debit] || '') : null;
    const credit = mapping.credit ? parseCsvAmount(row[mapping.credit] || '') : null;

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
  return headers.find((header) => patterns.some((pattern) => pattern.test(header))) || '';
}

export function detectCsvTransactionColumns(headers: string[]): CsvTransactionColumnMapping {
  const debit = findHeader(headers, [/\b(debit|withdrawal|withdrawals|charge|charges|paid out|outflow)\b/i]);
  const credit = findHeader(headers, [/\b(credit|deposit|deposits|paid in|inflow)\b/i]);
  const amount =
    headers.find(
      (header) =>
        header !== debit &&
        header !== credit &&
        /\b(amount|total|value)\b/i.test(header) &&
        !/\b(debit|withdrawal|withdrawals|credit|deposit|deposits)\b/i.test(header),
    ) || '';

  return {
    date: findHeader(headers, [/\b(date|posted|posting date|transaction date)\b/i]),
    merchant: findHeader(headers, [/\b(merchant|description|name|payee|vendor)\b/i]),
    amount,
    debit,
    credit,
    category: findHeader(headers, [/\b(category|type)\b/i]),
    notes: findHeader(headers, [/\b(note|notes|memo|details|location|time)\b/i]),
  };
}

export function parseCsvTransactionRow(
  row: CsvRow,
  mapping: CsvTransactionColumnMapping,
  rowNumber: number,
  options: CsvTransactionParseOptions = {},
): CsvTransactionParseResult {
  const errors: string[] = [];
  const merchant = String(row[mapping.merchant] || '').trim();
  const amount = resolveCsvAmount(row, mapping, options);
  const date = parseDateOnly(String(row[mapping.date] || ''));

  if (!merchant) {
    errors.push(`Row ${rowNumber}: Merchant is missing`);
  }

  if (amount === null) {
    errors.push(`Row ${rowNumber}: Amount is invalid`);
  }

  if (!date) {
    errors.push(`Row ${rowNumber}: Date is invalid`);
  }

  return {
    transaction: {
      date: date || '1970-01-01',
      merchant,
      amount: amount ?? 0,
      category: mapping.category && row[mapping.category] ? String(row[mapping.category]).trim() : 'Uncategorized',
      notes: mapping.notes && row[mapping.notes] ? String(row[mapping.notes]).trim() : '',
    },
    errors,
  };
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0');
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
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return formatLocalDate(date);
    }

    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatLocalDate(parsed);
}

export function parseIsoDate(rawDate: string): string | null {
  return parseDateOnly(rawDate);
}
