import { decimalToMinorUnits, isCalendarDate } from "./money";
import type { Contribution, Goal } from "./models";

/** A single category/month budget is an accounting invariant, not a UI convention. */
export function stableBudgetId(month: string, category: string): string {
  return `budget_${month}_${category.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/** Applies a contribution once; callers persist this inside a Firestore transaction. */
export function applyGoalContribution(goal: Goal, contribution: Contribution): Goal {
  if (!contribution.id) throw new Error("Contribution ID is required");
  if (!isCalendarDate(contribution.date)) throw new Error("Contribution date must be a calendar date");
  if (decimalToMinorUnits(contribution.amount) === null || contribution.amount <= 0) {
    throw new Error("Contribution amount must be a positive USD value");
  }
  if (goal.contributions.some((existing) => existing.id === contribution.id)) return goal;
  if (goal.contributions.length >= 200) throw new Error("This goal has reached its contribution history limit");
  return {
    ...goal,
    currentAmount: goal.currentAmount + contribution.amount,
    contributions: [...goal.contributions, contribution],
  };
}
