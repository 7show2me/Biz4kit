import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/worker.ts"],
  format: "esm",
  outDir: "./dist",
  clean: true,
  // Readable stack traces in Sentry: node runs with --enable-source-maps.
  sourcemap: true,
  deps: {
    alwaysBundle: [/@Biz4kit\/.*/u],
  },
});
