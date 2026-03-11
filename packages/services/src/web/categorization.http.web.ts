import type { AuthAdapter } from '../interfaces/auth';
import type { CategorizationAdapter } from '../interfaces/categorization';

export function createCategorizationHttpWeb(
  auth: AuthAdapter,
  functionsBaseUrl: string,
): CategorizationAdapter {
  return {
    async categorizeTransactions(params) {
      const token = await auth.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${functionsBaseUrl}/categorizeTransactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `categorizeTransactions failed (${response.status})`);
      }

      return Array.isArray(json?.results) ? json.results : [];
    },

    async learnMerchantCategory(params) {
      const token = await auth.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${functionsBaseUrl}/learnMerchantCategory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || `learnMerchantCategory failed (${response.status})`);
      }
    },
  };
}
