import { createHash } from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import type { Request } from "express";
import { adminAuth } from "./firebaseAdmin.js";
import { ensureVectorCollection, qdrant, vectorCollectionName } from "./qdrant.js";
import type {
  QueryVectorsBody,
  RagChatBody,
  RagDocumentInput,
  UpsertVectorBody,
  VectorPayload,
} from "./types.js";

const REGION = "us-central1";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3.2:3b";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

async function verifyUserId(request: Request): Promise<string> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const idToken = authHeader.replace("Bearer ", "").trim();
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded.uid;
}

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as { code?: string }).code;
  return (
    error.message.includes("Authorization header") ||
    (typeof code === "string" && code.startsWith("auth/"))
  );
}

function hashPointId(userId: string, documentId: string): string {
  return createHash("sha256").update(`${userId}:${documentId}`).digest("hex").slice(0, 32);
}

function toPayloadRecord(payload: VectorPayload): Record<string, unknown> {
  return payload as unknown as Record<string, unknown>;
}

function extractLineValue(text: string, key: string): string | null {
  const line = text
    .split("\n")
    .find((candidate) => candidate.toLowerCase().startsWith(`${key.toLowerCase()}:`));
  if (!line) return null;
  return line.split(":").slice(1).join(":").trim() || null;
}

function parseTransactionDoc(doc: RagDocumentInput): {
  date: string;
  merchant: string;
  category: string;
  amount: number;
} | null {
  if (doc.kind !== "transaction") return null;

  const date = extractLineValue(doc.text, "Date");
  const merchant = extractLineValue(doc.text, "Merchant");
  const category = extractLineValue(doc.text, "Category");
  const amountRaw = extractLineValue(doc.text, "Amount");

  if (!date || !merchant || !category || !amountRaw) return null;
  const amount = Number(amountRaw);
  if (Number.isNaN(amount)) return null;

  return { date, merchant, category, amount };
}

function parseIdentity(docs: RagDocumentInput[]): { displayName?: string; email?: string; uid?: string } {
  const identityDoc = docs.find(
    (doc) =>
      doc.kind === "insight" &&
      (doc.id === "insight-user-identity" || doc.text.includes("Authenticated User Context")),
  );
  if (!identityDoc) return {};

  const displayName = extractLineValue(identityDoc.text, "DisplayName");
  const email = extractLineValue(identityDoc.text, "Email");
  const uid = extractLineValue(identityDoc.text, "Uid");
  return { displayName: displayName || undefined, email: email || undefined, uid: uid || undefined };
}

function isUnknownIdentityValue(value: string | undefined): boolean {
  if (!value) return true;
  return value.trim().toLowerCase() === "unknown";
}

