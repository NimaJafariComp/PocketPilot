import { createHash } from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import type { Request } from "express";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import {
  categorizeTransactions as categorizeTransactionsInternal,
  learnMerchantCategory as learnMerchantCategoryInternal,
} from "./categorization.js";
import {
  buildSparseVector,
  deletePoints,
  ensureVectorCollection,
  type PayloadFilterCondition,
  queryDensePoints,
  ragVectorSource,
  searchHybridPoints,
  type SparseBoost,
  scrollUserSourcePoints,
  upsertPoints,
} from "./qdrant.js";
import type {
  CategorizeTransactionsBody,
  LearnMerchantCategoryBody,
  QueryVectorsBody,
  RagChatBody,
  RagDocumentInput,
  SyncRagIndexBody,
  UpsertVectorBody,
} from "./types.js";

const REGION = "us-central1";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "qwen2.5:1.5b";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text:v1.5";
const SYNC_EMBED_BATCH_SIZE = 25;

interface ParsedTransaction {
  id: string;
  date: string;
  merchant: string;
  normalizedMerchant: string;
  merchantMatchKey: string;
  category: string;
  amount: number;
  notes?: string;
}

interface SyncStats {
  indexed: number;
  skipped: number;
  removed: number;
}

interface TransactionSearchConstraints {
  extraMust: PayloadFilterCondition[];
  filteredTransactions: ParsedTransaction[];
  kinds?: Array<"transaction">;
}

type RagIntentRoute = "structured" | "hybrid";

interface RagIntent {
  route: RagIntentRoute;
  reason: string;
}

interface ConversationalShortcut {
  answer: string;
  reason: string;
}

interface RelativeDateWindow {
  fromMs: number;
  toMs: number;
}

const MERCHANT_NOISE_TOKENS = new Set([
  "ach",
  "auth",
  "card",
  "check",
  "checkcard",
  "com",
  "dbt",
  "debit",
  "inc",
  "llc",
  "online",
  "payment",
  "pos",
  "purchase",
  "sq",
  "tap",
  "visa",
  "withdrawal",
]);

const US_STATE_CODES = [
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia",
  "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
  "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt",
  "va", "wa", "wv", "wi", "wy",
].join("|");

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

function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function sanitizeMetadata(
  metadata: RagDocumentInput["metadata"],
): Record<string, string | number | boolean | null> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined),
  );
}

function addSparseBoost(boosts: SparseBoost[], value: unknown, weight: number): void {
  if (typeof value !== "string" && typeof value !== "number") {
    return;
  }

  const token = String(value).trim().toLowerCase();
  if (!token) {
    return;
  }

  boosts.push({ token, weight });
}

function buildSparseBoosts(document: RagDocumentInput): SparseBoost[] {
  const boosts: SparseBoost[] = [];
  const metadata = document.metadata || {};

  if (document.kind === "transaction") {
    addSparseBoost(boosts, metadata.transactionId, 12);
    addSparseBoost(boosts, metadata.transactionId, 8);
    addSparseBoost(boosts, metadata.merchantMatchKey, 10);
    addSparseBoost(boosts, metadata.normalizedMerchant, 8);
    addSparseBoost(boosts, metadata.merchant, 7);
    addSparseBoost(boosts, metadata.merchantLower, 7);
    addSparseBoost(boosts, metadata.transactionDate, 6);
    addSparseBoost(boosts, metadata.transactionMonthName, 4);
    addSparseBoost(boosts, metadata.transactionYear, 4);
    addSparseBoost(boosts, metadata.amountAbs, 4);
    addSparseBoost(boosts, metadata.category, 2);
  }

  return boosts;
}

