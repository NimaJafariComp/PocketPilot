import type { CategorizationAdapter } from '../interfaces/categorization';

export const categorizationHttpMobile: CategorizationAdapter = {
  async categorizeTransactions() {
    throw new Error('Not wired: categorizationHttpMobile.categorizeTransactions');
  },
  async learnMerchantCategory() {
    throw new Error('Not wired: categorizationHttpMobile.learnMerchantCategory');
  },
};
