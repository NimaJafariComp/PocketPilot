import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import type { Transaction } from "../models/index";

export interface InsightCategoryData {
  name: string;
  value: number;
}

export interface InsightCategoryChange {
  category: string;
  change: number;
  thisMonth: number;
  lastMonth: number;
  delta: number;
}

export interface InsightRecurringCharge {
  merchant: string;
  count: number;
  avgAmount: number;
}

export interface InsightsViewModel {
  thisMonthSpent: number;
  lastMonthSpent: number;
  changePercent: number;
  thisMonthCount: number;
  categoryData: InsightCategoryData[];
  totalCategorySpend: number;
  maxCategoryValue: number;
  changes: InsightCategoryChange[];
  recurringCharges: InsightRecurringCharge[];
  currentMonthLabel: string;
  previousMonthLabel: string;
}

export function buildInsightsViewModel(
  transactions: Transaction[],
  now = new Date()
): InsightsViewModel {
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthDate = subMonths(now, 1);
  const lastMonthStart = startOfMonth(lastMonthDate);
  const lastMonthEnd = endOfMonth(lastMonthDate);

  const thisMonthTransactions = transactions.filter((transaction) => {
    const date = parseISO(transaction.date);
    return date >= thisMonthStart && date <= thisMonthEnd;
  });

  const thisMonthExpenses = thisMonthTransactions.filter((transaction) => transaction.amount < 0);
  const lastMonthExpenses = transactions.filter((transaction) => {
    const date = parseISO(transaction.date);
    return date >= lastMonthStart && date <= lastMonthEnd && transaction.amount < 0;
  });

  const thisMonthSpent = Math.abs(
    thisMonthExpenses.reduce((sum, transaction) => sum + transaction.amount, 0)
  );
  const lastMonthSpent = Math.abs(
    lastMonthExpenses.reduce((sum, transaction) => sum + transaction.amount, 0)
  );
  const changePercent =
    lastMonthSpent > 0 ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100 : 0;

  const categoryTotals = thisMonthExpenses.reduce<Record<string, number>>(
    (accumulator, transaction) => {
      accumulator[transaction.category] =
        (accumulator[transaction.category] || 0) + Math.abs(transaction.amount);
      return accumulator;
    },
    {}
  );

  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  const totalCategorySpend = categoryData.reduce((sum, category) => sum + category.value, 0);
  const lastMonthCategoryTotals = lastMonthExpenses.reduce<Record<string, number>>(
    (accumulator, transaction) => {
      accumulator[transaction.category] =
        (accumulator[transaction.category] || 0) + Math.abs(transaction.amount);
      return accumulator;
    },
    {}
  );

  const changes = Object.keys({ ...categoryTotals, ...lastMonthCategoryTotals })
    .map((category) => {
      const thisMonth = categoryTotals[category] || 0;
      const lastMonth = lastMonthCategoryTotals[category] || 0;
      const change =
        lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;
      return {
        category,
        change,
        thisMonth,
        lastMonth,
        delta: thisMonth - lastMonth,
      };
    })
    .sort((left, right) => Math.abs(right.change) - Math.abs(left.change))
    .slice(0, 3);

  const recurringCharges = Object.entries(
    transactions.reduce<Record<string, number>>((accumulator, transaction) => {
      accumulator[transaction.merchant] = (accumulator[transaction.merchant] || 0) + 1;
      return accumulator;
    }, {})
  )
    .filter(([, count]) => count >= 3)
    .map(([merchant, count]) => {
      const avgAmount = Math.abs(
        transactions
          .filter((transaction) => transaction.merchant === merchant)
          .reduce((sum, transaction) => sum + transaction.amount, 0) / count
      );

      return { merchant, count, avgAmount };
    })
    .sort((left, right) => right.avgAmount - left.avgAmount)
    .slice(0, 5);

  return {
    thisMonthSpent,
    lastMonthSpent,
    changePercent,
    thisMonthCount: thisMonthTransactions.length,
    categoryData,
    totalCategorySpend,
    maxCategoryValue: categoryData[0]?.value ?? 1,
    changes,
    recurringCharges,
    currentMonthLabel: format(now, "MMM yyyy"),
    previousMonthLabel: format(lastMonthDate, "MMMM yyyy"),
  };
}
