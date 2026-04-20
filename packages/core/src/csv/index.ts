export interface CsvRow {
  [key: string]: string;
}

export function normalizeAmount(rawAmount: string): number {
  return parseFloat((rawAmount || '').replace(/[^0-9.-]/g, ''));
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
