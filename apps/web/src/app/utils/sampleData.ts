import { format, subDays, subMonths } from "date-fns";
import type { Budget, Goal, Transaction } from "../types";

const merchants = [
  "Whole Foods",
  "Target",
  "Starbucks",
  "Amazon",
  "Shell Gas",
  "Netflix",
  "Spotify",
  "Uber",
  "Chipotle",
  "CVS Pharmacy",
  "Home Depot",
  "Best Buy",
  "Apple Store",
  "Costco",
  "Trader Joes",
  "Panera Bread",
  "McDonalds",
  "Subway",
  "Salary Deposit",
  "Freelance Payment",
];

const merchantCategoryMap: Record<string, string> = {
  "Whole Foods": "Groceries",
  "Trader Joes": "Groceries",
  Costco: "Groceries",
  Starbucks: "Dining",
  Chipotle: "Dining",
  "Panera Bread": "Dining",
  McDonalds: "Dining",
  Subway: "Dining",
  "Shell Gas": "Transportation",
  Uber: "Transportation",
  Netflix: "Entertainment",
  Spotify: "Entertainment",
  Amazon: "Shopping",
  Target: "Shopping",
  "Home Depot": "Shopping",
  "Best Buy": "Shopping",
  "Apple Store": "Shopping",
  "CVS Pharmacy": "Health",
  "Salary Deposit": "Income",
  "Freelance Payment": "Income",
};

const categories = [
  "Groceries",
  "Dining",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
];

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(daysAgo: number): string {
  return format(subDays(new Date(), Math.floor(Math.random() * daysAgo)), "yyyy-MM-dd");
}

export function generateSampleTransactions(count: number = 50): Omit<Transaction, "id">[] {
  const transactions: Omit<Transaction, "id">[] = [];

  for (let i = 0; i < count; i++) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const category =
      merchantCategoryMap[merchant] || categories[Math.floor(Math.random() * categories.length)];
    const isIncome = category === "Income";

    let amount: number;
    if (isIncome) {
      amount = randomAmount(2000, 5000);
    } else if (category === "Groceries") {
      amount = -randomAmount(30, 150);
    } else if (category === "Dining") {
      amount = -randomAmount(15, 80);
    } else if (category === "Transportation") {
      amount = -randomAmount(20, 60);
    } else if (category === "Bills") {
      amount = -randomAmount(50, 200);
    } else {
      amount = -randomAmount(10, 100);
    }

    transactions.push({
      date: randomDate(60),
      merchant,
      amount,
      category,
    });
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function generateSampleBudgets(): Omit<Budget, "id">[] {
  const currentMonth = format(new Date(), "yyyy-MM");

  return [
    {
      category: "Groceries",
      amount: 600,
      month: currentMonth,
      warningThreshold: 80,
      limitThreshold: 100,
    },
    {
      category: "Dining",
      amount: 300,
      month: currentMonth,
      warningThreshold: 80,
      limitThreshold: 100,
    },
    {
      category: "Transportation",
      amount: 200,
      month: currentMonth,
      warningThreshold: 80,
      limitThreshold: 100,
    },
    {
      category: "Entertainment",
      amount: 150,
      month: currentMonth,
      warningThreshold: 80,
      limitThreshold: 100,
    },
    {
      category: "Shopping",
      amount: 250,
      month: currentMonth,
      warningThreshold: 80,
      limitThreshold: 100,
    },
  ];
}

export function generateSampleGoals(): Omit<Goal, "id">[] {
  return [
    {
      name: "Emergency Fund",
      targetAmount: 10000,
      currentAmount: 4200,
      deadline: subMonths(new Date(), -6).toISOString(),
      contributions: [
        { id: "1", amount: 1000, date: subDays(new Date(), 45).toISOString() },
        { id: "2", amount: 1500, date: subDays(new Date(), 30).toISOString() },
        { id: "3", amount: 1200, date: subDays(new Date(), 15).toISOString() },
        { id: "4", amount: 500, date: subDays(new Date(), 5).toISOString() },
      ],
    },
    {
      name: "Vacation to Japan",
      targetAmount: 5000,
      currentAmount: 1800,
      deadline: subMonths(new Date(), -8).toISOString(),
      contributions: [
        { id: "1", amount: 800, date: subDays(new Date(), 25).toISOString() },
        { id: "2", amount: 1000, date: subDays(new Date(), 10).toISOString() },
      ],
    },
  ];
}
