import {
  addDoc,
  type CollectionReference,
  collection,
  type DocumentData,
  deleteDoc,
  doc,
  type Firestore,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import type { DataStoreAdapter } from "../interfaces/data-store";

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

export function createDataStoreFirestoreWeb(db: Firestore): DataStoreAdapter {
  return {
    watchTransactions(userId, cb) {
      const refs = getUserCollections(db, userId);
      return onSnapshot(refs.transactions, (snapshot) => {
        const rows = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as object) }))
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
        cb(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as never);
      });
    },

    watchGoals(userId, cb) {
      const refs = getUserCollections(db, userId);
      return onSnapshot(refs.goals, (snapshot) => {
        cb(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as never);
      });
    },

    watchCategories(userId, cb) {
      const refs = getUserCollections(db, userId);
      return onSnapshot(refs.categories, (snapshot) => {
        cb(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as never);
      });
    },

    async addTransaction(userId, input) {
      const refs = getUserCollections(db, userId);
      await addDoc(refs.transactions, input);
    },

    async updateTransaction(userId, id, input) {
      const refs = getUserCollections(db, userId);
      await updateDoc(doc(refs.transactions, id), stripId(input as never));
    },

    async deleteTransaction(userId, id) {
      const refs = getUserCollections(db, userId);
      await deleteDoc(doc(refs.transactions, id));
    },

    async addBudget(userId, input) {
      const refs = getUserCollections(db, userId);
      await addDoc(refs.budgets, input);
    },

    async updateBudget(userId, id, input) {
      const refs = getUserCollections(db, userId);
      await updateDoc(doc(refs.budgets, id), stripId(input as never));
    },

    async deleteBudget(userId, id) {
      const refs = getUserCollections(db, userId);
      await deleteDoc(doc(refs.budgets, id));
    },

    async addGoal(userId, input) {
      const refs = getUserCollections(db, userId);
      await addDoc(refs.goals, input);
    },

    async updateGoal(userId, id, input) {
      const refs = getUserCollections(db, userId);
      await updateDoc(doc(refs.goals, id), stripId(input as never));
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

      for (let i = 0; i < allDocs.length; i += 450) {
        const batch = writeBatch(db);
        allDocs.slice(i, i + 450).forEach((entry) => {
          batch.delete(entry.ref);
        });
        await batch.commit();
      }
    },
  };
}
