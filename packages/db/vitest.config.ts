import { defineConfig } from "vitest/config";

// Integration tests against the Neon `test` branch (D113): migrations run once
// as the owner, then every test connects as the app role, so RLS applies.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/test/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
