import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { defineConfig } from "vitest/config";

// Tests use .env.test only; dotenv never overrides vars that are already set,
// so these win over the dev .env that src/config/env.ts loads.
export default defineConfig({
  test: {
    env: parse(readFileSync(".env.test")),
    setupFiles: ["src/tests/setup.ts"],
    // All files share one database and truncate it, so they can't run in parallel
    fileParallelism: false,
  },
});
