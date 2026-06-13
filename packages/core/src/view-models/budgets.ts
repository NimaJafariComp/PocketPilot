import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import type { Budget, Transaction } from "../models/index";

export type BudgetStatus = "over" | "warning" | "good";

export interface BudgetRow extends Budget {
  spent: number;
  percentage: number;
  remaining: number;
  status: BudgetStatus;
}

export interface BudgetsViewModel {
  month: string;
  budgetRows: BudgetRow[];
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  totalPct: number;
  overCount: number;
  warningCount: number;
  goodCount: number;
  alertBudgets: BudgetRow[];
}

const STATUS_ORDER: Record<BudgetStatus, number> = { over: 0, warning: 1, good: 2 };

export function buildBudgetsViewModel(
  budgets: Budget[],
  transactions: Transaction[],
  now = new Date()
): BudgetsViewModel {
  const month = format(now, "yyyy-MM");
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const budgetRows = budgets
    .filter((budget) => budget.month === month)
    .map((budget) => {
      const spent = Math.abs(
        transactions
          .filter((transaction) => {
            const date = parseISO(transaction.date);
            return (
              transaction.category === budget.category &&
              transaction.amount < 0 &&
              date >= currentMonthStart &&
              date <= currentMonthEnd
            );
          })
          .reduce((sum, transaction) => sum + transaction.amount, 0)
      );

      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const status: BudgetStatus =
        percentage >= budget.limitThreshold
          ? "over"
          : percentage >= budget.warningThreshold
            ? "warning"
            : "good";

      return {
        ...budget,
        spent,
        percentage,
        remaining: budget.amount - spent,
        status,
      };
    })
    .sort((left, right) => STATUS_ORDER[left.status] - STATUS_ORDER[right.status]);

  const totalBudget = budgetRows.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgetRows.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return {
    month,
    budgetRows,
    totalBudget,
    totalSpent,
    totalRemaining,
    totalPct,
    overCount: budgetRows.filter((budget) => budget.status === "over").length,
    warningCount: budgetRows.filter((budget) => budget.status === "warning").length,
    goodCount: budgetRows.filter((budget) => budget.status === "good").length,
    alertBudgets: budgetRows.filter(
      (budget) => budget.status === "over" || budget.status === "warning"
    ),
  };
}
