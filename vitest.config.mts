import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "scripts/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      include: [
        "packages/services/src/mobile/export.mobile.ts",
        "packages/services/src/mobile/file-import.mobile.ts",
      ],
      reportsDirectory: "work/baseline/coverage-mobile-adapters",
      reporter: ["text", "json-summary"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
