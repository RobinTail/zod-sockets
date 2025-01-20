import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      FORCE_COLOR: "1",
    },
    pool: "threads",
    testTimeout: 10000,
    coverage: {
      provider: "istanbul",
      reporter: [["text", { maxCols: 120 }], "json-summary", "html", "lcov"],
      include: ["src/**"],
    },
  },
});
