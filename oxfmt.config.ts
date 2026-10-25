import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  // Docs, prototypes, brand files and reports are hand-written and some are
  // locked (D94); only code is formatted.
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    ".claude/**",
    "brand/**",
    "design/**",
    "docs/**",
    "prep/**",
    "reports/**",
    "**/*.md",
    "**/*.mdx",
    "**/*.html",
  ],
});
