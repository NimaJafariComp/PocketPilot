export type EmbeddingKind =
  | "transaction"
  | "budget"
  | "goal"
  | "insight"
  | "note";

export interface VectorPayload {
  userId: string;
  kind: EmbeddingKind;
  refId: string;
  text: string;
  source?: string;
  contentHash?: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

export interface UpsertVectorBody {
  id?: string;
  vector: number[];
  payload: Omit<VectorPayload, "userId" | "createdAt" | "updatedAt">;
}

export interface QueryVectorsBody {
  vector: number[];
  limit?: number;
  kinds?: EmbeddingKind[];
  scoreThreshold?: number;
}

export interface RagDocumentInput {
  id: string;
  kind: EmbeddingKind;
  text: string;
  tags?: string[];
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface RagMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RagChatBody {
  query: string;
  messages?: RagMessage[];
  topK?: number;
}

export interface SyncRagIndexBody {
  documents?: RagDocumentInput[];
  removedIds?: string[];
  batchIndex?: number;
  batchCount?: number;
  totalOperations?: number;
}

export interface CategorizationRequestItem {
  merchant: string;
  amount: number;
  notes?: string;
}

export interface CategorizeTransactionsBody {
  transactions: CategorizationRequestItem[];
  categories?: string[];
}

export interface CategorizationResult {
  category: string;
  categorySource: "imported" | "manual" | "auto-rule" | "auto-history" | "auto-ai";
  categoryConfidence: number;
  categoryNeedsReview: boolean;
  normalizedMerchant: string;
  reason?: string;
}

export interface LearnMerchantCategoryBody {
  merchant: string;
  category: string;
}
