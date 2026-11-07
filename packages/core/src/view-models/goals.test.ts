import { describe, expect, it } from "vitest";
import type { Goal } from "../models/index";
import { buildGoalProgress, buildGoalsViewModel } from "./goals";

const goal: Goal = {
  id: "synthetic-goal",
  name: "Emergency fund",
  targetAmount: 100,
  currentAmount: 60,
  contributions: [
    { id: "second", date: "2026-09-02", amount: 40 },
    { id: "first", date: "2026-09-01", amount: 20 },
  ],
};

describe("goal summaries", () => {
  it("orders contributions and computes cumulative progress without mutating history", () => {
    expect(buildGoalProgress(goal)).toEqual([
      { date: "Sep 1", amount: 20 },
      { date: "Sep 2", amount: 60 },
    ]);
    expect(goal.contributions.map((item) => item.id)).toEqual(["second", "first"]);
  });

  it("does not report negative remaining savings for an overfunded goal", () => {
    const summary = buildGoalsViewModel([{ ...goal, currentAmount: 120 }]);
    expect(summary.totalNeeded).toBe(0);
    expect(summary.completedCount).toBe(1);
    expect(summary.goalRows[0]).toMatchObject({ percentage: 120, remaining: 0, isComplete: true });
  });

  it("handles an empty workspace", () => {
    expect(buildGoalsViewModel([])).toEqual({
      totalSaved: 0,
      totalNeeded: 0,
      completedCount: 0,
      goalRows: [],
    });
  });
});