function normalizeMerchantForSearch(merchant: string, category?: string): string {
  let normalized = merchant
    .toLowerCase()
    .replace(/\s+#\s*\d+[a-z0-9-]*\b/g, " ")
    .replace(/\s+store\s+\d+\b/g, " ")
    .replace(/\s*-\s*\d+\b/g, " ")
    .replace(/\s+[a-z0-9]+\s+(street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|way|plaza|mall|suite|ste|center|centre)\b$/g, " ")
    .replace(/[*]/g, " ")
    .replace(new RegExp(`(?:\\s+|,)(?:${US_STATE_CODES})\\b$`, "g"), " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b\d{2,}\b/g, " ");

  const tokens = normalized
    .split(/\s+/)
    .filter((token) => token && !MERCHANT_NOISE_TOKENS.has(token));

  normalized = tokens.join(" ").trim();

  const categoryLower = category?.toLowerCase() || "";
  if (categoryLower.includes("grocery")) {
    normalized = normalized.replace(/\s+market$/, "");
  }
  if (categoryLower.includes("dining") || categoryLower.includes("restaurant")) {
    normalized = normalized.replace(/\s+(coffee|cafe|restaurant)$/, "");
  }
  if (categoryLower.includes("shopping")) {
    normalized = normalized.replace(/\s+store$/, "");
  }

  return normalized || merchant.trim().toLowerCase();
}

function buildMerchantMatchKey(merchant: string, category?: string): string {
  return normalizeMerchantForSearch(merchant, category).replace(/[^a-z0-9]/g, "");
}

async function loadUserTransactions(userId: string): Promise<ParsedTransaction[]> {
  const snapshot = await adminDb.collection("users").doc(userId).collection("transactions").get();

  const transactions = snapshot.docs.map((doc): ParsedTransaction | null => {
      const data = doc.data() as Partial<ParsedTransaction>;
      if (
        typeof data.date !== "string" ||
        typeof data.merchant !== "string" ||
        typeof data.category !== "string" ||
        typeof data.amount !== "number"
      ) {
        return null;
      }

      const transaction: ParsedTransaction = {
        id: doc.id,
        date: data.date,
        merchant: data.merchant,
        category: data.category,
        amount: data.amount,
        normalizedMerchant: normalizeMerchantForSearch(
          typeof data.normalizedMerchant === "string" && data.normalizedMerchant.trim()
            ? data.normalizedMerchant
            : data.merchant,
          data.category,
        ),
        merchantMatchKey: buildMerchantMatchKey(
          typeof data.normalizedMerchant === "string" && data.normalizedMerchant.trim()
            ? data.normalizedMerchant
            : data.merchant,
          data.category,
        ),
      };

      if (typeof data.notes === "string") {
        transaction.notes = data.notes;
      }

      return transaction;
    });

  return transactions.filter((value): value is ParsedTransaction => value !== null);
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

function normalizeLookup(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compactLookup(input: string): string {
  return normalizeLookup(input).replace(/\s+/g, "");
}

function findMentionedTransactionId(query: string, transactions: ParsedTransaction[]): string | null {
  const queryLower = query.toLowerCase();
  const uniqueIds = Array.from(new Set(transactions.map((transaction) => transaction.id)))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const id of uniqueIds) {
    if (queryLower.includes(id.toLowerCase())) {
      return id;
    }
  }

  return null;
}

function findMentionedMerchant(query: string, transactions: ParsedTransaction[]): string | null {
  const queryLower = query.toLowerCase();
  const normalizedQuery = normalizeLookup(query);
  const compactQuery = compactLookup(query);
  const queryTokens = tokenizeForLookup(query);
  const merchants = Array.from(
    new Map(
      transactions.map((transaction) => [
        transaction.merchantMatchKey,
        {
          merchantLower: transaction.merchant.toLowerCase(),
          normalizedMerchant: transaction.normalizedMerchant,
          merchantMatchKey: transaction.merchantMatchKey,
          merchantTokens: tokenizeForLookup(transaction.normalizedMerchant),
        },
      ]),
    ).values(),
  ).sort((a, b) => b.merchantMatchKey.length - a.merchantMatchKey.length);

  for (const merchant of merchants) {
    if (
      compactQuery.includes(merchant.merchantMatchKey) ||
      queryLower.includes(merchant.merchantLower) ||
      normalizedQuery.includes(merchant.normalizedMerchant)
    ) {
      return merchant.merchantMatchKey;
    }
  }

  let bestMatch: { merchantMatchKey: string; score: number } | null = null;
  for (const merchant of merchants) {
    const score = queryTokens.reduce((total, token) => {
      if (merchant.merchantTokens.includes(token)) {
        return total + 3;
      }
      if (merchant.normalizedMerchant.includes(token)) {
        return total + 2;
      }
      if (merchant.merchantMatchKey.includes(token)) {
        return total + 2;
      }
      return total;
    }, 0);

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        merchantMatchKey: merchant.merchantMatchKey,
        score,
      };
    }
  }

  if (bestMatch) {
    return bestMatch.merchantMatchKey;
  }

  return null;
}

function findMentionedCategories(query: string, transactions: ParsedTransaction[]): string[] {
  const normalizedQuery = normalizeLookup(query);
  const compactQuery = compactLookup(query);
  const matches = new Set<string>();
  const categories = Array.from(
    new Map(
      transactions.map((transaction) => {
        const category = transaction.category.trim();
        return [
          category.toLowerCase(),
          {
            raw: category,
            normalized: normalizeLookup(category),
            compact: compactLookup(category),
          },
        ] as const;
      }),
    ).values(),
  ).sort((a, b) => b.compact.length - a.compact.length);

  for (const category of categories) {
    if (
      compactQuery.includes(category.compact) ||
      normalizedQuery.includes(category.normalized)
    ) {
      matches.add(category.raw);
    }
  }

  if (/\bgrocer(y|ies)\b/.test(query.toLowerCase())) {
    matches.add("Groceries");
  }

  if (/\bgas\b/.test(query.toLowerCase())) {
    const gasAlias = categories.find((category) =>
      /\b(gas|fuel|transportation)\b/.test(category.normalized),
    );
    if (gasAlias) {
      matches.add(gasAlias.raw);
    } else {
      matches.add("Transportation");
    }
  }

  if (/\bgames?\b/.test(query.toLowerCase())) {
    const gamesAlias = categories.find((category) =>
      /\b(games?|gaming|entertainment)\b/.test(category.normalized),
    );
    if (gamesAlias) {
      matches.add(gamesAlias.raw);
    } else {
      matches.add("Entertainment");
    }
  }

  return Array.from(matches);
}

function inferRelativeDateWindow(query: string): RelativeDateWindow | null {
  const q = query.toLowerCase();
  const now = new Date();

  if (/\btoday\b/.test(q)) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { fromMs: start.getTime(), toMs: end.getTime() };
  }

  if (/\byesterday\b/.test(q)) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { fromMs: start.getTime(), toMs: end.getTime() };
  }

  if (/\bthis month\b/.test(q)) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { fromMs: start.getTime(), toMs: end.getTime() };
  }

  if (/\blast month\b/.test(q)) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromMs: start.getTime(), toMs: end.getTime() };
  }

  if (/\blast 30 days\b|\b30 days\b/.test(q)) {
    return { fromMs: now.getTime() - 30 * 24 * 60 * 60 * 1000, toMs: now.getTime() + 1 };
  }

  if (/\bthis year\b/.test(q)) {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return { fromMs: start.getTime(), toMs: end.getTime() };
  }

  if (/\b(year to date|year-to-date|whole year(?:\s+to\s+now)?)\b/.test(q)) {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getTime() + 1);
    return { fromMs: start.getTime(), toMs: end.getTime() };
  }

  if (/\blast year\b/.test(q)) {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear(), 0, 1);
    return { fromMs: start.getTime(), toMs: end.getTime() };
  }

  return null;
}

