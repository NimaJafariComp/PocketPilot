import { describe, expect, it } from "vitest";
import {
  fromStoredBudget,
  fromStoredGoal,
  fromStoredTransaction,
  toStoredBudget,
  toStoredGoal,
  toStoredTransaction,
} from "./financial-records";

describe("versioned transaction storage", () => {
  const transaction = {
    id: "tx-1",
    date: "2026-03-08",
    merchant: "Grocer",
    amount: -12.34,
    category: "Groceries",
  };

  it("writes new transactions as USD integer minor units", () => {
    expect(toStoredTransaction(transaction)).toMatchObject({
      schemaVersion: 2,
      currency: "USD",
      amountMinor: -1234,
    });
    expect(toStoredTransaction(transaction)).not.toHaveProperty("amount");
  });

  it("reads versioned records without a timezone or money conversion loss", () => {
    expect(
      fromStoredTransaction({ ...transaction, schemaVersion: 2, currency: "USD", amountMinor: -1234 })
    ).toEqual(transaction);
  });

  it("keeps an existing legacy record readable without rewriting it", () => {
    expect(fromStoredTransaction(transaction)).toEqual(transaction);
  });

  it("stores budgets and nested goal contributions in integer cents", () => {
    expect(toStoredBudget({ id: "b", category: "Food", amount: 10.5, month: "2026-03", warningThreshold: 0.8, limitThreshold: 1 })).toMatchObject({ amountMinor: 1050, currency: "USD", schemaVersion: 2 });
    expect(
      toStoredGoal({ id: "g", name: "Fund", targetAmount: 100, currentAmount: 2.5, contributions: [{ id: "c", amount: 2.5, date: "2026-03-08" }] })
    ).toMatchObject({ targetAmountMinor: 10000, currentAmountMinor: 250, contributions: [{ id: "c", amountMinor: 250, date: "2026-03-08" }] });
  });

  it("returns stored budgets and goals in the display contract", () => {
    expect(fromStoredBudget({ id: "b", category: "Food", amountMinor: 1050, currency: "USD", schemaVersion: 2, month: "2026-03", warningThreshold: 0.8, limitThreshold: 1 }).amount).toBe(10.5);
    expect(fromStoredGoal({ id: "g", name: "Fund", targetAmountMinor: 10000, currentAmountMinor: 250, currency: "USD", schemaVersion: 2, contributions: [{ id: "c", amountMinor: 250, date: "2026-03-08" }] }).contributions[0]?.amount).toBe(2.5);
  });

  it("rejects unsupported currencies and unsafe persisted integers", () => {
    expect(() => fromStoredTransaction({ ...transaction, schemaVersion: 2, currency: "EUR", amountMinor: -1234 })).toThrow(/currency/);
    expect(() => fromStoredBudget({ id: "b", category: "Food", amountMinor: 1.5, currency: "USD", schemaVersion: 2, month: "2026-03", warningThreshold: 0.8, limitThreshold: 1 })).toThrow(/Unsafe/);
  });

  it("rejects invalid calendar dates and omits an absent goal deadline", () => {
    expect(() => toStoredTransaction({ ...transaction, date: "2026-02-29" })).toThrow(/date/i);
    const storedGoal = toStoredGoal({
      id: "g",
      name: "Fund",
      targetAmount: 100,
      currentAmount: 0,
      deadline: undefined,
      contributions: [],
    });
    expect(storedGoal).not.toHaveProperty("deadline");
  });
});
