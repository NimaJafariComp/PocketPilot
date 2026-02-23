import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { type Budget, type Category, DEFAULT_CATEGORIES, type Goal, type Transaction } from '../types';
import { useAuth } from './AuthContext';
import { services } from '../lib/services';

interface DataContextType {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  categories: Category[];
  loading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  importTransactions: (transactions: Omit<Transaction, 'id'>[]) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const seededCategoriesForUser = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setCategories([]);
      setLoading(false);
      seededCategoriesForUser.current = null;
      return;
    }

    setLoading(true);

    const unsubTransactions = services.dataStore.watchTransactions(user.id, (rows) => {
      setTransactions(rows as Transaction[]);
    });

    const unsubBudgets = services.dataStore.watchBudgets(user.id, (rows) => {
      setBudgets(rows as Budget[]);
    });

    const unsubGoals = services.dataStore.watchGoals(user.id, (rows) => {
      setGoals(rows as Goal[]);
    });

    const unsubCategories = services.dataStore.watchCategories(user.id, (rows) => {
      const typedRows = rows as Category[];
      setCategories(typedRows);

      if (typedRows.length === 0 && seededCategoriesForUser.current !== user.id) {
        seededCategoriesForUser.current = user.id;
        Promise.all(
          DEFAULT_CATEGORIES.map((category) =>
            services.dataStore.addCategory(user.id, {
              name: category.name,
              color: category.color,
              icon: category.icon,
            }),
          ),
        ).catch(() => {
          seededCategoriesForUser.current = null;
        });
      }

      setLoading(false);
    });

    return () => {
      unsubTransactions();
      unsubBudgets();
      unsubGoals();
      unsubCategories();
    };
  }, [user, authLoading]);

  async function addTransaction(transaction: Omit<Transaction, 'id'>) {
    if (!user) return;
    await services.dataStore.addTransaction(user.id, transaction as never);
  }

  async function updateTransaction(id: string, updates: Partial<Transaction>) {
    if (!user) return;
    await services.dataStore.updateTransaction(user.id, id, updates as never);
  }

  async function deleteTransaction(id: string) {
    if (!user) return;
    await services.dataStore.deleteTransaction(user.id, id);
  }

  async function importTransactions(newTransactions: Omit<Transaction, 'id'>[]) {
    if (!user || newTransactions.length === 0) return;
    await Promise.all(newTransactions.map((tx) => services.dataStore.addTransaction(user.id, tx as never)));
  }

  async function addBudget(budget: Omit<Budget, 'id'>) {
    if (!user) return;
    await services.dataStore.addBudget(user.id, budget as never);
  }

  async function updateBudget(id: string, updates: Partial<Budget>) {
    if (!user) return;
    await services.dataStore.updateBudget(user.id, id, updates as never);
  }

  async function deleteBudget(id: string) {
    if (!user) return;
    await services.dataStore.deleteBudget(user.id, id);
  }

  async function addGoal(goal: Omit<Goal, 'id'>) {
    if (!user) return;
    await services.dataStore.addGoal(user.id, goal as never);
  }

  async function updateGoal(id: string, updates: Partial<Goal>) {
    if (!user) return;
    await services.dataStore.updateGoal(user.id, id, updates as never);
  }

  async function deleteGoal(id: string) {
    if (!user) return;
    await services.dataStore.deleteGoal(user.id, id);
  }

  async function addCategory(category: Omit<Category, 'id'>) {
    if (!user) return;
    await services.dataStore.addCategory(user.id, category as never);
  }

  async function clearAllData() {
    if (!user) return;
    await services.dataStore.clearAllUserData(user.id);

    await Promise.all(
      DEFAULT_CATEGORIES.map((category) =>
        services.dataStore.addCategory(user.id, {
          name: category.name,
          color: category.color,
          icon: category.icon,
        }),
      ),
    );
  }

  const value = useMemo<DataContextType>(
    () => ({
      transactions,
      budgets,
      goals,
      categories,
      loading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addGoal,
      updateGoal,
      deleteGoal,
      addCategory,
      importTransactions,
      clearAllData,
    }),
    [transactions, budgets, goals, categories, loading],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