function inferAmountDirection(query: string): "expense" | "income" | "any" {
  const q = query.toLowerCase();

  if (/\b(income|earned|earn|salary|paycheck|deposit|deposits)\b/.test(q)) {
    return "income";
  }

  if (/\b(spent|spend|expense|expenses|purchase|purchases|bought|buy|paid)\b/.test(q)) {
    return "expense";
  }

  return "any";
}

function classifyConversationalShortcut(query: string): ConversationalShortcut | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const isBareGreeting = /^(hi|hello|hey|yo|sup|good morning|good afternoon|good evening|hola)\b[!.?]*$/.test(q);
  if (isBareGreeting) {
    return {
      answer: "Hello! I'm ready to help with your spending, budgets, goals, and transaction questions.",
      reason: "greeting-shortcut",
    };
  }

  const isHowAreYou =
    /^(how are you|how's it going|hows it going|how are things|how's your day|hows your day)\b[!.?]*$/.test(q);
  if (isHowAreYou) {
    return {
      answer: "Doing well and ready to help. Ask me about your transactions, spending patterns, budgets, or goals.",
      reason: "smalltalk-status-shortcut",
    };
  }

  const isThanks = /^(thanks|thank you|thx|tysm|awesome thanks|great thanks)\b[!.?]*$/.test(q);
  if (isThanks) {
    return {
      answer: "You're welcome. I'm here whenever you want to dig into your finances.",
      reason: "gratitude-shortcut",
    };
  }

  const isGoodbye = /^(bye|goodbye|see you|talk later|catch you later)\b[!.?]*$/.test(q);
  if (isGoodbye) {
    return {
      answer: "See you later. Come back anytime if you want help with your finances.",
      reason: "farewell-shortcut",
    };
  }

  const isCapabilityQuestion =
    /^(what can you do|help|help me|what do you do|who are you|what are you)\b[!.?]*$/.test(q);
  if (isCapabilityQuestion) {
    return {
      answer:
        "I can answer questions about your transactions, spending totals, merchants, categories, budgets, goals, and broader spending patterns.",
      reason: "capability-shortcut",
    };
  }

  return null;
}

function classifyFinanceIntent(query: string): RagIntent {
  const q = query.toLowerCase();

  const exploratorySignals =
    /\b(why|pattern|patterns|trend|trends|anomaly|anomalies|insight|insights|recommend|suggest|improve|optimi[sz]e|advice|forecast|predict|recurring|subscription|subscriptions|compare|comparison|summarize|summary|overall)\b/.test(
      q,
    );

  const exploratorySemanticSignals =
    /\b(recurring|subscription|subscriptions|pattern|patterns|trend|trends|anomaly|anomalies|insight|insights|compare|comparison|summarize|summary|overall)\b/.test(
      q,
    );

  const strongStructuredSignals =
    hasPrecisionSignals(query) ||
    /\b(show|list|find|how much|how many|count|total|latest|last|recent|first|oldest|earliest|largest|highest|biggest|lowest|smallest)\b/.test(
      q,
    ) ||
    /\b(transaction|transactions|merchant|category|grocer(y|ies)|income|expense|expenses|spent|spending|deposit|deposits)\b/.test(
      q,
    );

  const structuredSignals =
    strongStructuredSignals || /\bwhen\b/.test(q);

  if (exploratorySemanticSignals && !hasPrecisionSignals(query)) {
    return { route: "hybrid", reason: "exploratory-semantic-query" };
  }

  if (exploratorySignals && !structuredSignals) {
    return { route: "hybrid", reason: "exploratory-query" };
  }

  if (structuredSignals) {
    return { route: "structured", reason: "structured-finance-query" };
  }

  return { route: "hybrid", reason: "ambiguous-query" };
}

function hasPrecisionSignals(query: string): boolean {
  const q = query.toLowerCase();
  return (
    /\b\d{4}-\d{2}(?:-\d{2})?\b/.test(q) ||
    /\$\s*\d/.test(q) ||
    /\b\d+\.\d+\b/.test(q) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b/.test(q) ||
    /\b[a-z]{1,4}-[a-z0-9]{4,}\b/.test(q)
  );
}

function needsStructuredTransactions(query: string): boolean {
  const q = query.toLowerCase();
  return (
    shouldAttachWideTransactionContext(query) ||
    hasPrecisionSignals(query) ||
    /\b(last month|this month|grocer(y|ies)|income|expense|expenses|spent|spending|largest expense|most expensive|highest expense|oldest expense|earliest expense|first expense)\b/.test(
      q,
    ) ||
    /\b20\d{2}\b/.test(q)
  );
}

