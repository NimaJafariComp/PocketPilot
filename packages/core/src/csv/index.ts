export interface CsvRow {
  [key: string]: string;
}

export function normalizeAmount(rawAmount: string): number {
  return parseFloat((rawAmount || '').replace(/[^0-9.-]/g, ''));
}

export function parseIsoDate(rawDate: string): string | null {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
