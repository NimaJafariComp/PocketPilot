import type { AuthAdapter } from '../interfaces/auth';
import type { RagAdapter } from '../interfaces/rag';

export function createRagHttpWeb(auth: AuthAdapter, functionsBaseUrl: string): RagAdapter {
  return {
    async syncIndex(params) {
      const token = await auth.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${functionsBaseUrl}/syncRagIndex`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `syncRagIndex failed (${response.status})`);
      }

      return {
        indexed: json.indexed,
        skipped: json.skipped,
        removed: json.removed,
        model: json.model,
        processed: json.processed,
        total: json.total,
        batchIndex: json.batchIndex,
        batchCount: json.batchCount,
        done: json.done,
      };
    },
    async ask(params) {
      const token = await auth.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${functionsBaseUrl}/ragChat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `ragChat failed (${response.status})`);
      }

      return {
        answer: json.answer,
        retrieved: json.retrieved,
        model: json.model,
      };
    },
  };
}
