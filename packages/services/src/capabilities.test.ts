import { describe, expect, it } from "vitest";
import {
  createLocalCategorizationAdapter,
  createUnavailableRagAdapter,
  canRunBackgroundCategorization,
  canRunMerchantLearning,
  canRunRagSync,
  resolveCapabilities,
  selectCategorizationAdapter,
  selectRagAdapter,
} from "./capabilities";

describe("release capabilities", () => {
  it("defaults every beta capability to disabled", () => {
    expect(resolveCapabilities()).toEqual({
      aiAssistant: false,
      ragSync: false,
      remoteCategorization: false,
      merchantLearning: false,
      demoDataTools: false,
      useEmulators: false,
    });
  });

  it("treats an unknown profile as beta", () => {
    expect(resolveCapabilities({ profile: "preview", flags: { aiAssistant: "true" } })).toMatchObject({
      aiAssistant: false,
      useEmulators: false,
    });
  });

  it("does not enable beta capabilities from flags", () => {
    expect(
      resolveCapabilities({
        profile: "beta",
        flags: {
          aiAssistant: "true",
          ragSync: "true",
          remoteCategorization: "true",
          merchantLearning: "true",
          demoDataTools: "true",
          useEmulators: "true",
        },
      })
    ).toEqual({
      aiAssistant: false,
      ragSync: false,
      remoteCategorization: false,
      merchantLearning: false,
      demoDataTools: false,
      useEmulators: false,
    });
  });

  it("requires the future profile and exact true flags to enable a capability", () => {
    const capabilities = resolveCapabilities({
      profile: "future",
      flags: {
        aiAssistant: "true",
        ragSync: "TRUE",
        remoteCategorization: "true",
        merchantLearning: "true",
        demoDataTools: "true",
        useEmulators: "true",
      },
    });

    expect(capabilities).toEqual({
      aiAssistant: true,
      ragSync: false,
      remoteCategorization: true,
      merchantLearning: true,
      demoDataTools: true,
      useEmulators: true,
    });
  });

  it("allows development-only emulator and demo controls without enabling remote features", () => {
    expect(
      resolveCapabilities({
        profile: "development",
        flags: { useEmulators: "true", demoDataTools: "true", aiAssistant: "true" },
      })
    ).toEqual({
      aiAssistant: false,
      ragSync: false,
      remoteCategorization: false,
      merchantLearning: false,
      demoDataTools: true,
      useEmulators: true,
    });
  });
});

describe("beta feature adapters", () => {
  it("blocks background remote work in beta", () => {
    const beta = resolveCapabilities();

    expect(canRunBackgroundCategorization(beta)).toBe(false);
    expect(canRunMerchantLearning(beta)).toBe(false);
    expect(canRunRagSync(beta)).toBe(false);
  });

  it("does not invoke a supplied remote adapter in beta", async () => {
    const remoteCategorization = {
      categorizeTransactions: async () => {
        throw new Error("remote categorization should not run");
      },
      learnMerchantCategory: async () => {
        throw new Error("remote learning should not run");
      },
    };
    const remoteRag = {
      syncIndex: async () => {
        throw new Error("remote indexing should not run");
      },
      ask: async () => {
        throw new Error("remote chat should not run");
      },
    };
    const beta = resolveCapabilities();

    await expect(
      selectCategorizationAdapter(beta, remoteCategorization).categorizeTransactions({
        transactions: [{ merchant: "Store", amount: -1 }],
        categories: ["Uncategorized"],
      })
    ).resolves.toMatchObject([{ category: "Uncategorized" }]);
    await expect(selectRagAdapter(beta, remoteRag).syncIndex({ documents: [] })).rejects.toThrow(
      "RAG sync is unavailable"
    );
  });

  it("keeps categorization on-device and learns only in its local adapter", async () => {
    const adapter = createLocalCategorizationAdapter();

    await adapter.learnMerchantCategory({ merchant: "Corner Market", category: "Groceries" });

    await expect(
      adapter.categorizeTransactions({
        transactions: [
          { merchant: "corner market", amount: -12 },
          { merchant: "Unknown", amount: -5 },
        ],
        categories: ["Groceries", "Uncategorized"],
      })
    ).resolves.toEqual([
      expect.objectContaining({ category: "Groceries", categorySource: "auto-history" }),
      expect.objectContaining({ category: "Uncategorized", categorySource: "auto-rule" }),
    ]);
  });

  it("rejects unavailable RAG work instead of simulating a successful result", async () => {
    const adapter = createUnavailableRagAdapter();

    await expect(adapter.syncIndex({ documents: [] })).rejects.toThrow("RAG sync is unavailable");
    await expect(adapter.ask({ query: "hello", messages: [] })).rejects.toThrow(
      "AI assistant is unavailable"
    );
  });

  it("selects remote behavior only for explicitly enabled future capabilities", async () => {
    const remoteCategorization = {
      categorizeTransactions: async () => [
        {
          category: "Remote",
          categorySource: "auto-rule" as const,
          categoryConfidence: 1,
          categoryNeedsReview: false,
          normalizedMerchant: "remote",
        },
      ],
      learnMerchantCategory: async () => undefined,
    };
    const remoteRag = {
      syncIndex: async () => ({
        indexed: 0,
        skipped: 0,
        removed: 0,
        model: "remote",
        processed: 0,
        total: 0,
        batchIndex: 0,
        batchCount: 0,
        done: true,
      }),
      ask: async () => ({ answer: "remote", retrieved: 0, model: "remote" }),
    };
    const capabilities = resolveCapabilities({
      profile: "future",
      flags: {
        remoteCategorization: "true",
        merchantLearning: "true",
        ragSync: "true",
        aiAssistant: "true",
      },
    });

    await expect(
      selectCategorizationAdapter(capabilities, remoteCategorization).categorizeTransactions({
        transactions: [],
        categories: [],
      })
    ).resolves.toMatchObject([{ category: "Remote" }]);
    await expect(selectRagAdapter(capabilities, remoteRag).ask({ query: "q", messages: [] })).resolves.toMatchObject({
      answer: "remote",
    });
  });

  it("rejects each independently disabled remote operation", async () => {
    const remoteCategorization = {
      categorizeTransactions: async () => [],
      learnMerchantCategory: async () => undefined,
    };
    const remoteRag = {
      syncIndex: async () => ({
        indexed: 0,
        skipped: 0,
        removed: 0,
        model: "remote",
        processed: 0,
        total: 0,
        batchIndex: 0,
        batchCount: 0,
        done: true,
      }),
      ask: async () => ({ answer: "remote", retrieved: 0, model: "remote" }),
    };
    const capabilities = resolveCapabilities({
      profile: "future",
      flags: { remoteCategorization: "true", ragSync: "true" },
    });

    await expect(
      selectCategorizationAdapter(capabilities, remoteCategorization).learnMerchantCategory({
        merchant: "Store",
        category: "Groceries",
      })
    ).rejects.toThrow("Merchant learning is unavailable");
    await expect(selectRagAdapter(capabilities, remoteRag).syncIndex({ documents: [] })).resolves.toMatchObject({
      model: "remote",
    });
    await expect(selectRagAdapter(capabilities, remoteRag).ask({ query: "q", messages: [] })).rejects.toThrow(
      "AI assistant is unavailable"
    );
  });
});
