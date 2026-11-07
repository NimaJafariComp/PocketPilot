import type { CategorizationAdapter, CategorizationResult } from "./interfaces/categorization";
import type { RagAdapter } from "./interfaces/rag";
import { categorizeLocally, normalizeMerchant } from "./local-categorization";

export type ReleaseProfile = "beta" | "development" | "future";

export interface FeatureCapabilities {
  aiAssistant: boolean;
  ragSync: boolean;
  remoteCategorization: boolean;
  merchantLearning: boolean;
  demoDataTools: boolean;
  useEmulators: boolean;
}

export type CapabilityFlags = Partial<Record<keyof FeatureCapabilities, string | undefined>>;

export interface CapabilityConfig {
  profile?: string | undefined;
  flags?: CapabilityFlags | undefined;
}

const disabledCapabilities: FeatureCapabilities = {
  aiAssistant: false,
  ragSync: false,
  remoteCategorization: false,
  merchantLearning: false,
  demoDataTools: false,
  useEmulators: false,
};

function isReleaseProfile(value: string | undefined): value is ReleaseProfile {
  return value === "beta" || value === "development" || value === "future";
}

function enabled(value: string | undefined) {
  return value === "true";
}

/** Client flags select behavior only; servers must enforce authorization independently. */
export function resolveCapabilities(config: CapabilityConfig = {}): FeatureCapabilities {
  const profile = isReleaseProfile(config.profile) ? config.profile : "beta";
  if (profile === "beta") {
    return { ...disabledCapabilities };
  }

  const flags = config.flags ?? {};
  if (profile === "development") {
    return {
      ...disabledCapabilities,
      demoDataTools: enabled(flags.demoDataTools),
      useEmulators: enabled(flags.useEmulators),
    };
  }

  return {
    aiAssistant: enabled(flags.aiAssistant),
    ragSync: enabled(flags.ragSync),
    remoteCategorization: enabled(flags.remoteCategorization),
    merchantLearning: enabled(flags.merchantLearning),
    demoDataTools: enabled(flags.demoDataTools),
    useEmulators: enabled(flags.useEmulators),
  };
}

export function canRunBackgroundCategorization(capabilities: FeatureCapabilities) {
  return capabilities.remoteCategorization;
}

export function canRunMerchantLearning(capabilities: FeatureCapabilities) {
  return capabilities.merchantLearning;
}

export function canRunRagSync(capabilities: FeatureCapabilities) {
  return capabilities.ragSync;
}

function unavailable(feature: string): never {
  throw new Error(`${feature} is unavailable in this release profile`);
}

export function createLocalCategorizationAdapter(): CategorizationAdapter {
  const learnedCategories = new Map<string, string>();

  return {
    async categorizeTransactions({ transactions, categories }) {
      return transactions.map((transaction): CategorizationResult => {
        const normalizedMerchant = normalizeMerchant(transaction.merchant);
        const learnedCategory = learnedCategories.get(normalizedMerchant);
        if (learnedCategory && categories.includes(learnedCategory)) {
          return {
            category: learnedCategory,
            categorySource: "auto-history",
            categoryConfidence: 1,
            categoryNeedsReview: false,
            normalizedMerchant,
            reason: "Matched an on-device merchant preference.",
          };
        }

        return categorizeLocally(transaction, categories);
      });
    },
    async learnMerchantCategory({ merchant, category }) {
      const normalizedMerchant = normalizeMerchant(merchant);
      if (normalizedMerchant && category.trim()) {
        learnedCategories.set(normalizedMerchant, category.trim());
      }
    },
  };
}

export function selectCategorizationAdapter(
  capabilities: FeatureCapabilities,
  remoteAdapter: CategorizationAdapter
): CategorizationAdapter {
  if (!capabilities.remoteCategorization) {
    return createLocalCategorizationAdapter();
  }
  if (capabilities.merchantLearning) {
    return remoteAdapter;
  }
  return {
    categorizeTransactions: remoteAdapter.categorizeTransactions,
    learnMerchantCategory: async () => unavailable("Merchant learning"),
  };
}

export function createUnavailableRagAdapter(): RagAdapter {
  return {
    syncIndex: async () => unavailable("RAG sync"),
    ask: async () => unavailable("AI assistant"),
  };
}

export function selectRagAdapter(
  capabilities: FeatureCapabilities,
  remoteAdapter: RagAdapter
): RagAdapter {
  if (!capabilities.ragSync && !capabilities.aiAssistant) {
    return createUnavailableRagAdapter();
  }
  return {
    syncIndex: capabilities.ragSync ? remoteAdapter.syncIndex : async () => unavailable("RAG sync"),
    ask: capabilities.aiAssistant ? remoteAdapter.ask : async () => unavailable("AI assistant"),
  };
}