function tryDeterministicAnswer(query: string, docs: RagDocumentInput[]): string | null {
  const q = query.toLowerCase();
  const transactions = docs.map(parseTransactionDoc).filter(Boolean) as Array<{
    date: string;
    merchant: string;
    category: string;
    amount: number;
  }>;
  const identity = parseIdentity(docs);
  const answerParts: string[] = [];

  const asksWhyLastMonth =
    /\bwhy\b.*\blast month\b.*\b(expensive|high|higher|costly)\b/.test(q) ||
    /\blast month\b.*\b(expensive|high|higher|costly)\b/.test(q);
  if (asksWhyLastMonth) {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const inRange = (iso: string, from: Date, to: Date): boolean => {
      const ms = new Date(iso).getTime();
      return !Number.isNaN(ms) && ms >= from.getTime() && ms < to.getTime();
    };

    const lastMonthExpenses = transactions.filter(
      (transaction) => transaction.amount < 0 && inRange(transaction.date, lastMonthStart, thisMonthStart),
    );
    const prevMonthExpenses = transactions.filter(
      (transaction) => transaction.amount < 0 && inRange(transaction.date, prevMonthStart, lastMonthStart),
    );

    const lastTotal = Math.abs(
      lastMonthExpenses.reduce((sum, transaction) => sum + transaction.amount, 0),
    );
    const prevTotal = Math.abs(
      prevMonthExpenses.reduce((sum, transaction) => sum + transaction.amount, 0),
    );
    const delta = lastTotal - prevTotal;
    const changePct = prevTotal > 0 ? (delta / prevTotal) * 100 : 0;

    const categoryTotals = lastMonthExpenses.reduce(
      (acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] || 0) + Math.abs(transaction.amount);
        return acc;
      },
      {} as Record<string, number>,
    );
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => `${category} $${amount.toFixed(2)}`);

    const topExpenses = lastMonthExpenses
      .slice()
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 3)
      .map(
        (transaction) =>
          `${transaction.merchant} (${transaction.category}) $${Math.abs(transaction.amount).toFixed(2)}`,
      );

    const monthLabel = lastMonthStart.toLocaleString("en-US", { month: "long", year: "numeric" });

    answerParts.push(
      [
        `${monthLabel} total expenses were $${lastTotal.toFixed(2)}.`,
        `Previous month expenses were $${prevTotal.toFixed(2)}.`,
        `Change: ${delta >= 0 ? "+" : "-"}$${Math.abs(delta).toFixed(2)} (${changePct.toFixed(1)}%).`,
        `Top categories: ${topCategories.length > 0 ? topCategories.join("; ") : "None"}.`,
        `Largest expenses: ${topExpenses.length > 0 ? topExpenses.join("; ") : "None"}.`,
      ].join(" "),
    );
  }

  const asksTopCategoriesThisMonth =
    /\btop\s*[1-9]?\s*(categories|category)\b.*\bthis month\b/.test(q) ||
    /\bthis month\b.*\btop\s*[1-9]?\s*(categories|category)\b/.test(q) ||
    /\btop\s*3\s*(categories|category)\b/.test(q);
  if (asksTopCategoriesThisMonth) {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const inThisMonth = (iso: string): boolean => {
      const ms = new Date(iso).getTime();
      return !Number.isNaN(ms) && ms >= thisMonthStart.getTime() && ms < nextMonthStart.getTime();
    };

    const monthlyExpenses = transactions.filter(
      (transaction) => transaction.amount < 0 && inThisMonth(transaction.date),
    );
    const categoryTotals = monthlyExpenses.reduce(
      (acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] || 0) + Math.abs(transaction.amount);
        return acc;
      },
      {} as Record<string, number>,
    );
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const monthLabel = thisMonthStart.toLocaleString("en-US", { month: "long", year: "numeric" });

    if (topCategories.length === 0) {
      answerParts.push(`No expense transactions were found for ${monthLabel}.`);
    } else {
      answerParts.push(
        [
          `Top categories for ${monthLabel}:`,
          ...topCategories.map(
            ([category, amount], index) => `${index + 1}. ${category} ($${amount.toFixed(2)})`,
          ),
        ].join("\n"),
      );
    }
  }

  const asksName = /\b(my name|full name|who am i)\b/.test(q);
  const asksUsername = /\b(user ?name|username|login)\b/.test(q);
  if (asksName) {
    const displayName = !isUnknownIdentityValue(identity.displayName) ? identity.displayName : undefined;
    if (displayName) {
      answerParts.push(`Your name is ${displayName}.`);
    } else {
      answerParts.push("Your name is not available in the current user profile data.");
    }
  }

  if (asksUsername) {
    const email = !isUnknownIdentityValue(identity.email) ? identity.email : undefined;
    const uid = !isUnknownIdentityValue(identity.uid) ? identity.uid : undefined;
    if (email) {
      answerParts.push(`Your username is ${email}.`);
    } else if (uid) {
      answerParts.push(`Your username is ${uid}.`);
    } else {
      answerParts.push("Your username is not available in the current user profile data.");
    }
  }

  const asksGroceriesLast30Days =
    /\b(grocer(y|ies))\b.*\b(last\s*30\s*days|30\s*days|last month)\b/.test(q) ||
    /\b(last\s*30\s*days|30\s*days|last month)\b.*\b(grocer(y|ies))\b/.test(q);
  if (asksGroceriesLast30Days) {
    const nowMs = Date.now();
    const last30DaysMs = 30 * 24 * 60 * 60 * 1000;
    const groceryExpenses = transactions.filter((transaction) => {
      const ms = new Date(transaction.date).getTime();
      if (Number.isNaN(ms) || ms < nowMs - last30DaysMs || ms > nowMs) {
        return false;
      }
      if (transaction.amount >= 0) {
        return false;
      }
      const category = transaction.category.toLowerCase();
      return category.includes("grocery") || category.includes("grocer");
    });

    const total = Math.abs(
      groceryExpenses.reduce((sum, transaction) => sum + transaction.amount, 0),
    );

    answerParts.push(
      `Your grocery spending in the last 30 days is $${total.toFixed(2)}.`,
    );
  }

  const yearListMatch =
    q.match(/\b(show|list)\b.*\btransactions?\b.*\b(20\d{2})\b/) ||
    q.match(/\btransactions?\b.*\b(20\d{2})\b/);
  if (yearListMatch) {
    const year = Number(yearListMatch[2] || yearListMatch[1]);
    const yearTransactions = transactions
      .filter((transaction) => {
        const date = new Date(transaction.date);
        return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (yearTransactions.length === 0) {
      answerParts.push(`No transactions were found for ${year}.`);
    } else {
      const lines = yearTransactions.map(
        (transaction, index) =>
          `${index + 1}. ${transaction.date} - ${transaction.merchant} - ${transaction.category} - $${transaction.amount.toFixed(2)}`,
      );
      const totalIncome = yearTransactions
        .filter((transaction) => transaction.amount > 0)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const totalExpenses = Math.abs(
        yearTransactions
          .filter((transaction) => transaction.amount < 0)
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      );
      answerParts.push(
        [`Here are your transactions for ${year}:`, ...lines, "", `Total income: $${totalIncome.toFixed(2)}`, `Total expenses: $${totalExpenses.toFixed(2)}`].join("\n"),
      );
    }
  }

  const incomeYearMatch =
    q.match(/\btotal income\b.*\b(20\d{2})\b/) ||
    q.match(/\bincome\b.*\b(20\d{2})\b/) ||
    q.match(/\b(20\d{2})\b.*\btotal income\b/);
  if (incomeYearMatch) {
    const year = Number(incomeYearMatch[1]);
    const totalIncome = transactions
      .filter((transaction) => {
        const date = new Date(transaction.date);
        return !Number.isNaN(date.getTime()) && date.getFullYear() === year && transaction.amount > 0;
      })
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    answerParts.push(`Your total income in ${year} is $${totalIncome.toFixed(2)}.`);
  }

  const asksMostExpensive = /\b(most expensive|largest expense|biggest expense|highest expense)\b/.test(q);
  if (asksMostExpensive) {
    const expenses = transactions.filter((transaction) => transaction.amount < 0);
    if (expenses.length === 0) {
      answerParts.push("No expense transactions are available yet.");
    } else {
      const mostExpensive = expenses.reduce((max, current) =>
        Math.abs(current.amount) > Math.abs(max.amount) ? current : max,
      );
      answerParts.push(
        `Your most expensive recorded purchase is ${mostExpensive.merchant} (${mostExpensive.category}) on ${mostExpensive.date} for $${Math.abs(mostExpensive.amount).toFixed(2)}.`,
      );
    }
  }

  const asksOldestExpense = /\b(oldest expense|earliest expense|first expense)\b/.test(q);
  if (asksOldestExpense) {
    const expenses = transactions.filter((transaction) => transaction.amount < 0);
    if (expenses.length === 0) {
      answerParts.push("No expense transactions are available yet.");
    } else {
      const oldestExpense = expenses.reduce((oldest, current) =>
        new Date(current.date).getTime() < new Date(oldest.date).getTime() ? current : oldest,
      );
      answerParts.push(
        `Your oldest recorded expense is ${oldestExpense.merchant} (${oldestExpense.category}) on ${oldestExpense.date} for $${Math.abs(oldestExpense.amount).toFixed(2)}.`,
      );
    }
  }

  return answerParts.length > 0 ? answerParts.join("\n\n") : null;
}

function shouldAttachWideTransactionContext(query: string): boolean {
  const q = query.toLowerCase();
  return /\b(all|almost all|list|show|detail|details|specific|history|transactions?|spending)\b/.test(q);
}

function isParsedTransaction(
  value: ReturnType<typeof parseTransactionDoc>,
): value is NonNullable<ReturnType<typeof parseTransactionDoc>> {
  return value !== null;
}

function parseDateMs(value: string): number | null {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function extractQueryYears(query: string): number[] {
  const matches = query.match(/\b20\d{2}\b/g) || [];
  return Array.from(new Set(matches.map((value) => Number(value))));
}

function extractQueryAmounts(query: string): number[] {
  const matches = query.match(/\$?\d+(?:\.\d+)?/g) || [];
  return Array.from(
    new Set(
      matches
        .map((value) => Number(value.replace("$", "")))
        .filter((value) => !Number.isNaN(value)),
    ),
  );
}

function extractQueryMonths(query: string): number[] {
  const monthKeys = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const lowered = query.toLowerCase();
  return monthKeys
    .map((month, index) => ({ month, index }))
    .filter(({ month }) => new RegExp(`\\b${month}(?:[a-z]+)?\\b`).test(lowered))
    .map(({ index }) => index);
}

function tokenizeForLookup(input: string): string[] {
  return (input.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(
    (token) =>
      ![
        "what",
        "when",
        "where",
        "which",
        "with",
        "from",
        "that",
        "this",
        "transaction",
        "transactions",
        "spending",
        "expense",
        "expenses",
        "income",
        "total",
        "show",
        "list",
        "details",
        "history",
      ].includes(token),
  );
}

type ParsedTransaction = NonNullable<ReturnType<typeof parseTransactionDoc>>;

function buildHybridTransactionContext(query: string, transactions: ParsedTransaction[]): string {
  if (transactions.length === 0) return "";

  const queryYears = extractQueryYears(query);
  const queryMonths = extractQueryMonths(query);
  const queryAmounts = extractQueryAmounts(query);
  const queryTokens = tokenizeForLookup(query);
  const asksOldest = /\b(oldest|earliest|first)\b/.test(query.toLowerCase());

  const enriched = transactions
    .map((transaction) => {
      const dateMs = parseDateMs(transaction.date);
      if (dateMs === null) return null;
      return { ...transaction, dateMs };
    })
    .filter((value): value is ParsedTransaction & { dateMs: number } => value !== null);

  const recent = enriched
    .slice()
    .sort((a, b) => b.dateMs - a.dateMs)
    .slice(0, 80);

  const targeted = enriched
    .map((transaction) => {
      let score = 0;
      const date = new Date(transaction.dateMs);
      const merchantLower = transaction.merchant.toLowerCase();
      const categoryLower = transaction.category.toLowerCase();
      const amountAbs = Math.abs(transaction.amount);

      if (queryYears.length > 0 && queryYears.includes(date.getFullYear())) score += 4;
      if (queryMonths.length > 0 && queryMonths.includes(date.getMonth())) score += 3;
      if (queryAmounts.some((amount) => Math.abs(amountAbs - amount) < 0.01)) score += 4;
      if (queryTokens.some((token) => merchantLower.includes(token))) score += 3;
      if (queryTokens.some((token) => categoryLower.includes(token))) score += 2;

      return { transaction, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.transaction.dateMs - a.transaction.dateMs)
    .slice(0, 80)
    .map((entry) => entry.transaction);

  const oldest = asksOldest
    ? enriched
        .slice()
        .sort((a, b) => a.dateMs - b.dateMs)
        .slice(0, 40)
    : [];

  const combined = [...recent, ...targeted, ...oldest];
  const deduped = Array.from(
    new Map(
      combined.map((transaction) => [
        `${transaction.date}|${transaction.merchant}|${transaction.category}|${transaction.amount}`,
        transaction,
      ]),
    ).values(),
  ).slice(0, 180);

  if (deduped.length === 0) return "";

  return [
    "Wide Transaction Context (hybrid: recent + targeted from full history, user-scoped):",
    ...deduped.map(
      (transaction) =>
        `${transaction.date} | ${transaction.merchant} | ${transaction.category} | ${transaction.amount.toFixed(2)}`,
    ),
  ].join("\n");
}

async function embedText(text: string): Promise<number[]> {
  const payload = {
    model: OLLAMA_EMBED_MODEL,
    input: text,
    prompt: text,
  };

  const embedResponse = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (embedResponse.ok) {
    const embedJson = (await embedResponse.json()) as {
      embeddings?: number[][];
      embedding?: number[];
      error?: string;
    };
    const embedding = embedJson.embedding || embedJson.embeddings?.[0];
    if (embedding?.length) {
      return embedding;
    }
    throw new Error(embedJson.error || "Ollama embed returned no embedding");
  }

  if (embedResponse.status !== 404) {
    const errorJson = (await embedResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorJson.error || `Ollama embed failed with ${embedResponse.status}`);
  }

  // Backward-compatible fallback for older Ollama versions.
  const legacyResponse = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_EMBED_MODEL,
      prompt: text,
    }),
  });

  const legacyJson = (await legacyResponse.json()) as { embedding?: number[]; error?: string };
  if (!legacyResponse.ok || !legacyJson.embedding) {
    throw new Error(legacyJson.error || `Ollama embeddings failed with ${legacyResponse.status}`);
  }

  return legacyJson.embedding;
}

async function upsertRagDocuments(userId: string, documents: RagDocumentInput[]): Promise<void> {
  if (documents.length === 0) {
    return;
  }

  const embeddings = await Promise.all(documents.map((doc) => embedText(doc.text)));
  await ensureVectorCollection(embeddings[0].length);

  const now = new Date().toISOString();
  await qdrant.upsert(vectorCollectionName, {
    wait: true,
    points: documents.map((doc, index) => ({
      id: hashPointId(userId, doc.id),
      vector: embeddings[index],
      payload: {
        userId,
        kind: doc.kind,
        refId: doc.id,
        text: doc.text,
        tags: doc.tags || [],
        createdAt: now,
        updatedAt: now,
      },
    })),
  });
}

async function askOllamaChat(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_CHAT_MODEL,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You are PocketPilot's financial assistant. Use only provided context + user messages. The user is already authenticated and user-scoped data is already provided, so never ask for username, user ID, or authentication details. If needed data is missing, state exactly which financial data is missing.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const json = (await response.json()) as {
    message?: { content?: string };
    error?: string;
  };

  if (!response.ok || !json.message?.content) {
    throw new Error(json.error || `Ollama chat failed with ${response.status}`);
  }

  return json.message.content;
}

