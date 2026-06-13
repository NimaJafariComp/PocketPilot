import type { Category, Transaction } from "../models/index";

export type TransactionListFilter = "all" | "review" | "expense" | "income";
export type TransactionDateFilterType = "all" | "specific" | "range";

export interface TransactionsFilterState {
  merchantFilter: string;
  categoryFilter: string;
  amountFilter: string;
  dateFilterType: TransactionDateFilterType;
  specificDate: string;
  fromDate: string;
  toDate: string;
  listFilter?: TransactionListFilter;
}

export interface TransactionsViewModel {
  filteredTransactions: Transaction[];
  spent: number;
  income: number;
  uncategorizedCount: number;
  needsReviewCount: number;
  hasActiveFilters: boolean;
  totalPages: number;
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionsFilterState = {
  merchantFilter: "",
  categoryFilter: "all",
  amountFilter: "",
  dateFilterType: "all",
  specificDate: "",
  fromDate: "",
  toDate: "",
  listFilter: "all",
};

function getDateKey(isoDate: string) {
  return isoDate.split("T")[0] || isoDate;
}

function matchesAmount(amount: number, rawFilter: string) {
  const amountInput = rawFilter.trim();

  if (amountInput === "") {
    return true;
  }

  const amountAsFixed = Math.abs(amount).toFixed(2);
  const amountDigitsFilter = amountInput.replace(/\D/g, "");
  const [integerPart, decimalPart = ""] = amountAsFixed.split(".");
  const normalizedAmountInput = amountInput.replace(/[^0-9.]/g, "");
  const decimalSearch = normalizedAmountInput.includes(".");
  const decimalQuery = decimalSearch
    ? (normalizedAmountInput.split(".")[1] || "").replace(/\D/g, "")
    : "";

  return (
    (decimalSearch && decimalQuery !== "" && decimalPart.startsWith(decimalQuery)) ||
    (amountDigitsFilter !== "" &&
      (!decimalSearch ? integerPart.startsWith(amountDigitsFilter) : false))
  );
}

export function getTransactionCategoryOptions(categories: Category[]) {
  return ["all", ...categories.map((category) => category.name)];
}

export function buildTransactionsViewModel(
  transactions: Transaction[],
  filters: TransactionsFilterState,
  itemsPerPage = 20
): TransactionsViewModel {
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesMerchant =
      filters.merchantFilter.trim() === "" ||
      transaction.merchant.toLowerCase().includes(filters.merchantFilter.trim().toLowerCase());

    const matchesCategory =
      filters.categoryFilter === "all" || transaction.category === filters.categoryFilter;

    const matchesDate = (() => {
      const transactionDate = getDateKey(transaction.date);

      if (filters.dateFilterType === "specific") {
        return filters.specificDate !== "" && transactionDate === filters.specificDate;
      }

      if (filters.dateFilterType === "range") {
        return (
          (filters.fromDate === "" || transactionDate >= filters.fromDate) &&
          (filters.toDate === "" || transactionDate <= filters.toDate)
        );
      }

      return true;
    })();

    const matchesListFilter =
      filters.listFilter === undefined ||
      filters.listFilter === "all" ||
      (filters.listFilter === "review" &&
        (transaction.categoryNeedsReview || transaction.category === "Uncategorized")) ||
      (filters.listFilter === "expense" && transaction.amount < 0) ||
      (filters.listFilter === "income" && transaction.amount > 0);

    return (
      matchesMerchant &&
      matchesCategory &&
      matchesAmount(transaction.amount, filters.amountFilter) &&
      matchesDate &&
      matchesListFilter
    );
  });

  const spent = filteredTransactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const income = filteredTransactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const uncategorizedCount = transactions.filter(
    (transaction) => transaction.category === "Uncategorized"
  ).length;

  const needsReviewCount = transactions.filter(
    (transaction) => transaction.categoryNeedsReview || transaction.category === "Uncategorized"
  ).length;

  const hasActiveFilters =
    filters.merchantFilter !== "" ||
    filters.categoryFilter !== "all" ||
    filters.amountFilter !== "" ||
    filters.dateFilterType !== "all" ||
    (filters.listFilter !== undefined && filters.listFilter !== "all");

  return {
    filteredTransactions,
    spent,
    income,
    uncategorizedCount,
    needsReviewCount,
    hasActiveFilters,
    totalPages: Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage)),
  };
}

export function paginateTransactions(transactions: Transaction[], page: number, itemsPerPage = 20) {
  return transactions.slice((page - 1) * itemsPerPage, page * itemsPerPage);
}
