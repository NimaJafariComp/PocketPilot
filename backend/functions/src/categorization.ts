import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import type {
  CategorizationRequestItem,
  CategorizationResult,
} from "./types.js";

const DEFAULT_CATEGORIES = [
  "Uncategorized",
  "Groceries",
  "Dining",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
  "Income",
] as const;

const NOISE_TOKENS = new Set([
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
  "store",
  "tap",
  "visa",
  "withdrawal",
]);

type Rule = {
  category: string;
  patterns: RegExp[];
  reason: string;
  minAmount?: number;
  maxAmount?: number;
};

const RULES: Rule[] = [
  {
    category: "Income",
    patterns: [/salary/, /payroll/, /direct deposit/, /freelance/, /paycheck/],
    reason: "Matched income keywords",
  },
  {
    category: "Groceries",
    patterns: [/whole foods/, /trader joe/, /costco/, /safeway/, /kroger/, /aldi/, /grocery/],
    reason: "Matched grocery merchant keywords",
  },
  {
    category: "Dining",
    patterns: [/subway/, /chipotle/, /starbucks/, /panera/, /mcdonald/, /restaurant/, /cafe/, /coffee/, /pizza/, /taco/],
    reason: "Matched dining merchant keywords",
  },
  {
    category: "Transportation",
    patterns: [/shell/, /chevron/, /exxon/, /uber/, /lyft/, /gas/, /fuel/, /parking/, /transit/],
    reason: "Matched transportation merchant keywords",
  },
  {
    category: "Entertainment",
    patterns: [
      /netflix/,
      /spotify/,
      /hulu/,
      /disney/,
      /amc/,
      /steam/,
      /playstation/,
      /xbox/,
      /movie/,
      /theater/,
      /concert/,
      /ticketmaster/,
      /patreon/,
      /audible/,
      /kindle unlimited/,
      /youtube premium/,
    ],
    reason: "Matched entertainment or digital media subscription keywords",
  },
  {
    category: "Shopping",
    patterns: [/amazon/, /target/, /walmart/, /best buy/, /apple store/, /home depot/, /ikea/, /etsy/],
    reason: "Matched retail shopping merchant keywords",
  },
  {
    category: "Bills",
    patterns: [
      /utility/,
      /electric/,
      /water bill/,
      /internet/,
      /phone bill/,
      /insurance/,
      /rent/,
      /mortgage/,
      /membership fee/,
      /annual fee/,
      /monthly fee/,
    ],
    reason: "Matched recurring bill or fee keywords",
  },
  {
    category: "Health",
    patterns: [
      /cvs/,
      /walgreens/,
      /pharmacy/,
      /hospital/,
      /clinic/,
      /dental/,
      /medical/,
      /urgent care/,
      /gym/,
      /fitness/,
      /wellness/,
      /yoga/,
      /pilates/,
      /cycle/,
      /spin/,
      /barre/,
      /crossfit/,
      /therapy/,
      /therapist/,
      /counseling/,
      /massage/,
      /spa/,
      /chiropr/,
      /physical therapy/,
      /med spa/,
      /meditation/,
      /sauna/,
      /membership/,
      /monthly membership/,
      /planet fitness/,
      /equinox/,
      /orange theory/,
      /orangetheory/,
      /soulcycle/,
      /corepower/,
      /24 hour fitness/,
      /la fitness/,
    ],
    reason: "Matched health, wellness, or fitness membership keywords",
  },
];

function uniqueCategories(categories?: string[]): string[] {
  const input = categories && categories.length > 0 ? categories : Array.from(DEFAULT_CATEGORIES);
  return Array.from(new Set(input.filter(Boolean)));
}