function inferTransactionSearchConstraints(
  query: string,
  transactions: ParsedTransaction[],
): TransactionSearchConstraints {
  const extraMust: PayloadFilterCondition[] = [];
  let filteredTransactions = transactions.slice();

  const transactionId = findMentionedTransactionId(query, filteredTransactions);
  if (transactionId) {
    extraMust.push({
      key: "transactionId",
      match: { value: transactionId },
    });
    filteredTransactions = filteredTransactions.filter((transaction) => transaction.id === transactionId);
  }

  const merchant = findMentionedMerchant(query, filteredTransactions);
  if (merchant) {
    extraMust.push({
      key: "merchantMatchKey",
      match: { value: merchant },
    });
    filteredTransactions = filteredTransactions.filter(
      (transaction) => transaction.merchantMatchKey === merchant,
    );
  }

  const categories = findMentionedCategories(query, filteredTransactions);
  if (categories.length > 0) {
    filteredTransactions = filteredTransactions.filter(
      (transaction) => categories.some((category) =>
        transaction.category.toLowerCase() === category.toLowerCase() ||
        transaction.category.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(transaction.category.toLowerCase()),
      ),
    );
  }

  const queryYears = extractQueryYears(query);
  if (queryYears.length === 1) {
    extraMust.push({
      key: "transactionYear",
      match: { value: queryYears[0] },
    });
    filteredTransactions = filteredTransactions.filter((transaction) => {
      const ms = parseDateMs(transaction.date);
      return ms !== null && new Date(ms).getFullYear() === queryYears[0];
    });
  } else if (queryYears.length > 1) {
    extraMust.push({
      key: "transactionYear",
      match: { any: queryYears },
    });
    filteredTransactions = filteredTransactions.filter((transaction) => {
      const ms = parseDateMs(transaction.date);
      return ms !== null && queryYears.includes(new Date(ms).getFullYear());
    });
  }

  const queryMonths = extractQueryMonths(query).map((month) => month + 1);
  if (queryMonths.length === 1) {
    extraMust.push({
      key: "transactionMonth",
      match: { value: queryMonths[0] },
    });
    filteredTransactions = filteredTransactions.filter((transaction) => {
      const ms = parseDateMs(transaction.date);
      return ms !== null && new Date(ms).getMonth() + 1 === queryMonths[0];
    });
  } else if (queryMonths.length > 1) {
    extraMust.push({
      key: "transactionMonth",
      match: { any: queryMonths },
    });
    filteredTransactions = filteredTransactions.filter((transaction) => {
      const ms = parseDateMs(transaction.date);
      return ms !== null && queryMonths.includes(new Date(ms).getMonth() + 1);
    });
  }

  const relativeWindow = inferRelativeDateWindow(query);
  if (relativeWindow) {
    filteredTransactions = filteredTransactions.filter((transaction) => {
      const ms = parseDateMs(transaction.date);
      return ms !== null && ms >= relativeWindow.fromMs && ms < relativeWindow.toMs;
    });
  }

  const amountDirection = inferAmountDirection(query);
  if (amountDirection === "expense") {
    filteredTransactions = filteredTransactions.filter((transaction) => transaction.amount < 0);
  } else if (amountDirection === "income") {
    filteredTransactions = filteredTransactions.filter((transaction) => transaction.amount > 0);
  }

  return {
    extraMust,
    filteredTransactions,
    kinds: extraMust.length > 0 ? ["transaction"] : undefined,
  };
}

