export type RagRole = "user" | "assistant";

export interface RagMessage {
  role: RagRole;
  content: string;
}

export interface RagDocumentMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

export interface RagDocument {
  id: string;
  kind: "transaction" | "budget" | "goal" | "insight" | "note";
  text: string;
  tags?: string[];
  metadata?: RagDocumentMetadata;
}

export interface RagSyncIndexParams {
  documents: RagDocument[];
  removedIds?: string[];
  batchIndex?: number;
  batchCount?: number;
  totalOperations?: number;
}

export interface RagSyncIndexResult {
  indexed: number;
  skipped: number;
  removed: number;
  model: string;
  processed: number;
  total: number;
  batchIndex: number;
  batchCount: number;
  done: boolean;
}

export interface RagAdapter {
  syncIndex(params: RagSyncIndexParams): Promise<RagSyncIndexResult>;
  ask(params: {
    query: string;
    messages: RagMessage[];
    topK?: number;
  }): Promise<{ answer: string; retrieved: number; model: string }>;
}
