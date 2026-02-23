import type { DataStoreAdapter } from '../interfaces/data-store';

export const dataStoreFirestoreMobile: DataStoreAdapter = {
  watchTransactions() {
    throw new Error('Not wired: dataStoreFirestoreMobile.watchTransactions');
  },
  watchBudgets() {
    throw new Error('Not wired: dataStoreFirestoreMobile.watchBudgets');
  },
  watchGoals() {
    throw new Error('Not wired: dataStoreFirestoreMobile.watchGoals');
  },
  watchCategories() {
    throw new Error('Not wired: dataStoreFirestoreMobile.watchCategories');
  },
  async addTransaction() {
    throw new Error('Not wired: dataStoreFirestoreMobile.addTransaction');
  },
  async updateTransaction() {
    throw new Error('Not wired: dataStoreFirestoreMobile.updateTransaction');
  },
  async deleteTransaction() {
    throw new Error('Not wired: dataStoreFirestoreMobile.deleteTransaction');
  },
  async addBudget() {
    throw new Error('Not wired: dataStoreFirestoreMobile.addBudget');
  },
  async updateBudget() {
    throw new Error('Not wired: dataStoreFirestoreMobile.updateBudget');
  },
  async deleteBudget() {
    throw new Error('Not wired: dataStoreFirestoreMobile.deleteBudget');
  },
  async addGoal() {
    throw new Error('Not wired: dataStoreFirestoreMobile.addGoal');
  },
  async updateGoal() {
    throw new Error('Not wired: dataStoreFirestoreMobile.updateGoal');
  },
  async deleteGoal() {
    throw new Error('Not wired: dataStoreFirestoreMobile.deleteGoal');
  },
  async addCategory() {
    throw new Error('Not wired: dataStoreFirestoreMobile.addCategory');
  },
  async clearAllUserData() {
    throw new Error('Not wired: dataStoreFirestoreMobile.clearAllUserData');
  }
};