function tryDeterministicAnswer(query: string, transactions: ParsedTransaction[]): string | null {
  const q = query.toLowerCase();
  const answerParts: string[] = [];
  const mentionedTransactionId = findMentionedTransactionId(query, transactions);
  const expenses = transactions.filter((transaction) => transaction.amount < 0);
  const incomes = transactions.filter((transaction) => transaction.amount > 0);
  const datedTransactions = transactions
    .map((transaction) => {
      const dateMs = parseDateMs(transaction.date);
      return dateMs === null ? null : { ...transaction, dateMs };
    })
    .filter((transaction): transaction is ParsedTransaction & { dateMs: number } => transaction !== null);

  if (mentionedTransactionId) {
    const exactTransaction = transactions.find((transaction) => transaction.id === mentionedTransactionId);
    if (exactTransaction) {
      return [
        `Transaction ${exactTransaction.id}`,
        `Date: ${exactTransaction.date}`,
        `Merchant: ${exactTransaction.merchant}`,
        `Category: ${exactTransaction.category}`,
        `Amount: $${exactTransaction.amount.toFixed(2)}`,
        exactTransaction.notes ? `Notes: ${exactTransaction.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

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

  const queryYears = extractQueryYears(q);
  const asksTopCategories = /\btop\s*[1-9]?\s*(categories|category)\b/.test(q);
  const asksTopCategoriesYtd =
    asksTopCategories &&
    /\b(this year|year to date|ytd|this calendar year|current year|of the year)\b/.test(q);
  const asksTopCategoriesThisYear =
    asksTopCategories &&
    (asksTopCategoriesYtd || queryYears.length > 0);
  const asksTopCategoriesThisMonth =
    asksTopCategories &&
    /\bthis month\b/.test(q);
  const ambiguousYearAndMonth = asksTopCategoriesThisYear && asksTopCategoriesThisMonth;

  const resolveTopCategoriesForYear = (year: number) => {
    const yearStart = new Date(year, 0, 1);
    const nextYearStart = new Date(year + 1, 0, 1);
    const inYear = (iso: string): boolean => {
      const ms = new Date(iso).getTime();
      return !Number.isNaN(ms) && ms >= yearStart.getTime() && ms < nextYearStart.getTime();
    };

    const yearlyExpenses = transactions.filter(
      (transaction) => transaction.amount < 0 && inYear(transaction.date),
    );
    const categoryTotals = yearlyExpenses.reduce(
      (acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] || 0) + Math.abs(transaction.amount);
        return acc;
      },
      {} as Record<string, number>,
    );
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      topCategories,
      yearLabel: year,
      yearlyExpensesCount: yearlyExpenses.length,
    };
  };

  const resolveTopCategoriesForMonth = () => {
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
    const monthLabel = thisMonthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return { topCategories, monthLabel, monthlyExpensesCount: monthlyExpenses.length };
  };

  let processedTopCategories = false;

  if (asksTopCategories && (queryYears.length > 0 || asksTopCategoriesThisYear)) {
    const targetYear = queryYears.length > 0 ? queryYears[0] : new Date().getFullYear();
    const isExplicitYearQuery = queryYears.length > 0;
    const ytdExpenses = transactions.filter((transaction) => transaction.amount < 0);
    const ytdCategoryTotals = ytdExpenses.reduce(
      (acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] || 0) + Math.abs(transaction.amount);
        return acc;
      },
      {} as Record<string, number>,
    );
    const ytdTopCategories = Object.entries(ytdCategoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const { topCategories, yearLabel, yearlyExpensesCount } = isExplicitYearQuery
      ? resolveTopCategoriesForYear(targetYear)
      : {
          topCategories: ytdTopCategories,
          yearLabel: `${targetYear} year to date`,
          yearlyExpensesCount: ytdExpenses.length,
        };

    if (topCategories.length > 0) {
      answerParts.push(
        [
          `Top categories for ${yearLabel}:`,
          ...topCategories.map(
            ([category, amount], index) => `${index + 1}. ${category} ($${amount.toFixed(2)})`,
          ),
        ].join('\n'),
      );
      processedTopCategories = true;
    } else if (ambiguousYearAndMonth || asksTopCategoriesThisMonth) {
      const { topCategories: monthTopCategories, monthLabel, monthlyExpensesCount } = resolveTopCategoriesForMonth();
      if (monthTopCategories.length > 0) {
        answerParts.push(
          [
            `Top categories for ${monthLabel}:`,
            ...monthTopCategories.map(
              ([category, amount], index) => `${index + 1}. ${category} ($${amount.toFixed(2)})`,
            ),
          ].join('\n'),
        );
        processedTopCategories = true;
      }
    }

    if (!processedTopCategories) {
      if (!isExplicitYearQuery) {
        const allCurrentYearExpenses = resolveTopCategoriesForYear(targetYear).yearlyExpensesCount;
        const todayLabel = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        if (allCurrentYearExpenses > 0) {
          answerParts.push(
            `No expense transactions were found from January 1, ${targetYear} through ${todayLabel}, although there are transactions elsewhere in ${targetYear}.`,
          );
        } else {
          answerParts.push(`No expense transactions were found so far in ${targetYear}.`);
        }
      } else {
        answerParts.push(`No expense transactions were found for ${queryYears[0]}.`);
      }
      processedTopCategories = true;
    }
  }

  if (!processedTopCategories && asksTopCategoriesThisMonth) {
    const { topCategories, monthLabel } = resolveTopCategoriesForMonth();
    if (topCategories.length === 0) {
      answerParts.push(`No expense transactions were found for ${monthLabel}.`);
    } else {
      answerParts.push(
        [
          `Top categories for ${monthLabel}:`,
          ...topCategories.map(
            ([category, amount], index) => `${index + 1}. ${category} ($${amount.toFixed(2)})`,
          ),
        ].join('\n'),
      );
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

    const total = Math.abs(groceryExpenses.reduce((sum, transaction) => sum + transaction.amount, 0));
    answerParts.push(`Your grocery spending in the last 30 days is $${total.toFixed(2)}.`);
  }

  const asksLastGroceries =
    /\bwhen\b.*\blast\b.*\b(grocer(y|ies))\b/.test(q) ||
    /\blast\b.*\btime\b.*\b(grocer(y|ies))\b/.test(q) ||
    /\b(grocer(y|ies))\b.*\blast\b.*\bwhen\b/.test(q) ||
    /\b(grocer(y|ies))\b.*\blast\b.*\btime\b/.test(q);
  if (asksLastGroceries) {
    const latestGroceryExpense = transactions
      .filter((transaction) => {
        if (transaction.amount >= 0) {
          return false;
        }
        const category = transaction.category.toLowerCase();
        return category.includes("grocery") || category.includes("grocer");
      })
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!latestGroceryExpense) {
      answerParts.push("I couldn't find any grocery purchases in your transactions yet.");
    } else {
      answerParts.push(
        `Your most recent grocery purchase was on ${latestGroceryExpense.date} at ${latestGroceryExpense.merchant} for $${Math.abs(latestGroceryExpense.amount).toFixed(2)}.`,
      );
    }
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
        [
          `Here are your transactions for ${year}:`,
          ...lines,
          "",
          `Total income: $${totalIncome.toFixed(2)}`,
          `Total expenses: $${totalExpenses.toFixed(2)}`,
        ].join("\n"),
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

  const asksLatestTransaction =
    /\b(when\b.*\blast\b|last time|most recent|latest)\b/.test(q) &&
    !/\b(last month|last year|last 30 days)\b/.test(q);
  if (asksLatestTransaction && answerParts.length === 0) {
    const latestTransaction = datedTransactions
      .slice()
      .sort((a, b) => b.dateMs - a.dateMs)[0];

    if (latestTransaction) {
      answerParts.push(
        `Your most recent matching transaction was on ${latestTransaction.date} at ${latestTransaction.merchant} for $${Math.abs(latestTransaction.amount).toFixed(2)} (${latestTransaction.category}).`,
      );
    }
  }

  const asksFirstTransaction =
    /\b(first|earliest|oldest)\b/.test(q) && /\b(transaction|purchase|expense|income|deposit)\b/.test(q);
  if (asksFirstTransaction && answerParts.length === 0) {
    const earliestTransaction = datedTransactions
      .slice()
      .sort((a, b) => a.dateMs - b.dateMs)[0];

    if (earliestTransaction) {
      answerParts.push(
        `Your earliest matching transaction was on ${earliestTransaction.date} at ${earliestTransaction.merchant} for $${Math.abs(earliestTransaction.amount).toFixed(2)} (${earliestTransaction.category}).`,
      );
    }
  }

  const asksCount =
    /\bhow many\b/.test(q) ||
    (/\bcount\b/.test(q) && /\b(transaction|transactions|purchase|purchases|expense|expenses|deposit|deposits)\b/.test(q));
  if (asksCount && answerParts.length === 0) {
    answerParts.push(`I found ${transactions.length} matching transactions.`);
  }

  const asksTotal =
    (/\bhow much\b/.test(q) || /\btotal\b/.test(q)) &&
    /\b(spent|spend|expense|expenses|income|earned|earn|deposit|deposits|purchase|purchases)\b/.test(q);
  if (asksTotal && answerParts.length === 0) {
    const direction = inferAmountDirection(query);
    const base = direction === "income" ? incomes : direction === "expense" ? expenses : transactions;
    const signedTotal = base.reduce((sum, transaction) => sum + transaction.amount, 0);
    const displayTotal = direction === "income" ? signedTotal : Math.abs(signedTotal);
    const descriptor =
      direction === "income" ? "total matching income" :
      direction === "expense" ? "total matching spending" :
      "total across matching transactions";
    answerParts.push(`${descriptor.charAt(0).toUpperCase()}${descriptor.slice(1)} is $${displayTotal.toFixed(2)}.`);
  }

  const asksMerchantSpend =
    /\bwhat\b.*\bspend\b.*\bat\b/.test(q) ||
    /\bhow much\b.*\bspend\b.*\bat\b/.test(q) ||
    /\bspend\b.*\bat\b/.test(q);
  if (asksMerchantSpend && answerParts.length === 0) {
    if (expenses.length === 0) {
      answerParts.push("I couldn't find any matching spending transactions.");
    } else {
      const totalSpent = Math.abs(expenses.reduce((sum, transaction) => sum + transaction.amount, 0));
      const dateRange = datedTransactions
        .slice()
        .sort((a, b) => a.dateMs - b.dateMs);
      const firstDate = dateRange[0]?.date;
      const lastDate = dateRange[dateRange.length - 1]?.date;
      answerParts.push(
        [
          `You spent $${totalSpent.toFixed(2)} across ${expenses.length} matching transaction${expenses.length === 1 ? "" : "s"}.`,
          firstDate && lastDate && firstDate !== lastDate ? `Date range: ${firstDate} to ${lastDate}.` : "",
          expenses.length > 0
            ? `Matches: ${expenses
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 3)
                .map((transaction) => `${transaction.date} ${transaction.merchant} $${Math.abs(transaction.amount).toFixed(2)}`)
                .join("; ")}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    }
  }

  const listMatch = q.match(/\b(last|recent)\s+(\d+)\b/);
  const asksList =
    /\b(show|list)\b/.test(q) && /\b(transaction|transactions|purchase|purchases|expense|expenses|deposit|deposits)\b/.test(q);
  if (asksList && answerParts.length === 0) {
    const limit = Math.min(Math.max(Number(listMatch?.[2] || 5), 1), 10);
    const recentMatches = datedTransactions
      .slice()
      .sort((a, b) => b.dateMs - a.dateMs)
      .slice(0, limit);

    if (recentMatches.length === 0) {
      answerParts.push("I couldn't find any matching transactions.");
    } else {
      answerParts.push(
        [
          `Here are the ${recentMatches.length} most recent matching transactions:`,
          ...recentMatches.map(
            (transaction, index) =>
              `${index + 1}. ${transaction.date} - ${transaction.merchant} - ${transaction.category} - $${Math.abs(transaction.amount).toFixed(2)}`,
          ),
        ].join("\n"),
      );
    }
  }

  return answerParts.length > 0 ? answerParts.join("\n\n") : null;
}

