import { endOfMonth, parseISO, startOfMonth, subMonths } from 'date-fns';
import type { Budget, Goal, Transaction } from '../models/index';

const MERCHANT_NOISE_TOKENS = new Set([
  'ach',
  'auth',
  'card',
  'check',
  'checkcard',
  'com',
  'dbt',
  'debit',
  'inc',
  'llc',
  'online',
  'payment',
  'pos',
  'purchase',
  'sq',
  'tap',
  'visa',
  'withdrawal',
]);

const US_STATE_CODES = [
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia',
  'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj',
  'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt',
  'va', 'wa', 'wv', 'wi', 'wy',
].join('|');

export interface BuildRagDocumentsUser {
  id: string;
  email?: string | null;
  displayName?: string | null;
}

export interface InsightRagDocument {
  id: string;
  kind: 'transaction' | 'budget' | 'goal' | 'insight' | 'note';
  text: string;
  tags?: string[];
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

interface BuildRagDocumentsParams {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  user: BuildRagDocumentsUser | null;
}

const MAX_RECENT_TRANSACTION_DOCS = 40;
const MAX_LARGEST_TRANSACTION_DOCS = 20;
const MAX_MERCHANT_SUMMARY_DOCS = 20;
const MAX_CATEGORY_SUMMARY_DOCS = 12;

function normalizeMerchantForRag(merchant: string, category?: string): string {
  let normalized = merchant
    .toLowerCase()
    .replace(/\s+#\s*\d+[a-z0-9-]*\b/g, ' ')
    .replace(/\s+store\s+\d+\b/g, ' ')
    .replace(/\s*-\s*\d+\b/g, ' ')
    .replace(/\s+[a-z0-9]+\s+(street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|way|plaza|mall|suite|ste|center|centre)\b$/g, ' ')
    .replace(/[*]/g, ' ')
    .replace(new RegExp(`(?:\\s+|,)(?:${US_STATE_CODES})\\b$`, 'g'), ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b\d{2,}\b/g, ' ');

  const tokens = normalized
    .split(/\s+/)
    .filter((token) => token && !MERCHANT_NOISE_TOKENS.has(token));

  normalized = tokens.join(' ').trim();

  const categoryLower = category?.toLowerCase() || '';
  if (categoryLower.includes('grocery')) {
    normalized = normalized.replace(/\s+market$/, '');
  }
  if (categoryLower.includes('dining') || categoryLower.includes('restaurant')) {
    normalized = normalized.replace(/\s+(coffee|cafe|restaurant)$/, '');
  }
  if (categoryLower.includes('shopping')) {
    normalized = normalized.replace(/\s+store$/, '');
  }

  return normalized || merchant.trim().toLowerCase();
}

function buildMerchantMatchKey(merchant: string, category?: string): string {
  return normalizeMerchantForRag(merchant, category).replace(/[^a-z0-9]/g, '');
}

export function buildRagDocuments({
  transactions,
  budgets,
  goals,
  user,
}: BuildRagDocumentsParams): InsightRagDocument[] {
  const identityDoc: InsightRagDocument = {
    id: 'insight-user-identity',
    kind: 'insight',
    text: [
      'Authenticated User Context',
      `DisplayName: ${user?.displayName || 'Unknown'}`,
      `Email: ${user?.email || 'Unknown'}`,
      `Uid: ${user?.id || 'Unknown'}`,
    ].join('\n'),
    tags: ['insight', 'identity', 'user-profile'],
  };

  const yearlySummaryDocs: InsightRagDocument[] = (() => {
    const years = new Set<number>();
    transactions.forEach((transaction) => {
      const date = parseISO(transaction.date);
      if (!Number.isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });

    return Array.from(years)
      .sort((a, b) => b - a)
      .map((year) => {
        const yearTransactions = transactions.filter((transaction) => {
          const date = parseISO(transaction.date);
          return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
        });
        const expenses = yearTransactions.filter((transaction) => transaction.amount < 0);
        const incomes = yearTransactions.filter((transaction) => transaction.amount > 0);
        const totalExpenses = Math.abs(expenses.reduce((sum, transaction) => sum + transaction.amount, 0));
        const totalIncome = incomes.reduce((sum, transaction) => sum + transaction.amount, 0);
        const largestExpense = expenses
          .slice()
          .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

        return {
          id: `insight-year-${year}`,
          kind: 'insight' as const,
          text: [
            `Yearly Financial Summary: ${year}`,
            `TotalIncome: ${totalIncome.toFixed(2)}`,
            `TotalExpenses: ${totalExpenses.toFixed(2)}`,
            `NetCashFlow: ${(totalIncome - totalExpenses).toFixed(2)}`,
            `TransactionCount: ${yearTransactions.length}`,
            `LargestExpense: ${
              largestExpense
                ? `${largestExpense.merchant} (${largestExpense.category}) ${Math.abs(largestExpense.amount).toFixed(2)}`
                : 'None'
            }`,
          ].join('\n'),
          tags: ['insight', 'yearly-summary', String(year)],
        };
      });
  })();

  const allTimeLargestExpensesDoc: InsightRagDocument = {
    id: 'insight-largest-expenses-all-time',
    kind: 'insight',
    text: [
      'All-Time Largest Expenses',
      ...transactions
        .filter((transaction) => transaction.amount < 0)
        .slice()
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 10)
        .map(
          (transaction) =>
            `${transaction.date} | ${transaction.merchant} | ${transaction.category} | ${Math.abs(transaction.amount).toFixed(2)}`,
        ),
    ].join('\n'),
    tags: ['insight', 'largest-expenses', 'all-time'],
  };

  const merchantSummaryDocs: InsightRagDocument[] = Array.from(
    transactions.reduce((acc, transaction) => {
      const merchantMatchKey = buildMerchantMatchKey(
        transaction.normalizedMerchant || transaction.merchant,
        transaction.category,
      );
      const normalizedMerchant = normalizeMerchantForRag(
        transaction.normalizedMerchant || transaction.merchant,
        transaction.category,
      );
      const existing = acc.get(merchantMatchKey) || {
        merchant: transaction.merchant,
        normalizedMerchant,
        merchantMatchKey,
        categories: new Map<string, number>(),
        totalSpent: 0,
        totalIncome: 0,
        count: 0,
        latestDate: transaction.date,
      };

      existing.count += 1;
      existing.latestDate = existing.latestDate > transaction.date ? existing.latestDate : transaction.date;
      if (transaction.amount < 0) {
        existing.totalSpent += Math.abs(transaction.amount);
      } else {
        existing.totalIncome += transaction.amount;
      }
      existing.categories.set(
        transaction.category,
        (existing.categories.get(transaction.category) || 0) + 1,
      );

      acc.set(merchantMatchKey, existing);
      return acc;
    }, new Map<string, {
      merchant: string;
      normalizedMerchant: string;
      merchantMatchKey: string;
      categories: Map<string, number>;
      totalSpent: number;
      totalIncome: number;
      count: number;
      latestDate: string;
    }>())
      .values(),
  )
    .sort((a, b) => b.totalSpent - a.totalSpent || b.count - a.count)
    .slice(0, MAX_MERCHANT_SUMMARY_DOCS)
    .map((merchant) => ({
      id: `merchant-summary-${merchant.merchantMatchKey}`,
      kind: 'insight' as const,
      text: [
        `Merchant Summary: ${merchant.merchant}`,
        `MerchantNormalized: ${merchant.normalizedMerchant}`,
        `MerchantMatchKey: ${merchant.merchantMatchKey}`,
        `TransactionCount: ${merchant.count}`,
        `TotalSpent: ${merchant.totalSpent.toFixed(2)}`,
        `TotalIncome: ${merchant.totalIncome.toFixed(2)}`,
        `LatestTransactionDate: ${merchant.latestDate}`,
        `TopCategories: ${Array.from(merchant.categories.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([category, count]) => `${category} (${count})`)
          .join('; ') || 'None'}`,
      ].join('\n'),
      tags: ['insight', 'merchant-summary', merchant.merchantMatchKey, merchant.normalizedMerchant],
      metadata: {
        merchant: merchant.merchant,
        normalizedMerchant: merchant.normalizedMerchant,
        merchantMatchKey: merchant.merchantMatchKey,
        transactionCount: merchant.count,
        totalSpent: Number(merchant.totalSpent.toFixed(2)),
        latestTransactionDate: merchant.latestDate,
      },
    }));

  const categorySummaryDocs: InsightRagDocument[] = Array.from(
    transactions.reduce((acc, transaction) => {
      const existing = acc.get(transaction.category) || {
        category: transaction.category,
        count: 0,
        totalSpent: 0,
        totalIncome: 0,
        latestDate: transaction.date,
      };

      existing.count += 1;
      existing.latestDate = existing.latestDate > transaction.date ? existing.latestDate : transaction.date;
      if (transaction.amount < 0) {
        existing.totalSpent += Math.abs(transaction.amount);
      } else {
        existing.totalIncome += transaction.amount;
      }

      acc.set(transaction.category, existing);
      return acc;
    }, new Map<string, {
      category: string;
      count: number;
      totalSpent: number;
      totalIncome: number;
      latestDate: string;
    }>())
      .values(),
  )
    .sort((a, b) => b.totalSpent - a.totalSpent || b.count - a.count)
    .slice(0, MAX_CATEGORY_SUMMARY_DOCS)
    .map((category) => ({
      id: `category-summary-${category.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      kind: 'insight' as const,
      text: [
        `Category Summary: ${category.category}`,
        `TransactionCount: ${category.count}`,
        `TotalSpent: ${category.totalSpent.toFixed(2)}`,
        `TotalIncome: ${category.totalIncome.toFixed(2)}`,
        `LatestTransactionDate: ${category.latestDate}`,
      ].join('\n'),
      tags: ['insight', 'category-summary', category.category.toLowerCase()],
      metadata: {
        category: category.category,
        categoryLower: category.category.toLowerCase(),
        transactionCount: category.count,
        totalSpent: Number(category.totalSpent.toFixed(2)),
        latestTransactionDate: category.latestDate,
      },
    }));

  const monthlySummaryDocs: InsightRagDocument[] = Array.from({ length: 6 }, (_, offset) => {
    const monthDate = subMonths(new Date(), offset);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthId = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const monthTransactions = transactions.filter((transaction) => {
      const date = parseISO(transaction.date);
      return date >= monthStart && date <= monthEnd;
    });
    const expenses = monthTransactions.filter((transaction) => transaction.amount < 0);
    const incomes = monthTransactions.filter((transaction) => transaction.amount > 0);
    const totalExpenses = Math.abs(expenses.reduce((sum, transaction) => sum + transaction.amount, 0));
    const totalIncome = incomes.reduce((sum, transaction) => sum + transaction.amount, 0);
    const categoryTotals = expenses.reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + Math.abs(transaction.amount);
      return acc;
    }, {} as Record<string, number>);
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => `${category}: ${amount.toFixed(2)}`);
    const largestExpenses = expenses
      .slice()
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 3)
      .map((transaction) => `${transaction.merchant} (${transaction.category}): ${Math.abs(transaction.amount).toFixed(2)}`);

    return {
      id: `insight-month-${monthId}`,
      kind: 'insight' as const,
      text: [
        `Monthly Spending Summary: ${monthLabel}`,
        `MonthId: ${monthId}`,
        `TotalExpenses: ${totalExpenses.toFixed(2)}`,
        `TotalIncome: ${totalIncome.toFixed(2)}`,
        `NetCashFlow: ${(totalIncome - totalExpenses).toFixed(2)}`,
        `TransactionCount: ${monthTransactions.length}`,
        `TopExpenseCategories: ${topCategories.join('; ') || 'None'}`,
        `LargestExpenses: ${largestExpenses.join('; ') || 'None'}`,
      ].join('\n'),
      tags: ['insight', 'monthly-summary', monthId],
    };
  });

  const transactionDocCandidates = Array.from(
    new Map(
      [
        ...transactions
          .slice()
          .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
          .slice(0, MAX_RECENT_TRANSACTION_DOCS),
        ...transactions
          .filter((transaction) => transaction.amount < 0)
          .slice()
          .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
          .slice(0, MAX_LARGEST_TRANSACTION_DOCS),
      ].map((transaction) => [transaction.id, transaction]),
    ).values(),
  );

  const transactionDocs: InsightRagDocument[] = transactionDocCandidates.map((transaction) => {
    const transactionDate = parseISO(transaction.date);
    const monthIndex = Number.isNaN(transactionDate.getTime()) ? null : transactionDate.getMonth() + 1;
    const monthName =
      monthIndex === null
        ? null
        : transactionDate.toLocaleString('en-US', { month: 'long' }).toLowerCase();
    const year = Number.isNaN(transactionDate.getTime()) ? null : transactionDate.getFullYear();
    const merchantLower = transaction.merchant.toLowerCase();
    const normalizedMerchant = normalizeMerchantForRag(
      transaction.normalizedMerchant || transaction.merchant,
      transaction.category,
    );
    const merchantMatchKey = buildMerchantMatchKey(transaction.normalizedMerchant || transaction.merchant, transaction.category);
    const amountAbs = Number(Math.abs(transaction.amount).toFixed(2));

    return {
      id: `tx-${transaction.id}`,
      kind: 'transaction',
      text: [
        `Transaction ${transaction.id}`,
        `TransactionId: ${transaction.id}`,
        `Date: ${transaction.date}`,
        `Merchant: ${transaction.merchant}`,
        `MerchantNormalized: ${normalizedMerchant}`,
        `MerchantMatchKey: ${merchantMatchKey}`,
        `Category: ${transaction.category}`,
        `Amount: ${transaction.amount}`,
        monthName && year ? `MonthLookup: ${monthName} ${year}` : '',
        transaction.notes ? `Notes: ${transaction.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      tags: Array.from(
        new Set([transaction.category.toLowerCase(), merchantLower, normalizedMerchant, merchantMatchKey, 'transaction']),
      ),
      metadata: {
        transactionId: transaction.id,
        merchant: transaction.merchant,
        merchantLower,
        normalizedMerchant,
        merchantMatchKey,
        category: transaction.category,
        categoryLower: transaction.category.toLowerCase(),
        transactionDate: transaction.date,
        transactionYear: year ?? undefined,
        transactionMonth: monthIndex ?? undefined,
        transactionMonthName: monthName ?? undefined,
        amount: transaction.amount,
        amountAbs,
      },
    };
  });

  const budgetDocs: InsightRagDocument[] = budgets.map((budget) => ({
    id: `budget-${budget.id}`,
    kind: 'budget',
    text: [
      `Budget ${budget.id}`,
      `Category: ${budget.category}`,
      `Month: ${budget.month}`,
      `Amount: ${budget.amount}`,
      `WarningThreshold: ${budget.warningThreshold}`,
      `LimitThreshold: ${budget.limitThreshold}`,
    ].join('\n'),
    tags: [budget.category.toLowerCase(), budget.month, 'budget'],
  }));

  const goalDocs: InsightRagDocument[] = goals.map((goal) => ({
    id: `goal-${goal.id}`,
    kind: 'goal',
    text: [
      `Goal ${goal.id}`,
      `Name: ${goal.name}`,
      `TargetAmount: ${goal.targetAmount}`,
      `CurrentAmount: ${goal.currentAmount}`,
      goal.deadline ? `Deadline: ${goal.deadline}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    tags: ['goal', goal.name.toLowerCase()],
  }));

  return [
    identityDoc,
    allTimeLargestExpensesDoc,
    ...yearlySummaryDocs,
    ...monthlySummaryDocs,
    ...merchantSummaryDocs,
    ...categorySummaryDocs,
    ...transactionDocs,
    ...budgetDocs,
    ...goalDocs,
  ];
}