export const health = onRequest({ region: REGION }, async (_request, response) => {
  response.status(200).json({
    ok: true,
    service: "pocketpilot-backend",
    qdrant: process.env.QDRANT_URL || "http://127.0.0.1:6333",
    ollama: OLLAMA_BASE_URL,
    ollamaModels: {
      chat: OLLAMA_CHAT_MODEL,
      embed: OLLAMA_EMBED_MODEL,
    },
    timestamp: new Date().toISOString(),
  });
});

export const upsertVector = onRequest({ region: REGION, cors: true }, async (request, response) => {
  try {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const userId = await verifyUserId(request);
    const body = request.body as UpsertVectorBody;

    if (!Array.isArray(body?.vector) || body.vector.length === 0) {
      response.status(400).json({ error: "vector is required" });
      return;
    }

    if (!body.payload?.kind || !body.payload?.refId || !body.payload?.text) {
      response
        .status(400)
        .json({ error: "payload.kind, payload.refId and payload.text are required" });
      return;
    }

    await ensureVectorCollection(body.vector.length);

    const now = new Date().toISOString();
    const pointId = hashPointId(userId, `${body.payload.kind}:${body.payload.refId}`);
    const payload: VectorPayload = {
      userId,
      kind: body.payload.kind,
      refId: body.payload.refId,
      text: body.payload.text,
      tags: body.payload.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await qdrant.upsert(vectorCollectionName, {
      wait: true,
      points: [
        {
          id: pointId,
          vector: body.vector,
          payload: toPayloadRecord(payload),
        },
      ],
    });

    response.status(200).json({ ok: true, id: pointId });
  } catch (error) {
    logger.error("upsertVector failed", error);
    if (isAuthError(error)) {
      response
        .status(401)
        .json({ error: error instanceof Error ? error.message : "Unauthorized" });
      return;
    }
    response.status(500).json({
      error: error instanceof Error ? error.message : "upsertVector failed",
    });
  }
});

export const queryVectors = onRequest({ region: REGION, cors: true }, async (request, response) => {
  try {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const userId = await verifyUserId(request);
    const body = request.body as QueryVectorsBody;

    if (!Array.isArray(body?.vector) || body.vector.length === 0) {
      response.status(400).json({ error: "vector is required" });
      return;
    }

    const kindsFilter = (body.kinds || []).map((kind) => ({
      key: "kind",
      match: { value: kind },
    }));

    const result = await qdrant.search(vectorCollectionName, {
      vector: body.vector,
      limit: Math.min(body.limit || 8, 20),
      score_threshold: body.scoreThreshold,
      filter: {
        must: [
          {
            key: "userId",
            match: { value: userId },
          },
        ],
        ...(kindsFilter.length > 0 ? { should: kindsFilter } : {}),
      },
      with_payload: true,
      with_vector: false,
    });

    response.status(200).json({
      ok: true,
      matches: result,
    });
  } catch (error) {
    logger.error("queryVectors failed", error);
    if (isAuthError(error)) {
      response
        .status(401)
        .json({ error: error instanceof Error ? error.message : "Unauthorized" });
      return;
    }
    response.status(500).json({
      error: error instanceof Error ? error.message : "queryVectors failed",
    });
  }
});

export const ragChat = onRequest({ region: REGION, cors: true }, async (request, response) => {
  try {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const userId = await verifyUserId(request);
    const body = request.body as RagChatBody;

    if (!body?.query?.trim()) {
      response.status(400).json({ error: "query is required" });
      return;
    }

    const docs = Array.isArray(body.documents) ? body.documents.filter((d) => d?.id && d?.text) : [];
    if (docs.length > 0) {
      await upsertRagDocuments(userId, docs);
    }

    const deterministicAnswer = tryDeterministicAnswer(body.query, docs);
    if (deterministicAnswer) {
      response.status(200).json({
        ok: true,
        answer: deterministicAnswer,
        retrieved: docs.length,
        model: "deterministic-rules-v1",
      });
      return;
    }

    const queryEmbedding = await embedText(body.query.trim());
    await ensureVectorCollection(queryEmbedding.length);

    const matches = await qdrant.search(vectorCollectionName, {
      vector: queryEmbedding,
      limit: Math.min(body.topK || 20, 40),
      filter: {
        must: [
          {
            key: "userId",
            match: { value: userId },
          },
        ],
      },
      with_payload: true,
      with_vector: false,
    });

    const wideTransactionContext = (() => {
      if (!shouldAttachWideTransactionContext(body.query)) {
        return "";
      }

      const transactions = docs
        .map(parseTransactionDoc)
        .filter(isParsedTransaction);
      return buildHybridTransactionContext(body.query, transactions);
    })();

    const contextBlocks = matches
      .map((match, index) => {
        const payload = match.payload as { text?: string; kind?: string; refId?: string } | undefined;
        return `Context ${index + 1} [${payload?.kind || "unknown"}:${payload?.refId || "unknown"}]\n${payload?.text || ""}`;
      })
      .join("\n\n");

    const recentMessages = (body.messages || []).slice(-6);
    const chatHistory = recentMessages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");

    const prompt = [
      "Use this user-specific financial context to answer the question.",
      "If the answer cannot be derived from context, clearly say that.",
      "Keep answers concise and practical.",
      "If monthly summary context is available, use it first for month-over-month or total spending questions.",
      "Prefer concrete numbers and a short explanation of the biggest drivers.",
      "",
      "Retrieved Context:",
      contextBlocks || "No context found.",
      ...(wideTransactionContext ? ["", wideTransactionContext] : []),
      "",
      "Recent Conversation:",
      chatHistory || "None",
      "",
      `User Question: ${body.query.trim()}`,
    ].join("\n");

    const answer = await askOllamaChat(prompt);

    response.status(200).json({
      ok: true,
      answer,
      retrieved: matches.length,
      model: OLLAMA_CHAT_MODEL,
    });
  } catch (error) {
    logger.error("ragChat failed", error);
    response.status(500).json({
      error: error instanceof Error ? error.message : "RAG chat failed",
    });
  }
});