function shouldAttachWideTransactionContext(query: string): boolean {
  const q = query.toLowerCase();
  return /\b(all|almost all|list|show|detail|details|specific|history|transactions?|spending)\b/.test(q);
}

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
    "Wide Transaction Context (structured exact data, user-scoped):",
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

async function loadExistingIndexPoints(userId: string) {
  try {
    return await scrollUserSourcePoints(userId);
  } catch (error) {
    if (error instanceof Error && error.message === "QDRANT_NOT_FOUND") {
      return [];
    }
    throw error;
  }
}

async function syncRagDocuments(
  userId: string,
  documents: RagDocumentInput[],
  removedRefIds: string[] = [],
): Promise<SyncStats> {
  const existingPoints = await loadExistingIndexPoints(userId);
  const existingByRefId = new Map(
    existingPoints
      .map((point) => {
        const payload = point.payload;
        if (!payload?.refId) return null;
        return [
          payload.refId,
          {
            id: point.id,
            contentHash: typeof payload.contentHash === "string" ? payload.contentHash : "",
          },
        ] as const;
      })
      .filter((value): value is readonly [string, { id: string | number; contentHash: string }] => value !== null),
  );

  const changedDocuments: Array<RagDocumentInput & { contentHash: string }> = [];
  let skipped = 0;

  for (const document of documents) {
    const contentHash = hashContent(document.text);
    const existing = existingByRefId.get(document.id);
    if (existing && existing.contentHash === contentHash) {
      skipped += 1;
      continue;
    }

    changedDocuments.push({ ...document, contentHash });
  }

  const removedIds = removedRefIds
    .map((refId) => existingByRefId.get(refId)?.id)
    .filter((value): value is string | number => value !== undefined);

  if (changedDocuments.length > 0) {
    for (const batch of chunkArray(changedDocuments, SYNC_EMBED_BATCH_SIZE)) {
      const embeddings = await Promise.all(batch.map((document) => embedText(document.text)));
      await ensureVectorCollection(embeddings[0].length);

      const now = new Date().toISOString();
      await upsertPoints(
        batch.map((document, index) => ({
          id: hashPointId(userId, document.id),
          denseVector: embeddings[index],
          sparseVector: buildSparseVector(document.text, buildSparseBoosts(document)),
          payload: {
            userId,
            kind: document.kind,
            refId: document.id,
            text: document.text,
            tags: document.tags || [],
            ...sanitizeMetadata(document.metadata),
            source: ragVectorSource,
            contentHash: document.contentHash,
            createdAt: now,
            updatedAt: now,
          },
        })),
      );
    }
  }

  if (removedIds.length > 0) {
    await deletePoints(removedIds);
  }

  return {
    indexed: changedDocuments.length,
    skipped,
    removed: removedIds.length,
  };
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
            "You are PocketPilot's financial assistant. Use only provided context plus the recent conversation. Structured transaction context contains exact user-scoped values and should win over semantic hints when numbers or dates are involved. The user is already authenticated, so never ask for usernames, user IDs, or login details. If data is missing, say exactly which financial data is missing.",
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

export const syncRagIndex = onRequest({ region: REGION, cors: true, timeoutSeconds: 300 }, async (request, response) => {
  try {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const userId = await verifyUserId(request);
    const body = request.body as SyncRagIndexBody;
    const documents = Array.isArray(body?.documents)
      ? body.documents.filter((document) => document?.id && document?.text)
      : [];
    const removedIds = Array.isArray(body?.removedIds)
      ? body.removedIds.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];
    const batchIndex = typeof body?.batchIndex === "number" ? body.batchIndex : 1;
    const batchCount = typeof body?.batchCount === "number" ? body.batchCount : 1;
    const totalOperations =
      typeof body?.totalOperations === "number" && body.totalOperations > 0
        ? body.totalOperations
        : documents.length + removedIds.length;

    const stats = await syncRagDocuments(userId, documents, removedIds);
    response.status(200).json({
      ok: true,
      ...stats,
      model: OLLAMA_EMBED_MODEL,
      processed: stats.indexed + stats.skipped + stats.removed,
      total: totalOperations,
      batchIndex,
      batchCount,
      done: batchIndex >= batchCount,
    });
  } catch (error) {
    logger.error("syncRagIndex failed", error);
    if (isAuthError(error)) {
      response.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized" });
      return;
    }
    response.status(500).json({
      error: error instanceof Error ? error.message : "syncRagIndex failed",
    });
  }
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
    await upsertPoints([
      {
        id: pointId,
        denseVector: body.vector,
        sparseVector: buildSparseVector(body.payload.text),
        payload: {
          userId,
          kind: body.payload.kind,
          refId: body.payload.refId,
          text: body.payload.text,
          tags: body.payload.tags || [],
          source: ragVectorSource,
          contentHash: hashContent(body.payload.text),
          createdAt: now,
          updatedAt: now,
        },
      },
    ]);

    response.status(200).json({ ok: true, id: pointId });
  } catch (error) {
    logger.error("upsertVector failed", error);
    if (isAuthError(error)) {
      response.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized" });
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

    await ensureVectorCollection(body.vector.length);

    const result = await queryDensePoints({
      vector: body.vector,
      userId,
      kinds: body.kinds,
      limit: Math.min(body.limit || 8, 20),
      scoreThreshold: body.scoreThreshold,
    });

    response.status(200).json({
      ok: true,
      matches: result,
    });
  } catch (error) {
    logger.error("queryVectors failed", error);
    if (isAuthError(error)) {
      response.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized" });
      return;
    }
    response.status(500).json({
      error: error instanceof Error ? error.message : "queryVectors failed",
    });
  }
});

