export type CategorySource = 'imported' | 'manual' | 'auto-rule' | 'auto-history' | 'auto-ai';

export interface CategorizationInput {
  merchant: string;
  amount: number;
  notes?: string;
}

export interface CategorizationResult {
  category: string;
  categorySource: CategorySource;
  categoryConfidence: number;
  categoryNeedsReview: boolean;
  normalizedMerchant: string;
  reason?: string;
}

export interface CategorizationAdapter {
  categorizeTransactions(params: {
    transactions: CategorizationInput[];
    categories: string[];
  }): Promise<CategorizationResult[]>;
  learnMerchantCategory(params: {
    merchant: string;
    category: string;
  }): Promise<void>;
}
