import type { Budget, Category, Goal, Transaction } from '@pocketpilot/core';

export interface DataStoreAdapter {
  watchTransactions(userId: string, cb: (rows: Transaction[]) => void): () => void;
  watchBudgets(userId: string, cb: (rows: Budget[]) => void): () => void;
  watchGoals(userId: string, cb: (rows: Goal[]) => void): () => void;
  watchCategories(userId: string, cb: (rows: Category[]) => void): () => void;

  addTransaction(userId: string, input: Omit<Transaction, 'id'>): Promise<void>;
  updateTransaction(userId: string, id: string, input: Partial<Transaction>): Promise<void>;
  deleteTransaction(userId: string, id: string): Promise<void>;

  addBudget(userId: string, input: Omit<Budget, 'id'>): Promise<void>;
  updateBudget(userId: string, id: string, input: Partial<Budget>): Promise<void>;
  deleteBudget(userId: string, id: string): Promise<void>;

  addGoal(userId: string, input: Omit<Goal, 'id'>): Promise<void>;
  updateGoal(userId: string, id: string, input: Partial<Goal>): Promise<void>;
  deleteGoal(userId: string, id: string): Promise<void>;

  addCategory(userId: string, input: Omit<Category, 'id'>): Promise<void>;
  clearAllUserData(userId: string): Promise<void>;
}