export const categorizeTransactions = onRequest({ region: REGION, cors: true }, async (request, response) => {
  try {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const userId = await verifyUserId(request);
    const body = request.body as CategorizeTransactionsBody;
    const transactions = Array.isArray(body?.transactions)
      ? body.transactions.filter((transaction) => transaction?.merchant && typeof transaction.amount === "number")
      : [];

    if (transactions.length === 0) {
      response.status(400).json({ error: "transactions are required" });
      return;
    }

    const results = await categorizeTransactionsInternal({
      userId,
      transactions,
      categories: body.categories,
      ollamaBaseUrl: OLLAMA_BASE_URL,
      chatModel: OLLAMA_CHAT_MODEL,
    });

    response.status(200).json({ ok: true, results });
  } catch (error) {
    logger.error("categorizeTransactions failed", error);
    if (isAuthError(error)) {
      response.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized" });
      return;
    }
    response.status(500).json({
      error: error instanceof Error ? error.message : "categorizeTransactions failed",
    });
  }
});

export const learnMerchantCategory = onRequest({ region: REGION, cors: true }, async (request, response) => {
  try {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const userId = await verifyUserId(request);
    const body = request.body as LearnMerchantCategoryBody;

    if (!body?.merchant?.trim() || !body?.category?.trim()) {
      response.status(400).json({ error: "merchant and category are required" });
      return;
    }

    await learnMerchantCategoryInternal({
      userId,
      merchant: body.merchant,
      category: body.category,
    });

    response.status(200).json({ ok: true });
  } catch (error) {
    logger.error("learnMerchantCategory failed", error);
    if (isAuthError(error)) {
      response.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized" });
      return;
    }
    response.status(500).json({
      error: error instanceof Error ? error.message : "learnMerchantCategory failed",
    });
  }
});

