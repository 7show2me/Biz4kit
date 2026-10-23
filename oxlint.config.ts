import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";

export default defineConfig({
  extends: [core, react, tanstack],
  // design/ holds local HTML prototypes (D19), not product code.
  ignorePatterns: [...core.ignorePatterns, "design/**"],
});
