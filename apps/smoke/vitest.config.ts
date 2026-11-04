import { defineConfig } from "vitest/config";

// Live checks against the deployed dev stack. Run with `pnpm smoke`; CI's
// `pnpm test` never reaches them.
export default defineConfig({
  test: {
    include: ["src/**/*.smoke.test.ts"],
    // The queue check waits up to 30 s; Sentry takes up to 2 minutes to index.
    testTimeout: 180_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
