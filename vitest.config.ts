import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      FORCE_COLOR: "1",
    },
    pool: "threads",
    testTimeout: 10000,
    setupFiles: join(
      dirname(fileURLToPath(import.meta.url)),
      "vitest.setup.ts",
    ),
    coverage: {
      provider: "istanbul",
      reporter: [["text", { maxCols: 120 }], "json-summary", "html", "lcov"],
      include: ["src/**"],
    },
  },
});
