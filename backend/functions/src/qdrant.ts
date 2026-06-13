const qdrantUrl = process.env.QDRANT_URL || "http://127.0.0.1:6333";

// Use a versioned default collection name so the new dense+sparse schema does not
// collide with older single-vector collections that may already exist locally.
export const vectorCollectionName = process.env.QDRANT_COLLECTION || "pocketpilot_vectors_v2";
export const denseVectorName = "dense";
export const sparseVectorName = "sparse";
export const ragVectorSource = "rag";

const QDRANT_TIMEOUT_MS = 30_000;
const SPARSE_HASH_SPACE = 262_139;
const RRF_K = 60;

export interface SparseVector {
  indices: number[];
  values: number[];
}

export interface SparseBoost {
  token: string;
  weight: number;
}

export interface PayloadFilterCondition {
  key: string;
  match?: {
    value?: string | number | boolean;
    any?: Array<string | number | boolean>;
  };
  range?: {
    gte?: number;
    lte?: number;
    gt?: number;
    lt?: number;
  };
}

export interface VectorPayloadRecord extends Record<string, unknown> {
  userId: string;
  kind: string;
  refId: string;
  text: string;
  tags?: string[];
  source: string;
  contentHash?: string;
  createdAt: string;
  updatedAt?: string;
}

interface QdrantPoint {
  id: string | number;
  score?: number;
  payload?: VectorPayloadRecord;
}

interface QdrantQueryResult {
  points?: QdrantPoint[];
}

interface QdrantScrollResult {
  points?: QdrantPoint[];
  next_page_offset?: string | number | null;
}

function qdrantHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
  };
}

