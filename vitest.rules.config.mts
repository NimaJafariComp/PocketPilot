import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["backend/firebase/**/*.test.ts"],
  },
});
