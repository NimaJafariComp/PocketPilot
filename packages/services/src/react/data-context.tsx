import {
  type Budget,
  buildRagDocuments,
  type Category,
  DEFAULT_CATEGORIES,
  type Goal,
  partitionNewTransactions,
  type Transaction,
} from "@pocketpilot/core";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RagDocument } from "../interfaces/rag";
import { useAuth } from "./auth-context";
import { useServices } from "./services-provider";

export interface DataContextValue {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  categories: Category[];
  loading: boolean;
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, "id">) => Promise<void>;
  updateBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, "id">) => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, "id">) => Promise<void>;
  importTransactions: (
    transactions: Omit<Transaction, "id">[]
  ) => Promise<ImportTransactionsResult>;
  clearAllData: () => Promise<void>;
  ragSync: {
    status: "idle" | "scheduled" | "syncing" | "error";
    progressPct: number;
    statusText: string;
    isChatAvailable: boolean;
    lastError: string;
  };
}

export interface ImportTransactionsResult {
  imported: number;
  skippedDuplicates: number;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);
const AUTO_CATEGORY_PLACEHOLDER = "Uncategorized";
const RAG_SYNC_BATCH_SIZE = 25;

function serializeRagDocument(document: RagDocument): string {
  return JSON.stringify([
    document.kind,
    document.text,
    document.tags || [],
    document.metadata || {},
  ]);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function DataProvider({ children }: PropsWithChildren) {
  const services = useServices();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const seededCategoriesForUser = useRef<string | null>(null);
  const backfillInFlight = useRef(false);
  const backfilledTransactionIds = useRef<Set<string>>(new Set());
  const ragSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ragSyncVersion = useRef(0);
  const lastSyncedRagDocs = useRef<Map<string, string>>(new Map());
  const ragSyncInFlight = useRef(false);
  const queuedRagSync = useRef<{
    changedDocuments: RagDocument[];
    removedIds: string[];
    totalOperations: number;
  } | null>(null);
  const [ragSync, setRagSync] = useState<DataContextValue["ragSync"]>({
    status: "idle",
    progressPct: 100,
    statusText: "Insights index is ready",
    isChatAvailable: true,
    lastError: "",
  });

  const ragDocuments = useMemo(
    () =>
      buildRagDocuments({
        transactions,
        budgets,
        goals,
        user,
      }),
    [budgets, goals, transactions, user]
  );

  const ragDocumentMap = useMemo(
    () =>
      new Map(
        ragDocuments.map(
          (document) =>
            [document.id, { document, signature: serializeRagDocument(document) }] as const
        )
      ),
    [ragDocuments]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setCategories([]);
      setLoading(false);
      seededCategoriesForUser.current = null;
      backfilledTransactionIds.current = new Set();
      backfillInFlight.current = false;
      if (ragSyncTimer.current) {
        clearTimeout(ragSyncTimer.current);
        ragSyncTimer.current = null;
      }
      ragSyncVersion.current = 0;
      lastSyncedRagDocs.current = new Map();
      ragSyncInFlight.current = false;
      queuedRagSync.current = null;
      setRagSync({
        status: "idle",
        progressPct: 100,
        statusText: "Insights index is ready",
        isChatAvailable: true,
        lastError: "",
      });
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
            })
          )
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
  }, [authLoading, services, user]);

  useEffect(() => {
    if (!user || loading || backfillInFlight.current) {
      return;
    }

    const targets = transactions
      .filter(
        (transaction) =>
          transaction.category === AUTO_CATEGORY_PLACEHOLDER &&
          !transaction.categorySource &&
          !backfilledTransactionIds.current.has(transaction.id)
      )
      .slice(0, 10);

    if (targets.length === 0) {
      return;
    }

    backfillInFlight.current = true;
    targets.forEach((transaction) => {
      backfilledTransactionIds.current.add(transaction.id);
    });

    const run = async () => {
      try {
        const results = await services.categorization.categorizeTransactions({
          transactions: targets.map((transaction) => ({
            merchant: transaction.merchant,
            amount: transaction.amount,
            notes: transaction.notes ?? "",
          })),
          categories: getAvailableCategoryNames(),
        });

        await Promise.all(
          targets.map((transaction, index) => {
            const result = results[index];
            const updates = result
              ? {
                  category: result.category,
                  categorySource: result.categorySource,
                  categoryConfidence: result.categoryConfidence,
                  categoryNeedsReview: result.categoryNeedsReview,
                  normalizedMerchant: result.normalizedMerchant,
                }
              : {
                  category: AUTO_CATEGORY_PLACEHOLDER,
                  categorySource: "auto-ai" as const,
                  categoryConfidence: 0,
                  categoryNeedsReview: true,
                };

            return services.dataStore.updateTransaction(user.id, transaction.id, updates as never);
          })
        );
      } catch {
        targets.forEach((transaction) => {
          backfilledTransactionIds.current.delete(transaction.id);
        });
      } finally {
        backfillInFlight.current = false;
      }
    };

    void run();
  }, [categories, loading, services, transactions, user]);

  useEffect(() => {
    if (!user || authLoading || loading) {
      return;
    }

    const changedDocuments = ragDocuments.filter((document) => {
      const current = ragDocumentMap.get(document.id);
      const previousSignature = lastSyncedRagDocs.current.get(document.id);
      return current ? current.signature !== previousSignature : false;
    });
    const removedIds = Array.from(lastSyncedRagDocs.current.keys()).filter(
      (id) => !ragDocumentMap.has(id)
    );
    const totalOperations = changedDocuments.length + removedIds.length;

    if (totalOperations === 0) {
      setRagSync((prev) =>
        prev.status === "idle"
          ? prev
          : {
              status: "idle",
              progressPct: 100,
              statusText: "Insights index is ready",
              isChatAvailable: true,
              lastError: "",
            }
      );
      return;
    }

    const runSync = (
      documents: RagDocument[],
      idsToRemove: string[],
      operationTotal: number,
      version: number
    ) => {
      ragSyncInFlight.current = true;
      setRagSync({
        status: "syncing",
        progressPct: 0,
        statusText: "Syncing insights index... 0%",
        isChatAvailable: false,
        lastError: "",
      });

      const batches = chunkArray(documents, RAG_SYNC_BATCH_SIZE);
      const totalBatches = Math.max(batches.length, idsToRemove.length > 0 ? 1 : 0, 1);
      let processedSoFar = 0;

      const syncSequence = async () => {
        if (documents.length === 0 && idsToRemove.length > 0) {
          const result = await services.rag.syncIndex({
            documents: [],
            removedIds: idsToRemove,
            batchIndex: 1,
            batchCount: 1,
            totalOperations: operationTotal,
          });
          processedSoFar += result.processed;
          const progressPct =
            operationTotal > 0
              ? Math.min(100, Math.round((processedSoFar / operationTotal) * 100))
              : 100;
          setRagSync({
            status: "syncing",
            progressPct,
            statusText: `Syncing insights index... ${progressPct}%`,
            isChatAvailable: false,
            lastError: "",
          });
        } else {
          for (let index = 0; index < batches.length; index += 1) {
            const result = await services.rag.syncIndex({
              documents: batches[index],
              removedIds: index === 0 ? idsToRemove : [],
              batchIndex: index + 1,
              batchCount: totalBatches,
              totalOperations: operationTotal,
            });
            processedSoFar += result.processed;
            const progressPct =
              operationTotal > 0
                ? Math.min(100, Math.round((processedSoFar / operationTotal) * 100))
                : 100;
            setRagSync({
              status: "syncing",
              progressPct,
              statusText: `Syncing insights index... ${progressPct}%`,
              isChatAvailable: false,
              lastError: "",
            });
          }
        }
      };

      void syncSequence()
        .then(() => {
          if (ragSyncVersion.current === version) {
            documents.forEach((document) => {
              const current = ragDocumentMap.get(document.id);
              if (current) {
                lastSyncedRagDocs.current.set(document.id, current.signature);
              }
            });
            idsToRemove.forEach((id) => {
              lastSyncedRagDocs.current.delete(id);
            });
            setRagSync({
              status: "idle",
              progressPct: 100,
              statusText: "Insights index is ready",
              isChatAvailable: true,
              lastError: "",
            });
          }
        })
        .catch((error) => {
          console.error("RAG index sync failed", error);
          setRagSync({
            status: "error",
            progressPct: 100,
            statusText: "Insights sync failed",
            isChatAvailable: true,
            lastError: error instanceof Error ? error.message : "Insights sync failed",
          });
        })
        .finally(() => {
          ragSyncInFlight.current = false;
          const queued = queuedRagSync.current;
          queuedRagSync.current = null;

          if (queued && queued.totalOperations > 0) {
            ragSyncVersion.current += 1;
            const queuedVersion = ragSyncVersion.current;
            setRagSync({
              status: "scheduled",
              progressPct: 0,
              statusText: "Insights sync queued...",
              isChatAvailable: false,
              lastError: "",
            });
            ragSyncTimer.current = setTimeout(() => {
              ragSyncTimer.current = null;
              runSync(
                queued.changedDocuments,
                queued.removedIds,
                queued.totalOperations,
                queuedVersion
              );
            }, 1000);
          }
        });
    };

    ragSyncVersion.current += 1;
    const syncVersion = ragSyncVersion.current;
    const scheduledDocuments = changedDocuments;
    const scheduledRemovedIds = removedIds;

    if (ragSyncTimer.current) {
      clearTimeout(ragSyncTimer.current);
    }

    setRagSync({
      status: "scheduled",
      progressPct: 0,
      statusText: "Insights sync scheduled...",
      isChatAvailable: false,
      lastError: "",
    });

    ragSyncTimer.current = setTimeout(() => {
      ragSyncTimer.current = null;
      if (ragSyncInFlight.current) {
        queuedRagSync.current = {
          changedDocuments: scheduledDocuments,
          removedIds: scheduledRemovedIds,
          totalOperations,
        };
        return;
      }

      runSync(scheduledDocuments, scheduledRemovedIds, totalOperations, syncVersion);
    }, 10000);

    return () => {
      if (ragSyncTimer.current) {
        clearTimeout(ragSyncTimer.current);
        ragSyncTimer.current = null;
      }
    };
  }, [authLoading, loading, ragDocumentMap, ragDocuments, services, user]);

  function getAvailableCategoryNames() {
    const categoryNames = (categories.length > 0 ? categories : DEFAULT_CATEGORIES).map(
      (category) => category.name
    );
    return Array.from(new Set(categoryNames));
  }

  async function categorizeIfNeeded(
    transaction: Omit<Transaction, "id">,
    mode: "manual" | "imported"
  ): Promise<Omit<Transaction, "id">> {
    const baseTransaction = {
      ...transaction,
      notes: transaction.notes ?? "",
    };

    if (baseTransaction.category && baseTransaction.category !== AUTO_CATEGORY_PLACEHOLDER) {
      return {
        ...baseTransaction,
        categorySource: mode,
        categoryConfidence: 1,
        categoryNeedsReview: false,
      };
    }

    const [result] = await services.categorization.categorizeTransactions({
      transactions: [
        {
          merchant: baseTransaction.merchant,
          amount: baseTransaction.amount,
          notes: baseTransaction.notes,
        },
      ],
      categories: getAvailableCategoryNames(),
    });

    if (!result) {
      return {
        ...baseTransaction,
        category: AUTO_CATEGORY_PLACEHOLDER,
        categorySource: "auto-ai",
        categoryConfidence: 0,
        categoryNeedsReview: true,
      };
    }

    return {
      ...baseTransaction,
      category: result.category,
      categorySource: result.categorySource,
      categoryConfidence: result.categoryConfidence,
      categoryNeedsReview: result.categoryNeedsReview,
      normalizedMerchant: result.normalizedMerchant,
    };
  }

  async function categorizeManyIfNeeded(
    newTransactions: Omit<Transaction, "id">[]
  ): Promise<Omit<Transaction, "id">[]> {
    const prepared = newTransactions.map((transaction) => ({
      ...transaction,
      notes: transaction.notes ?? "",
    }));

    const pendingIndices = prepared
      .map((transaction, index) =>
        !transaction.category || transaction.category === AUTO_CATEGORY_PLACEHOLDER ? index : -1
      )
      .filter((index) => index >= 0);

    const categorized = prepared.map((transaction) =>
      transaction.category && transaction.category !== AUTO_CATEGORY_PLACEHOLDER
        ? {
            ...transaction,
            categorySource: "imported" as const,
            categoryConfidence: 1,
            categoryNeedsReview: false,
          }
        : transaction
    );

    if (pendingIndices.length === 0) {
      return categorized;
    }

    const results = await services.categorization.categorizeTransactions({
      transactions: pendingIndices.map((index) => ({
        merchant: prepared[index].merchant,
        amount: prepared[index].amount,
        notes: prepared[index].notes,
      })),
      categories: getAvailableCategoryNames(),
    });

    pendingIndices.forEach((transactionIndex, resultIndex) => {
      const result = results[resultIndex];
      categorized[transactionIndex] = result
        ? {
            ...prepared[transactionIndex],
            category: result.category,
            categorySource: result.categorySource,
            categoryConfidence: result.categoryConfidence,
            categoryNeedsReview: result.categoryNeedsReview,
            normalizedMerchant: result.normalizedMerchant,
          }
        : {
            ...prepared[transactionIndex],
            category: AUTO_CATEGORY_PLACEHOLDER,
            categorySource: "auto-ai",
            categoryConfidence: 0,
            categoryNeedsReview: true,
          };
    });

    return categorized;
  }

  async function addTransaction(transaction: Omit<Transaction, "id">) {
    if (!user) return;
    const hadExplicitCategory =
      !!transaction.category && transaction.category !== AUTO_CATEGORY_PLACEHOLDER;
    const prepared = await categorizeIfNeeded(transaction, "manual");
    await services.dataStore.addTransaction(user.id, prepared as never);

    if (
      hadExplicitCategory &&
      prepared.category &&
      prepared.category !== AUTO_CATEGORY_PLACEHOLDER
    ) {
      await services.categorization.learnMerchantCategory({
        merchant: prepared.merchant,
        category: prepared.category,
      });
    }
  }

  async function updateTransaction(id: string, updates: Partial<Transaction>) {
    if (!user) return;
    await services.dataStore.updateTransaction(user.id, id, updates as never);
  }

  async function deleteTransaction(id: string) {
    if (!user) return;
    await services.dataStore.deleteTransaction(user.id, id);
  }

  async function importTransactions(
    newTransactions: Omit<Transaction, "id">[]
  ): Promise<ImportTransactionsResult> {
    if (!user || newTransactions.length === 0) {
      return { imported: 0, skippedDuplicates: 0 };
    }

    // Statements from different banks (or re-imports of the same file) may
    // overlap; only rows not already in the workspace are written.
    const { unique, duplicateCount } = partitionNewTransactions(transactions, newTransactions);
    if (unique.length === 0) {
      return { imported: 0, skippedDuplicates: duplicateCount };
    }

    const preparedTransactions = await categorizeManyIfNeeded(unique);
    await Promise.all(
      preparedTransactions.map((tx) => services.dataStore.addTransaction(user.id, tx as never))
    );

    const rememberedPairs = Array.from(
      new Map(
        preparedTransactions
          .filter(
            (transaction) =>
              transaction.category &&
              transaction.category !== AUTO_CATEGORY_PLACEHOLDER &&
              transaction.categorySource === "imported"
          )
          .map((transaction) => [`${transaction.merchant}::${transaction.category}`, transaction])
      ).values()
    );

    await Promise.all(
      rememberedPairs.map((transaction) =>
        services.categorization.learnMerchantCategory({
          merchant: transaction.merchant,
          category: transaction.category,
        })
      )
    );

    return { imported: preparedTransactions.length, skippedDuplicates: duplicateCount };
  }

  async function addBudget(budget: Omit<Budget, "id">) {
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

  async function addGoal(goal: Omit<Goal, "id">) {
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

  async function addCategory(category: Omit<Category, "id">) {
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
        })
      )
    );
  }

  const value = useMemo<DataContextValue>(
    () => ({
      transactions,
      budgets,
      goals,
      categories,
      loading,
      ragSync,
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
    [budgets, categories, goals, loading, ragSync, transactions]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
}
