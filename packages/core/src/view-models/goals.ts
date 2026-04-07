import { format, parseISO } from 'date-fns';
import { type Goal } from '../models/index';

export interface GoalProgressPoint {
  date: string;
  amount: number;
}

export interface GoalRow {
  goal: Goal;
  percentage: number;
  isComplete: boolean;
  remaining: number;
  chartData: GoalProgressPoint[];
}

export interface GoalsViewModel {
  totalSaved: number;
  totalNeeded: number;
  completedCount: number;
  goalRows: GoalRow[];
}

export function buildGoalProgress(goal: Goal): GoalProgressPoint[] {
  if (goal.contributions.length === 0) {
    return [];
  }

  const sortedContributions = [...goal.contributions].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );

  let running = 0;
  return sortedContributions.map((contribution) => {
    running += contribution.amount;
    return {
      date: format(parseISO(contribution.date), 'MMM d'),
      amount: running,
    };
  });
}

export function buildGoalsViewModel(goals: Goal[]): GoalsViewModel {
  return {
    totalSaved: goals.reduce((sum, goal) => sum + goal.currentAmount, 0),
    totalNeeded: goals.reduce(
      (sum, goal) => sum + Math.max(0, goal.targetAmount - goal.currentAmount),
      0,
    ),
    completedCount: goals.filter((goal) => goal.currentAmount >= goal.targetAmount).length,
    goalRows: goals.map((goal) => {
      const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
      return {
        goal,
        percentage,
        isComplete: percentage >= 100,
        remaining: Math.max(0, goal.targetAmount - goal.currentAmount),
        chartData: buildGoalProgress(goal),
      };
    }),
  };
}