async function qdrantRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QDRANT_TIMEOUT_MS);

  try {
    const response = await fetch(`${qdrantUrl}${path}`, {
      ...init,
      headers: {
        ...qdrantHeaders(),
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new Error("QDRANT_NOT_FOUND");
    }

    const json = (await response.json().catch(() => ({}))) as {
      status?: string;
      result?: T;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(json.error || `Qdrant request failed with ${response.status}`);
    }

    return json.result as T;
  } finally {
    clearTimeout(timeout);
  }
}

function createFilter(
  userId: string,
  kinds?: string[],
  extraMust: PayloadFilterCondition[] = []
): { must: Array<Record<string, unknown> | PayloadFilterCondition> } {
  const must: Array<Record<string, unknown> | PayloadFilterCondition> = [
    {
      key: "userId",
      match: { value: userId },
    },
    {
      key: "source",
      match: { value: ragVectorSource },
    },
  ];

  if (kinds && kinds.length > 0) {
    must.push({
      key: "kind",
      match: { any: kinds },
    });
  }

  must.push(...extraMust);

  return { must };
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function tokenizeForSparseIndex(text: string): Array<{ token: string; weight: number }> {
  const lowered = text.toLowerCase();
  const entries = new Map<string, number>();

  const addToken = (token: string, weight = 1) => {
    const normalized = token.trim().toLowerCase();
    if (!normalized) return;
    entries.set(normalized, (entries.get(normalized) || 0) + weight);
  };

  const dateMatches =
    lowered.match(/\b\d{4}-\d{2}(?:-\d{2})?\b/g) ||
    lowered.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b/g) ||
    [];
  for (const match of dateMatches) {
    addToken(match, 3);
  }

  const moneyMatches = lowered.match(/\$?\d+(?:\.\d+)?/g) || [];
  for (const match of moneyMatches) {
    const normalized = match.replace(/^\$/, "");
    const weight =
      normalized.includes(".") || normalized.length >= 4 || match.includes("$") ? 2.5 : 1.2;
    addToken(normalized, weight);
    if (match.includes("$")) {
      addToken(match, weight);
    }
  }

  const wordMatches = lowered.match(/[a-z0-9][a-z0-9._:/-]{1,}/g) || [];
  for (const match of wordMatches) {
    if (match.length < 2) continue;
    const hasDigit = /\d/.test(match);
    addToken(match, hasDigit ? 1.8 : 1);
  }

  return Array.from(entries.entries()).map(([token, weight]) => ({ token, weight }));
}

export function buildSparseVector(text: string, boosts: SparseBoost[] = []): SparseVector {
  const weightedTokens = tokenizeForSparseIndex(text);
  const indicesToValues = new Map<number, number>();

  for (const { token, weight } of weightedTokens) {
    const index = fnv1a32(token) % SPARSE_HASH_SPACE;
    indicesToValues.set(index, (indicesToValues.get(index) || 0) + weight);
  }

  for (const { token, weight } of boosts) {
    const normalized = token.trim().toLowerCase();
    if (!normalized || weight <= 0) continue;
    const index = fnv1a32(normalized) % SPARSE_HASH_SPACE;
    indicesToValues.set(index, (indicesToValues.get(index) || 0) + weight);
  }

  const ordered = Array.from(indicesToValues.entries()).sort((a, b) => a[0] - b[0]);
  return {
    indices: ordered.map(([index]) => index),
    values: ordered.map(([, value]) => Number(value.toFixed(4))),
  };
}

function hasExpectedCollectionSchema(
  collection: {
    config?: {
      params?: {
        vectors?: Record<string, { size?: number }>;
        sparse_vectors?: Record<string, unknown>;
      };
    };
  } | null,
  dimension: number
): boolean {
  const vectors = collection?.config?.params?.vectors;
  const sparseVectors = collection?.config?.params?.sparse_vectors;

  if (!vectors || typeof vectors !== "object") {
    return false;
  }

  const denseConfig = vectors[denseVectorName];
  if (!denseConfig || denseConfig.size !== dimension) {
    return false;
  }

  return !!sparseVectors && typeof sparseVectors === "object" && sparseVectorName in sparseVectors;
}

async function createCollection(dimension: number): Promise<void> {
  await qdrantRequest(`/collections/${vectorCollectionName}`, {
    method: "PUT",
    body: JSON.stringify({
      vectors: {
        [denseVectorName]: {
          size: dimension,
          distance: "Cosine",
        },
      },
      sparse_vectors: {
        [sparseVectorName]: {},
      },
    }),
  });
}

export async function ensureVectorCollection(dimension: number): Promise<void> {
  let existing: {
    config?: {
      params?: {
        vectors?: Record<string, { size?: number }>;
        sparse_vectors?: Record<string, unknown>;
      };
    };
  } | null = null;

  try {
    existing = await qdrantRequest(`/collections/${vectorCollectionName}`, {
      method: "GET",
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "QDRANT_NOT_FOUND") {
      throw error;
    }
  }

  if (!existing) {
    await createCollection(dimension);
    return;
  }

  if (hasExpectedCollectionSchema(existing, dimension)) {
    return;
  }

  await qdrantRequest(`/collections/${vectorCollectionName}`, {
    method: "DELETE",
  });
  await createCollection(dimension);
}

export async function upsertPoints(
  points: Array<{
    id: string;
    denseVector: number[];
    sparseVector: SparseVector;
    payload: VectorPayloadRecord;
  }>
): Promise<void> {
  if (points.length === 0) {
    return;
  }

  await qdrantRequest(`/collections/${vectorCollectionName}/points?wait=true`, {
    method: "PUT",
    body: JSON.stringify({
      points: points.map((point) => ({
        id: point.id,
        vector: {
          [denseVectorName]: point.denseVector,
          [sparseVectorName]: point.sparseVector,
        },
        payload: point.payload,
      })),
    }),
  });
}

export async function deletePoints(ids: Array<string | number>): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  await qdrantRequest(`/collections/${vectorCollectionName}/points/delete?wait=true`, {
    method: "POST",
    body: JSON.stringify({
      points: ids,
    }),
  });
}

async function queryPoints(params: {
  query: number[] | SparseVector;
  using: string;
  userId: string;
  kinds?: string[];
  extraMust?: PayloadFilterCondition[];
  limit: number;
  scoreThreshold?: number;
}): Promise<QdrantPoint[]> {
  const result = await qdrantRequest<QdrantQueryResult>(
    `/collections/${vectorCollectionName}/points/query`,
    {
      method: "POST",
      body: JSON.stringify({
        query: params.query,
        using: params.using,
        limit: params.limit,
        score_threshold: params.scoreThreshold,
        filter: createFilter(params.userId, params.kinds, params.extraMust),
        with_payload: true,
        with_vector: false,
      }),
    }
  );

  return result.points || [];
}

export async function queryDensePoints(params: {
  vector: number[];
  userId: string;
  kinds?: string[];
  extraMust?: PayloadFilterCondition[];
  limit: number;
  scoreThreshold?: number;
}): Promise<QdrantPoint[]> {
  return queryPoints({
    query: params.vector,
    using: denseVectorName,
    userId: params.userId,
    kinds: params.kinds,
    extraMust: params.extraMust,
    limit: params.limit,
    scoreThreshold: params.scoreThreshold,
  });
}

function fuseReciprocalRank(
  dense: QdrantPoint[],
  sparse: QdrantPoint[],
  preferSparse: boolean,
  limit: number
): QdrantPoint[] {
  const denseWeight = preferSparse ? 0.4 : 0.6;
  const sparseWeight = preferSparse ? 0.6 : 0.4;
  const merged = new Map<string, QdrantPoint & { fusedScore: number }>();

  const addRanked = (points: QdrantPoint[], weight: number) => {
    points.forEach((point, index) => {
      const key = String(point.id);
      const current = merged.get(key) || { ...point, fusedScore: 0 };
      current.fusedScore += weight / (RRF_K + index + 1);
      if (!current.payload && point.payload) {
        current.payload = point.payload;
      }
      merged.set(key, current);
    });
  };

  addRanked(dense, denseWeight);
  addRanked(sparse, sparseWeight);

  return Array.from(merged.values())
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .slice(0, limit)
    .map((point) => ({
      id: point.id,
      payload: point.payload,
      score: point.fusedScore,
    }));
}

export async function searchHybridPoints(params: {
  denseVector: number[];
  sparseVector: SparseVector;
  userId: string;
  kinds?: string[];
  extraMust?: PayloadFilterCondition[];
  limit: number;
  preferSparse: boolean;
  scoreThreshold?: number;
}): Promise<QdrantPoint[]> {
  const candidateLimit = Math.min(Math.max(params.limit * 3, 12), 60);

  const [denseResults, sparseResults] = await Promise.all([
    queryDensePoints({
      vector: params.denseVector,
      userId: params.userId,
      kinds: params.kinds,
      extraMust: params.extraMust,
      limit: candidateLimit,
      scoreThreshold: params.scoreThreshold,
    }),
    params.sparseVector.indices.length > 0
      ? queryPoints({
          query: params.sparseVector,
          using: sparseVectorName,
          userId: params.userId,
          kinds: params.kinds,
          extraMust: params.extraMust,
          limit: candidateLimit,
        })
      : Promise.resolve([]),
  ]);

  if (sparseResults.length === 0) {
    return denseResults.slice(0, params.limit);
  }

  return fuseReciprocalRank(denseResults, sparseResults, params.preferSparse, params.limit);
}

export async function scrollUserSourcePoints(userId: string): Promise<QdrantPoint[]> {
  const points: QdrantPoint[] = [];
  let offset: string | number | null | undefined;

  while (true) {
    const result = await qdrantRequest<QdrantScrollResult>(
      `/collections/${vectorCollectionName}/points/scroll`,
      {
        method: "POST",
        body: JSON.stringify({
          offset,
          limit: 256,
          filter: createFilter(userId),
          with_payload: true,
          with_vector: false,
        }),
      }
    );

    const page = result.points || [];
    points.push(...page);

    if (!result.next_page_offset || page.length === 0) {
      break;
    }

    offset = result.next_page_offset;
  }

  return points;
}
