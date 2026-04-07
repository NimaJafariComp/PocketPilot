import { endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { type Budget, type Goal, type Transaction } from '../models/index';
import { topCategories } from '../insights/index';

export interface DashboardAlert {
  kind: 'over-budget' | 'warning' | 'uncategorized';
  value: number;
}

export interface DashboardViewModel {
  hasNoData: boolean;
  totalSpent: number;
  totalIncome: number;
  totalBudget: number;
  budgetPct: number;
  remaining: number;
  uncategorizedCount: number;
  topCategories: Array<{ name: string; value: number }>;
  recentTransactions: Transaction[];
  goalProgress: Array<{
    id: string;
    name: string;
    currentAmount: number;
    targetAmount: number;
    percentage: number;
  }>;
  alerts: DashboardAlert[];
}

export function buildDashboardViewModel(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[],
  now = new Date(),
): DashboardViewModel {
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthTransactions = transactions.filter((transaction) => {
    const date = parseISO(transaction.date);
    return date >= monthStart && date <= monthEnd;
  });

  const monthExpenses = monthTransactions.filter((transaction) => transaction.amount < 0);
  const totalSpent = Math.abs(monthExpenses.reduce((sum, transaction) => sum + transaction.amount, 0));
  const totalIncome = monthTransactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalBudget = budgets
    .filter((budget) => budget.month === currentMonth)
    .reduce((sum, budget) => sum + budget.amount, 0);
  const budgetPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const uncategorizedCount = transactions.filter(
    (transaction) => transaction.category === 'Uncategorized',
  ).length;
  const remaining = totalBudget - totalSpent;

  const alerts: DashboardAlert[] = [];
  if (budgetPct >= 100) {
    alerts.push({ kind: 'over-budget', value: totalSpent - totalBudget });
  } else if (budgetPct >= 80) {
    alerts.push({ kind: 'warning', value: remaining });
  }

  if (uncategorizedCount > 0) {
    alerts.push({ kind: 'uncategorized', value: uncategorizedCount });
  }

  const goalProgress = goals
    .map((goal) => ({
      id: goal.id,
      name: goal.name,
      currentAmount: goal.currentAmount,
      targetAmount: goal.targetAmount,
      percentage: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
    }))
    .sort((left, right) => right.percentage - left.percentage)
    .slice(0, 3);

  return {
    hasNoData: transactions.length === 0 && budgets.length === 0 && goals.length === 0,
    totalSpent,
    totalIncome,
    totalBudget,
    budgetPct,
    remaining,
    uncategorizedCount,
    topCategories: topCategories(monthExpenses, 6).map((item) => ({
      name: item.name,
      value: Math.round(item.value),
    })),
    recentTransactions: [...transactions].slice(0, 8),
    goalProgress,
    alerts,
  };
}
