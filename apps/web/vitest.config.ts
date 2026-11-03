import { defineConfig } from "vitest/config";

// Unit tests only: no TanStack Start, Nitro or Sentry plugins.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
