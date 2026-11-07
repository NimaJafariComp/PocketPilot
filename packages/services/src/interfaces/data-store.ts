import type { Budget, Category, Contribution, Goal, Transaction } from "@pocketpilot/core";

export interface ImportWriteRequest {
  operationId: string;
  /** Stable account identity; this is not a mutable display label. */
  accountId: string;
  /** Number of rows in the original statement operation, before deduplication. */
  totalRows: number;
  /** Rows already known to exist when this write attempt starts. */
  completedRows: number;
  rows: Transaction[];
}

export interface DataStoreAdapter {
  /** Reads only the caller's membership document; rules deny enumeration. */
  getMembershipStatus(userId: string): Promise<"active" | "not-invited" | "revoked">;
  watchTransactions(userId: string, cb: (rows: Transaction[]) => void): () => void;
  watchBudgets(userId: string, cb: (rows: Budget[]) => void): () => void;
  watchGoals(userId: string, cb: (rows: Goal[]) => void): () => void;
  watchCategories(userId: string, cb: (rows: Category[]) => void): () => void;

  addTransaction(userId: string, operationId: string, input: Omit<Transaction, "id">): Promise<void>;
  writeImportedTransactions(
    userId: string,
    request: ImportWriteRequest
  ): Promise<{ completedRows: number; totalRows: number }>;
  updateTransaction(userId: string, id: string, input: Partial<Transaction>): Promise<void>;
  deleteTransaction(userId: string, id: string): Promise<void>;

  addBudget(userId: string, input: Omit<Budget, "id">): Promise<void>;
  updateBudget(userId: string, id: string, input: Partial<Budget>): Promise<void>;
  deleteBudget(userId: string, id: string): Promise<void>;

  addGoal(userId: string, input: Omit<Goal, "id">): Promise<void>;
  updateGoal(userId: string, id: string, input: Partial<Goal>): Promise<void>;
  addGoalContribution(userId: string, goalId: string, contribution: Contribution): Promise<void>;
  deleteGoal(userId: string, id: string): Promise<void>;

  addCategory(userId: string, input: Omit<Category, "id">): Promise<void>;
  clearAllUserData(userId: string): Promise<void>;
}
