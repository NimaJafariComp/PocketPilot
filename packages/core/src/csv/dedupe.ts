import type { Transaction } from "../models/index";

export interface ImportPartition<T> {
  /** Transactions that are new and should be imported. */
  unique: T[];
  /** Incoming rows skipped because they already exist (or repeat beyond what the batch contains). */
  duplicateCount: number;
}

type TransactionLike = Pick<Transaction, "date" | "merchant" | "amount"> & { account?: string };

function dateKey(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return String(isoDate).trim();
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeMerchantKey(merchant: string): string {
  return String(merchant || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Identity for statement rows that lack bank transaction ids:
 * account + calendar day + amount in cents + normalized merchant.
 *
 * Scoping by account means identical-looking rows from two different
 * banks/cards (same merchant, day, and amount) are never treated as
 * duplicates of each other; dedupe only applies within one account.
 * Rows without an account share a single unscoped bucket.
 */
export function transactionFingerprint(transaction: TransactionLike): string {
  const cents = Math.round(Number(transaction.amount) * 100);
  const account = String(transaction.account || "")
    .toLowerCase()
    .trim();
  return `${account}|${dateKey(transaction.date)}|${cents}|${normalizeMerchantKey(transaction.merchant)}`;
}

/**
 * Multiset diff between existing transactions and an incoming statement batch.
 *
 * Re-importing an overlapping or identical statement skips rows that already
 * exist, while legitimate same-day duplicates inside one statement (two equal
 * coffee charges) survive: each fingerprint is allowed
 * `incomingCount - existingCount` new occurrences.
 */
export function partitionNewTransactions<T extends TransactionLike>(
  existing: readonly TransactionLike[],
  incoming: readonly T[]
): ImportPartition<T> {
  const existingCounts = new Map<string, number>();
  for (const transaction of existing) {
    const key = transactionFingerprint(transaction);
    existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
  }

  const unique: T[] = [];
  let duplicateCount = 0;

  for (const transaction of incoming) {
    const key = transactionFingerprint(transaction);
    const remainingExisting = existingCounts.get(key) || 0;

    if (remainingExisting > 0) {
      existingCounts.set(key, remainingExisting - 1);
      duplicateCount += 1;
    } else {
      unique.push(transaction);
    }
  }

  return { unique, duplicateCount };
}
