export type RagRole = 'user' | 'assistant';

export interface RagMessage {
  role: RagRole;
  content: string;
}

export interface RagDocument {
  id: string;
  kind: 'transaction' | 'budget' | 'goal' | 'insight' | 'note';
  text: string;
  tags?: string[];
}

export interface RagAdapter {
  ask(params: {
    query: string;
    messages: RagMessage[];
    documents: RagDocument[];
    topK?: number;
  }): Promise<{ answer: string; retrieved: number; model: string }>;
}
