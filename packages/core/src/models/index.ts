export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  notes?: string;
  tags?: string[];
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string;
  warningThreshold: number;
  limitThreshold: number;
}

export interface Contribution {
  id: string;
  amount: number;
  date: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  contributions: Contribution[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Uncategorized', color: '#9CA3AF', icon: 'Help' },
  { id: '2', name: 'Groceries', color: '#10B981', icon: 'ShoppingCart' },
  { id: '3', name: 'Dining', color: '#F59E0B', icon: 'Utensils' },
  { id: '4', name: 'Transportation', color: '#3B82F6', icon: 'Car' },
  { id: '5', name: 'Entertainment', color: '#8B5CF6', icon: 'Film' },
  { id: '6', name: 'Shopping', color: '#EC4899', icon: 'ShoppingBag' },
  { id: '7', name: 'Bills', color: '#EF4444', icon: 'Receipt' },
  { id: '8', name: 'Health', color: '#14B8A6', icon: 'Heart' },
  { id: '9', name: 'Income', color: '#22C55E', icon: 'TrendingUp' }
];
