import type { Transaction } from '../models/index';
export * from './buildRagDocuments';

export function topCategories(transactions: Transaction[], limit = 5) {
  const totals = transactions.reduce<Record<string, number>>((acc, tx) => {
    if (tx.amount >= 0) return acc;
    acc[tx.category] = (acc[tx.category] || 0) + Math.abs(tx.amount);
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
