import { describe, expect, it } from "vitest";
import { applyGoalContribution, stableBudgetId } from "./financial-mutations";

describe("financial mutation contracts", () => {
  it("applies an idempotent goal contribution exactly once", () => {
    const goal = { id: "g", name: "Fund", targetAmount: 100, currentAmount: 10, contributions: [] };
    const contribution = { id: "c", amount: 15, date: "2026-09-19" };
    const once = applyGoalContribution(goal, contribution);

    expect(applyGoalContribution(once, contribution)).toEqual(once);
    expect(once).toMatchObject({ currentAmount: 25, contributions: [contribution] });
  });

  it("uses one deterministic budget identity per category and month", () => {
    expect(stableBudgetId("2026-09", "Groceries")).toBe(stableBudgetId("2026-09", " groceries "));
    expect(stableBudgetId("2026-09", "Groceries")).not.toBe(stableBudgetId("2026-10", "Groceries"));
  });
});
