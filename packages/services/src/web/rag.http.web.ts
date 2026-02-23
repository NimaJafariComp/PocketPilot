import type { AuthAdapter } from '../interfaces/auth';
import type { RagAdapter } from '../interfaces/rag';

export function createRagHttpWeb(auth: AuthAdapter, functionsBaseUrl: string): RagAdapter {
  return {
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
