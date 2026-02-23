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
}

export interface RagMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RagChatBody {
  query: string;
  messages?: RagMessage[];
  documents?: RagDocumentInput[];
  topK?: number;
}
