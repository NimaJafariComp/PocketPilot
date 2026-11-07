import {
  addDoc,
  type CollectionReference,
  collection,
  type DocumentData,
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  fromStoredBudget,
  fromStoredGoal,
  fromStoredTransaction,
  applyGoalContribution,
  stableBudgetId,
  toStoredBudget,
  toStoredGoal,
  toStoredTransaction,
} from "@pocketpilot/core";
import type { DataStoreAdapter, ImportWriteRequest } from "../interfaces/data-store";

function getUserCollections(db: Firestore, userId: string) {
  const userDoc = doc(db, "users", userId);
  return {
    transactions: collection(userDoc, "transactions") as CollectionReference<DocumentData>,
    budgets: collection(userDoc, "budgets") as CollectionReference<DocumentData>,
    goals: collection(userDoc, "goals") as CollectionReference<DocumentData>,
    categories: collection(userDoc, "categories") as CollectionReference<DocumentData>,
    settings: collection(userDoc, "settings") as CollectionReference<DocumentData>,
  };
}

function stripId<T extends { id: string }>(record: Partial<T>): Omit<Partial<T>, "id"> {
  const { id, ...rest } = record;
  return rest;
}

export function createDataStoreFirestoreMobile(db: Firestore): DataStoreAdapter {
  return {
    async getMembershipStatus(userId) {
      const membership = await getDoc(doc(db, "betaMembers", userId));
      if (!membership.exists()) return "not-invited";
      return membership.data().status === "active" ? "active" : "revoked";
    },
    watchTransactions(userId, cb) {
      const refs = getUserCollections(db, userId);
      return onSnapshot(refs.transactions, (snapshot) => {
        const rows = snapshot.docs
          .map((entry) => fromStoredTransaction({ id: entry.id, ...(entry.data() as object) }))
          .sort(
            (a, b) =>
              new Date((b as { date?: string }).date || 0).getTime() -
              new Date((a as { date?: string }).date || 0).getTime()
          );
        cb(rows as never);
      });
    },
    watchBudgets(userId, cb) {
      const refs = getUserCollections(db, userId);
      return onSnapshot(refs.budgets, (snapshot) => {
        cb(snapshot.docs.map((entry) => fromStoredBudget({ id: entry.id, ...(entry.data() as object) })) as never);
      });
    },
    watchGoals(userId, cb) {
      const refs = getUserCollections(db, userId);
      return onSnapshot(refs.goals, (snapshot) => {
        cb(snapshot.docs.map((entry) => fromStoredGoal({ id: entry.id, ...(entry.data() as object) })) as never);
      });
    },
    watchCategories(userId, cb) {
      const refs = getUserCollections(db, userId);
      return onSnapshot(refs.categories, (snapshot) => {
        cb(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as object) })) as never);
      });
    },
    async addTransaction(userId, operationId, input) {
      const refs = getUserCollections(db, userId);
      await setDoc(doc(refs.transactions, `manual_${operationId}`), toStoredTransaction(input));
    },
    async writeImportedTransactions(userId, request: ImportWriteRequest) {
      const refs = getUserCollections(db, userId);
      const operationRef = doc(doc(db, "users", userId), "importOperations", request.operationId);
      const begin = await runTransaction(db, async (transaction) => {
        const current = await transaction.get(operationRef);
        if (current.exists()) {
          const data = current.data();
          if (data.accountId !== request.accountId || data.totalRows !== request.totalRows) {
            throw new Error("This import identity conflicts with an existing operation.");
          }
          return { completedRows: Number(data.completedRows || 0), complete: data.status === "complete" };
        }
        transaction.set(operationRef, {
          status: "in-progress",
          accountId: request.accountId,
          totalRows: request.totalRows,
          completedRows: request.completedRows,
        });
        return { completedRows: request.completedRows, complete: false };
      });
      if (begin.complete) return { completedRows: request.totalRows, totalRows: request.totalRows };
      const baseCompletedRows = Math.max(begin.completedRows, request.completedRows);
      try {
        for (let offset = 0; offset < request.rows.length; offset += 400) {
          const batch = writeBatch(db);
          for (const row of request.rows.slice(offset, offset + 400)) {
            batch.set(doc(refs.transactions, row.id), toStoredTransaction(row));
          }
          await batch.commit();
          await runTransaction(db, async (transaction) => {
            const current = await transaction.get(operationRef);
            const completedRows = Math.max(
              Number(current.data()?.completedRows || 0),
              Math.min(request.totalRows, baseCompletedRows + Math.min(offset + 400, request.rows.length))
            );
            transaction.set(operationRef, { status: "in-progress", completedRows }, { merge: true });
          });
        }
        await runTransaction(db, async (transaction) => {
          const current = await transaction.get(operationRef);
          transaction.set(operationRef, {
            status: "complete",
            completedRows: Math.max(Number(current.data()?.completedRows || 0), request.totalRows),
          }, { merge: true });
        });
      } catch (error) {
        await setDoc(operationRef, { status: "failed", error: error instanceof Error ? error.message.slice(0, 240) : "Import write failed" }, { merge: true });
        throw error;
      }
      return { completedRows: request.totalRows, totalRows: request.totalRows };
    },
    async updateTransaction(userId, id, input) {
      const refs = getUserCollections(db, userId);
      const ref = doc(refs.transactions, id);
      const existing = await getDoc(ref);
      if (!existing.exists()) throw new Error("Transaction no longer exists");
      const current = fromStoredTransaction({ id, ...(existing.data() as object) });
      await setDoc(ref, toStoredTransaction({ ...current, ...stripId(input as never) }));
    },
    async deleteTransaction(userId, id) {
      const refs = getUserCollections(db, userId);
      await deleteDoc(doc(refs.transactions, id));
    },
    async addBudget(userId, input) {
      const refs = getUserCollections(db, userId);
      const ref = doc(refs.budgets, stableBudgetId(input.month, input.category));
      await runTransaction(db, async (transaction) => {
        if ((await transaction.get(ref)).exists()) throw new Error("A budget already exists for this category and month");
        transaction.set(ref, toStoredBudget({ ...input, id: "" }));
      });
    },
    async updateBudget(userId, id, input) {
      const refs = getUserCollections(db, userId);
      const ref = doc(refs.budgets, id);
      const existing = await getDoc(ref);
      if (!existing.exists()) throw new Error("Budget no longer exists");
      const current = fromStoredBudget({ id, ...(existing.data() as object) });
      await setDoc(ref, toStoredBudget({ ...current, ...stripId(input as never) }));
    },
    async deleteBudget(userId, id) {
      const refs = getUserCollections(db, userId);
      await deleteDoc(doc(refs.budgets, id));
    },
    async addGoal(userId, input) {
      const refs = getUserCollections(db, userId);
      await addDoc(refs.goals, toStoredGoal({ ...input, id: "" }));
    },
    async updateGoal(userId, id, input) {
      const refs = getUserCollections(db, userId);
      const ref = doc(refs.goals, id);
      const existing = await getDoc(ref);
      if (!existing.exists()) throw new Error("Goal no longer exists");
      const current = fromStoredGoal({ id, ...(existing.data() as object) });
      await setDoc(ref, toStoredGoal({ ...current, ...stripId(input as never) }));
    },
    async addGoalContribution(userId, id, contribution) {
      const refs = getUserCollections(db, userId);
      const ref = doc(refs.goals, id);
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(ref);
        if (!existing.exists()) throw new Error("Goal no longer exists");
        const current = fromStoredGoal({ id, ...(existing.data() as object) });
        transaction.set(ref, toStoredGoal(applyGoalContribution(current, contribution)));
      });
    },
    async deleteGoal(userId, id) {
      const refs = getUserCollections(db, userId);
      await deleteDoc(doc(refs.goals, id));
    },
    async addCategory(userId, input) {
      const refs = getUserCollections(db, userId);
      const categoryDoc = doc(refs.categories);
      await setDoc(categoryDoc, input);
    },
    async clearAllUserData(userId) {
      const refs = getUserCollections(db, userId);
      const [txDocs, budgetDocs, goalDocs, categoryDocs, settingsDocs] = await Promise.all([
        getDocs(refs.transactions),
        getDocs(refs.budgets),
        getDocs(refs.goals),
        getDocs(refs.categories),
        getDocs(refs.settings),
      ]);

      const allDocs = [
        ...txDocs.docs,
        ...budgetDocs.docs,
        ...goalDocs.docs,
        ...categoryDocs.docs,
        ...settingsDocs.docs,
      ];

      for (let index = 0; index < allDocs.length; index += 450) {
        const batch = writeBatch(db);
        allDocs.slice(index, index + 450).forEach((entry) => {
          batch.delete(entry.ref);
        });
        await batch.commit();
      }
    },
  };
}
