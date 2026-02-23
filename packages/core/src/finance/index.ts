import type { Transaction } from '../models/index';

export function sumExpenses(transactions: Transaction[]): number {
  return Math.abs(transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
}
