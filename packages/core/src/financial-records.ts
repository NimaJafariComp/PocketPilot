import type { Budget, Contribution, Goal, Transaction } from "./models";
import { BETA_CURRENCY, decimalToMinorUnits, isCalendarDate, minorUnitsToDecimal } from "./money";

export const FINANCIAL_SCHEMA_VERSION = 2 as const;

export type StoredTransaction = Omit<Transaction, "id" | "amount"> & {
  amountMinor: number;
  currency: typeof BETA_CURRENCY;
  schemaVersion: typeof FINANCIAL_SCHEMA_VERSION;
};

/** Serializes new records using the USD-cent contract without rounding. */
export function toStoredTransaction(transaction: Omit<Transaction, "id">): StoredTransaction {
  if (!isCalendarDate(transaction.date)) throw new Error("Transaction date must be a valid calendar date");
  const minor = decimalToMinorUnits(transaction.amount);
  if (minor === null) throw new Error("Transaction amount must be an exact, safe USD value");
  const { id: _id, amount: _amount, ...rest } = transaction as Transaction;
  return {
    ...rest,
    amountMinor: minor,
    currency: BETA_CURRENCY,
    schemaVersion: FINANCIAL_SCHEMA_VERSION,
  };
}

/**
 * Reads both schema versions. Legacy amounts are returned verbatim and are
 * never rewritten by a read; a separately authorized migration owns v1 data.
 */
export function fromStoredTransaction(record: Record<string, unknown>): Transaction {
  if (record.schemaVersion !== FINANCIAL_SCHEMA_VERSION) return record as unknown as Transaction;
  if (record.currency !== BETA_CURRENCY || typeof record.amountMinor !== "number") {
    throw new Error("Unsupported financial record currency or minor-unit value");
  }
  const amount = minorUnitsToDecimal(record.amountMinor);
  if (amount === null) throw new Error("Unsafe financial record minor-unit value");
  const { amountMinor: _minor, currency: _currency, schemaVersion: _version, ...rest } = record;
  return { ...(rest as unknown as Transaction), amount };
}

function toMinor(value: number, label: string): number {
  const minor = decimalToMinorUnits(value);
  if (minor === null) throw new Error(`${label} must be an exact, safe USD value`);
  return minor;
}

function fromMinor(value: unknown, label: string): number {
  if (typeof value !== "number") throw new Error(`Invalid ${label} minor-unit value`);
  const decimal = minorUnitsToDecimal(value);
  if (decimal === null) throw new Error(`Unsafe ${label} minor-unit value`);
  return decimal;
}

export function toStoredBudget(budget: Budget) {
  const { amount: _amount, id: _id, ...rest } = budget;
  return { ...rest, amountMinor: toMinor(budget.amount, "Budget amount"), currency: BETA_CURRENCY, schemaVersion: FINANCIAL_SCHEMA_VERSION };
}

export function fromStoredBudget(record: Record<string, unknown>): Budget {
  if (record.schemaVersion !== FINANCIAL_SCHEMA_VERSION) return record as unknown as Budget;
  const { amountMinor, currency, schemaVersion, ...rest } = record;
  if (currency !== BETA_CURRENCY) throw new Error("Unsupported budget currency");
  return { ...(rest as unknown as Budget), amount: fromMinor(amountMinor, "budget") };
}

function toStoredContribution(contribution: Contribution) {
  if (!isCalendarDate(contribution.date)) throw new Error("Contribution date must be a valid calendar date");
  const { amount: _amount, ...rest } = contribution;
  return { ...rest, amountMinor: toMinor(contribution.amount, "Contribution amount") };
}

export function toStoredGoal(goal: Goal) {
  if (goal.deadline !== undefined && !isCalendarDate(goal.deadline)) {
    throw new Error("Goal deadline must be a valid calendar date");
  }
  const { id: _id, targetAmount: _target, currentAmount: _current, contributions: _contributions, deadline, ...rest } = goal;
  return {
    ...rest,
    ...(deadline === undefined ? {} : { deadline }),
    targetAmountMinor: toMinor(goal.targetAmount, "Goal target"),
    currentAmountMinor: toMinor(goal.currentAmount, "Goal current"),
    contributions: goal.contributions.map(toStoredContribution),
    currency: BETA_CURRENCY,
    schemaVersion: FINANCIAL_SCHEMA_VERSION,
  };
}

export function fromStoredGoal(record: Record<string, unknown>): Goal {
  if (record.schemaVersion !== FINANCIAL_SCHEMA_VERSION) return record as unknown as Goal;
  const { targetAmountMinor, currentAmountMinor, currency, schemaVersion, contributions, ...rest } = record;
  if (currency !== BETA_CURRENCY || !Array.isArray(contributions)) throw new Error("Unsupported goal storage value");
  return { ...(rest as unknown as Goal), targetAmount: fromMinor(targetAmountMinor, "goal target"), currentAmount: fromMinor(currentAmountMinor, "goal current"), contributions: contributions.map((value) => { const c = value as Record<string, unknown>; const { amountMinor, ...contribution } = c; return { ...(contribution as unknown as Contribution), amount: fromMinor(amountMinor, "contribution") }; }) };
}
