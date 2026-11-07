import { readFile } from "node:fs/promises";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

let env: RulesTestEnvironment;
const transaction = { date: "2026-09-19", merchant: "Store", amount: -12, category: "Groceries" };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "pocketpilot-rules-test",
    firestore: { rules: await readFile("backend/firebase/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "betaMembers", "invited"), { status: "active" });
    await setDoc(doc(context.firestore(), "betaMembers", "invited-b"), { status: "active" });
    await setDoc(doc(context.firestore(), "betaMembers", "revoked"), { status: "revoked" });
  });
});

afterAll(async () => env.cleanup());

describe("Firestore beta membership rules", () => {
  it("allows an invited member's valid own write and denies other states", async () => {
    await assertSucceeds(setDoc(doc(env.authenticatedContext("invited").firestore(), "users/invited/transactions/t1"), transaction));
    await assertFails(setDoc(doc(env.authenticatedContext("uninvited").firestore(), "users/uninvited/transactions/t1"), transaction));
    await assertFails(setDoc(doc(env.authenticatedContext("revoked").firestore(), "users/revoked/transactions/t1"), transaction));
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), "users/invited/transactions/t2"), transaction));
  });

  it("denies membership self-escalation, cross-user reads, and malformed writes", async () => {
    const invited = env.authenticatedContext("invited").firestore();
    await assertFails(setDoc(doc(invited, "betaMembers/invited"), { status: "active" }));
    await assertFails(getDoc(doc(invited, "users/other/transactions/t1")));
    await assertFails(setDoc(doc(invited, "users/invited/transactions/bad"), { ...transaction, ownerId: "invited" }));
    expect(true).toBe(true);
  });

  it("limits membership visibility to the signed-in user", async () => {
    const invited = env.authenticatedContext("invited").firestore();
    await assertSucceeds(getDoc(doc(invited, "betaMembers/invited")));
    await assertFails(getDoc(doc(invited, "betaMembers/revoked")));
    await assertFails(getDocs(collection(invited, "betaMembers")));
  });

  it("allows only the owner to persist bounded import operation state", async () => {
    const invited = env.authenticatedContext("invited").firestore();
    await assertSucceeds(
      setDoc(doc(invited, "users/invited/importOperations/import_123"), {
        status: "in-progress",
        accountId: "checking-main",
        totalRows: 2,
        completedRows: 1,
      })
    );
    await assertFails(
      setDoc(doc(invited, "users/other/importOperations/import_123"), {
        status: "complete",
        accountId: "checking-main",
        totalRows: 1,
        completedRows: 1,
      })
    );
    await assertFails(
      setDoc(doc(invited, "users/invited/importOperations/missing-account"), {
        status: "in-progress",
        totalRows: 1,
        completedRows: 0,
      })
    );
    await assertFails(
      updateDoc(doc(invited, "users/invited/importOperations/import_123"), {
        completedRows: 0,
      })
    );
  });

  it("accepts only named financial schemas and rejects unexpected data", async () => {
    const invited = env.authenticatedContext("invited").firestore();
    await assertSucceeds(
      setDoc(doc(invited, "users/invited/transactions/v2"), {
        date: "2026-09-19",
        merchant: "Store",
        amountMinor: -1234,
        currency: "USD",
        schemaVersion: 2,
        category: "Groceries",
      })
    );
    await assertFails(
      setDoc(doc(invited, "users/invited/transactions/v2-invalid"), {
        date: "2026-09-19",
        merchant: "Store",
        amountMinor: -12.5,
        currency: "USD",
        schemaVersion: 2,
        category: "Groceries",
      })
    );
    await assertSucceeds(
      setDoc(doc(invited, "users/invited/budgets/b1"), {
        category: "Groceries",
        amount: 100,
        month: "2026-09",
        warningThreshold: 0.8,
        limitThreshold: 1,
      })
    );
    await assertSucceeds(
      setDoc(doc(invited, "users/invited/goals/g1"), {
        name: "Emergency fund",
        targetAmount: 1000,
        currentAmount: 0,
        contributions: [],
      })
    );
    await assertSucceeds(
      setDoc(doc(invited, "users/invited/budgets/v2"), {
        category: "Groceries",
        amountMinor: 10000,
        currency: "USD",
        schemaVersion: 2,
        month: "2026-09",
        warningThreshold: 0.8,
        limitThreshold: 1,
      })
    );
    await assertSucceeds(
      setDoc(doc(invited, "users/invited/goals/v2"), {
        name: "Emergency fund",
        targetAmountMinor: 100000,
        currentAmountMinor: 0,
        currency: "USD",
        schemaVersion: 2,
        contributions: [],
      })
    );
    await assertSucceeds(
      setDoc(doc(invited, "users/invited/categories/c1"), {
        name: "Groceries",
        color: "#10B981",
      })
    );
    await assertSucceeds(
      setDoc(doc(invited, "users/invited/settings/preferences"), { theme: "system" })
    );
    await assertFails(
      setDoc(doc(invited, "users/invited/transactions/invalid-tags"), {
        ...transaction,
        tags: [{ unexpected: true }],
      })
    );
    await assertFails(setDoc(doc(invited, "users/invited/settings/arbitrary"), { admin: true }));
    await assertFails(setDoc(doc(invited, "users/invited/privateRecords/r1"), { value: "nope" }));
  });

  it("enforces schema checks on update, delete, list, and batched writes", async () => {
    const invited = env.authenticatedContext("invited").firestore();
    const transactionRef = doc(invited, "users/invited/transactions/lifecycle");
    await assertSucceeds(setDoc(transactionRef, transaction));
    await assertSucceeds(getDocs(collection(invited, "users/invited/transactions")));
    await assertFails(updateDoc(transactionRef, { amount: 0 }));
    await assertSucceeds(deleteDoc(transactionRef));

    const batch = writeBatch(invited);
    for (let index = 0; index < 20; index += 1) {
      batch.set(doc(invited, `users/invited/transactions/batch-${index}`), {
        ...transaction,
        merchant: `Store ${index}`,
      });
    }
    await assertSucceeds(batch.commit());
  });

  it("denies invited A access to invited B through direct, query, mutation, and transaction paths", async () => {
    const invitedA = env.authenticatedContext("invited").firestore();
    const invitedB = env.authenticatedContext("invited-b").firestore();
    const bTransaction = doc(invitedB, "users/invited-b/transactions/private");
    await assertSucceeds(setDoc(bTransaction, transaction));

    await assertFails(getDoc(doc(invitedA, "users/invited-b/transactions/private")));
    await assertFails(getDocs(collection(invitedA, "users/invited-b/transactions")));
    await assertFails(updateDoc(doc(invitedA, "users/invited-b/transactions/private"), { merchant: "No" }));
    await assertFails(deleteDoc(doc(invitedA, "users/invited-b/transactions/private")));
    await assertFails(
      runTransaction(invitedA, async (transactionContext) => {
        transactionContext.set(doc(invitedA, "users/invited-b/transactions/retry"), transaction);
      })
    );
  });

  it("permits a transaction retry for the owner without weakening validation", async () => {
    const invited = env.authenticatedContext("invited").firestore();
    const retryRef = doc(invited, "users/invited/transactions/retry");
    await assertSucceeds(
      runTransaction(invited, async (transactionContext) => {
        transactionContext.set(retryRef, transaction);
      })
    );
    await assertSucceeds(
      runTransaction(invited, async (transactionContext) => {
        transactionContext.update(retryRef, { merchant: "Retried Store" });
      })
    );
  });
});