export function normalizeMerchant(merchant: string): string {
  const normalized = merchant
    .toLowerCase()
    .replace(/[#*]/g, " ")
    .replace(/\b\d{2,}\b/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !NOISE_TOKENS.has(token) && token.length > 1)
    .slice(0, 5)
    .join(" ")
    .trim();

  return normalized || merchant.trim().toLowerCase();
}

function buildSearchText(input: CategorizationRequestItem, normalizedMerchant: string): string {
  return [normalizedMerchant, input.notes || ""].join(" ").toLowerCase();
}

function isMeaningfulMerchant(normalizedMerchant: string, notes?: string): boolean {
  const compact = normalizedMerchant.replace(/\s+/g, "");
  const hasLetters = /[a-z]{3,}/.test(normalizedMerchant);
  const hasVowels = /[aeiou]/.test(compact);
  const looksLikeCode = /^[a-z0-9]{3,10}$/.test(compact) && !hasVowels;
  const noteHasSignal = !!notes && /[a-z]{4,}/i.test(notes);

  if (compact.length < 4 && !noteHasSignal) {
    return false;
  }

  if (!hasLetters && !noteHasSignal) {
    return false;
  }

  if (looksLikeCode && !noteHasSignal) {
    return false;
  }

  return true;
}

function buildResult(
  normalizedMerchant: string,
  category: string,
  categorySource: CategorizationResult["categorySource"],
  categoryConfidence: number,
  reason: string,
): CategorizationResult {
  return {
    category,
    categorySource,
    categoryConfidence,
    categoryNeedsReview: category === "Uncategorized" || categoryConfidence < 0.75,
    normalizedMerchant,
    reason,
  };
}

function refineAiResult(
  input: CategorizationRequestItem,
  normalizedMerchant: string,
  result: CategorizationResult,
  categories: string[],
): CategorizationResult {
  const searchText = buildSearchText(input, normalizedMerchant);
  const healthSignals = [
    /gym/,
    /fitness/,
    /wellness/,
    /yoga/,
    /pilates/,
    /cycle/,
    /spin/,
    /barre/,
    /crossfit/,
    /therapy/,
    /therapist/,
    /massage/,
    /spa/,
    /chiropr/,
    /physical therapy/,
    /meditation/,
    /workout/,
    /class pass/,
    /classpass/,
    /membership/,
    /soulcycle/,
    /orangetheory/,
    /planet fitness/,
    /equinox/,
  ];
  const entertainmentSignals = [
    /subscription/,
    /streaming/,
    /premium/,
    /music/,
    /video/,
    /podcast/,
    /audible/,
    /patreon/,
    /netflix/,
    /spotify/,
    /hulu/,
    /disney/,
    /youtube premium/,
  ];

  if (
    result.category === "Shopping" &&
    categories.includes("Health") &&
    healthSignals.some((pattern) => pattern.test(searchText))
  ) {
    return buildResult(
      normalizedMerchant,
      "Health",
      "auto-ai",
      Math.max(result.categoryConfidence, 0.84),
      "Adjusted AI result toward Health based on fitness or wellness signals",
    );
  }

  if (
    (result.category === "Shopping" || result.category === "Bills") &&
    categories.includes("Entertainment") &&
    entertainmentSignals.some((pattern) => pattern.test(searchText))
  ) {
    return buildResult(
      normalizedMerchant,
      "Entertainment",
      "auto-ai",
      Math.max(result.categoryConfidence, 0.82),
      "Adjusted AI result toward Entertainment based on subscription or media signals",
    );
  }

  return result;
}

function applyRule(
  input: CategorizationRequestItem,
  normalizedMerchant: string,
  categories: string[],
): CategorizationResult | null {
  const searchText = buildSearchText(input, normalizedMerchant);

  for (const rule of RULES) {
    if (!categories.includes(rule.category)) {
      continue;
    }
    if (typeof rule.minAmount === "number" && Math.abs(input.amount) < rule.minAmount) {
      continue;
    }
    if (typeof rule.maxAmount === "number" && Math.abs(input.amount) > rule.maxAmount) {
      continue;
    }
    if (rule.patterns.some((pattern) => pattern.test(searchText))) {
      return buildResult(normalizedMerchant, rule.category, "auto-rule", 0.9, rule.reason);
    }
  }

  return null;
}

async function loadMerchantMemories(
  userId: string,
  normalizedMerchants: string[],
): Promise<Map<string, { category: string; count: number }>> {
  const merchantMemory = new Map<string, { category: string; count: number }>();
  await Promise.all(
    normalizedMerchants.map(async (normalizedMerchant) => {
      const snapshot = await adminDb
        .collection("users")
        .doc(userId)
        .collection("merchantCategoryMemory")
        .doc(encodeURIComponent(normalizedMerchant))
        .get();

      if (!snapshot.exists) {
        return;
      }

      const data = snapshot.data() as { category?: string; count?: number } | undefined;
      if (!data?.category) {
        return;
      }

      merchantMemory.set(normalizedMerchant, {
        category: data.category,
        count: data.count || 1,
      });
    }),
  );

  return merchantMemory;
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function askAiForCategory(params: {
  ollamaBaseUrl: string;
  chatModel: string;
  input: CategorizationRequestItem;
  normalizedMerchant: string;
  categories: string[];
}): Promise<CategorizationResult | null> {
  const response = await fetch(`${params.ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.chatModel,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You categorize personal finance transactions. Return only JSON with keys category, confidence, reason. Category must be one of the provided categories. Confidence must be between 0 and 1. Prefer Health for gyms, fitness studios, yoga, pilates, therapy, massage, wellness services, pharmacies, clinics, and health memberships. Prefer Entertainment for streaming, digital media, gaming, concerts, movie tickets, creator memberships, and media subscriptions. Prefer Bills for utilities, rent, insurance, phone, internet, and recurring household service fees. Prefer Shopping only for clear retail goods or general merchandise purchases. If uncertain, return Uncategorized with low confidence.",
        },
        {
          role: "user",
          content: JSON.stringify({
            merchant: params.input.merchant,
            normalizedMerchant: params.normalizedMerchant,
            amount: params.input.amount,
            notes: params.input.notes || "",
            availableCategories: params.categories,
          }),
        },
      ],
    }),
  });

  const json = (await response.json()) as { message?: { content?: string }; error?: string };
  if (!response.ok || !json.message?.content) {
    throw new Error(json.error || `Ollama categorization failed with ${response.status}`);
  }

  const parsed = extractJsonObject(json.message.content);
  if (!parsed) {
    return null;
  }

  const category = typeof parsed.category === "string" ? parsed.category.trim() : "";
  const confidenceRaw = typeof parsed.confidence === "number" ? parsed.confidence : Number(parsed.confidence || 0);
  const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "AI categorization";

  if (!params.categories.includes(category)) {
    return null;
  }

  return refineAiResult(
    params.input,
    params.normalizedMerchant,
    buildResult(
      params.normalizedMerchant,
      category,
      "auto-ai",
      clampConfidence(confidenceRaw || 0.65),
      reason,
    ),
    params.categories,
  );
}

export async function categorizeTransactions(params: {
  userId: string;
  transactions: CategorizationRequestItem[];
  categories?: string[];
  ollamaBaseUrl: string;
  chatModel: string;
}): Promise<CategorizationResult[]> {
  const categories = uniqueCategories(params.categories);
  const normalizedMerchants = params.transactions.map((transaction) => normalizeMerchant(transaction.merchant));
  const merchantMemories = await loadMerchantMemories(params.userId, Array.from(new Set(normalizedMerchants)));

  const results: CategorizationResult[] = [];
  for (let index = 0; index < params.transactions.length; index += 1) {
    const transaction = params.transactions[index];
    const normalizedMerchant = normalizedMerchants[index];
    const memory = merchantMemories.get(normalizedMerchant);

    if (memory && categories.includes(memory.category)) {
      results.push(
        buildResult(
          normalizedMerchant,
          memory.category,
          "auto-history",
          clampConfidence(Math.min(0.98, 0.82 + memory.count * 0.03)),
          "Matched prior user categorization history",
        ),
      );
      continue;
    }

    const ruleResult = applyRule(transaction, normalizedMerchant, categories);
    if (ruleResult) {
      results.push(ruleResult);
      continue;
    }

    if (!isMeaningfulMerchant(normalizedMerchant, transaction.notes)) {
      results.push(
        buildResult(
          normalizedMerchant,
          categories.includes("Uncategorized") ? "Uncategorized" : categories[0],
          "auto-ai",
          0.1,
          "Merchant text did not provide enough semantic signal",
        ),
      );
      continue;
    }

    try {
      const aiResult = await askAiForCategory({
        ollamaBaseUrl: params.ollamaBaseUrl,
        chatModel: params.chatModel,
        input: transaction,
        normalizedMerchant,
        categories,
      });
      if (aiResult && aiResult.category !== "Uncategorized" && aiResult.categoryConfidence >= 0.78) {
        results.push(aiResult);
        continue;
      }
    } catch {
      // Fall through to Uncategorized when AI is unavailable.
    }

    results.push(
      buildResult(
        normalizedMerchant,
        categories.includes("Uncategorized") ? "Uncategorized" : categories[0],
        "auto-ai",
        0.2,
        "No confident rule, history, or AI match",
      ),
    );
  }

  return results;
}

export async function learnMerchantCategory(params: {
  userId: string;
  merchant: string;
  category: string;
}): Promise<void> {
  const normalizedMerchant = normalizeMerchant(params.merchant);
  if (!normalizedMerchant) {
    return;
  }

  const ref = adminDb
    .collection("users")
    .doc(params.userId)
    .collection("merchantCategoryMemory")
    .doc(encodeURIComponent(normalizedMerchant));

  await ref.set(
    {
      normalizedMerchant,
      category: params.category,
      count: FieldValue.increment(1),
      lastConfirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