export const ragChat = onRequest({ region: REGION, cors: true, timeoutSeconds: 300 }, async (request, response) => {
  try {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const userId = await verifyUserId(request);
    const body = request.body as RagChatBody;
    const query = body?.query?.trim();

    if (!query) {
      response.status(400).json({ error: "query is required" });
      return;
    }

    const conversationalShortcut = classifyConversationalShortcut(query);
    if (conversationalShortcut) {
      response.status(200).json({
        ok: true,
        answer: conversationalShortcut.answer,
        retrieved: 0,
        model: "conversational-shortcut-v1",
        route: "structured",
        reason: conversationalShortcut.reason,
      });
      return;
    }

    const intent = classifyFinanceIntent(query);
    const shouldLoadTransactions = intent.route === "structured" || needsStructuredTransactions(query);
    const transactions = shouldLoadTransactions ? await loadUserTransactions(userId) : [];
    const transactionConstraints = inferTransactionSearchConstraints(query, transactions);
    const deterministicAnswer = tryDeterministicAnswer(query, transactionConstraints.filteredTransactions);
    if (deterministicAnswer) {
      response.status(200).json({
        ok: true,
        answer: deterministicAnswer,
        retrieved: 0,
        model: "deterministic-rules-v3",
        route: intent.route,
        reason: intent.reason,
      });
      return;
    }

    if (intent.route === "structured") {
      response.status(200).json({
        ok: true,
        answer:
          "I couldn't confidently answer that structured finance question from the exact transaction data I loaded. Try narrowing it with a merchant, category, or date range.",
        retrieved: 0,
        model: "deterministic-rules-v3",
        route: intent.route,
        reason: intent.reason,
      });
      return;
    }

    const queryEmbedding = await embedText(query);
    await ensureVectorCollection(queryEmbedding.length);

    const matches = await searchHybridPoints({
      denseVector: queryEmbedding,
      sparseVector: buildSparseVector(query),
      userId,
      kinds: transactionConstraints.kinds,
      extraMust: transactionConstraints.extraMust,
      limit: Math.min(body.topK || 12, 32),
      preferSparse: hasPrecisionSignals(query),
    });

    const wideTransactionContext =
      transactionConstraints.filteredTransactions.length > 0 && shouldAttachWideTransactionContext(query)
        ? buildHybridTransactionContext(query, transactionConstraints.filteredTransactions)
        : "";

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
      "Hybrid retrieval already blended semantic matches with exact keyword matches.",
      "If the answer cannot be derived from context, clearly say that.",
      "Keep answers concise and practical.",
      "If monthly summary context is available, use it first for month-over-month or total spending questions.",
      "Prefer concrete numbers and a short explanation of the biggest drivers.",
      "",
      "Retrieved Context:",
      contextBlocks || "No indexed context found.",
      ...(wideTransactionContext ? ["", wideTransactionContext] : []),
      "",
      "Recent Conversation:",
      chatHistory || "None",
      "",
      `User Question: ${query}`,
    ].join("\n");

    const answer = await askOllamaChat(prompt);

    response.status(200).json({
      ok: true,
      answer,
      retrieved: matches.length,
      model: OLLAMA_CHAT_MODEL,
      route: intent.route,
      reason: intent.reason,
    });
  } catch (error) {
    logger.error("ragChat failed", error);
    response.status(500).json({
      error: error instanceof Error ? error.message : "RAG chat failed",
    });
  }
});
