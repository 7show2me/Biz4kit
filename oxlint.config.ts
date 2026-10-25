import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";

export default defineConfig({
  extends: [core, react, tanstack],
  // Design-system lint (D107): enforces D52, no raw colours, arbitrary values or
  // inline styles; tokens come from brand/ through @Biz4kit/ui/globals.css.
  jsPlugins: ["@shadcn/lint"],
  settings: {
    shadcn: {
      ui: "@Biz4kit/ui/components",
      componentImports: ["^@Biz4kit/ui/components(/|$)"],
      // shadcn/tailwind.css defines the cn-* helper classes the components use.
      themeImports: ["^@Biz4kit/ui/", "^shadcn/"],
    },
  },
  // design/ holds local HTML prototypes (D19), not product code.
  ignorePatterns: [...core.ignorePatterns, "design/**"],
  rules: {
    // shadcn components and the generated scaffold use function declarations.
    "func-style": "off",
    "react/function-component-definition": "off",
    "shadcn/no-arbitrary-values": "error",
    "shadcn/no-inline-styles": "error",
    "shadcn/no-raw-colors": "error",
    "shadcn/no-restyle": ["error", { allow: ["layout"] }],
    "shadcn/no-unknown-classes": "error",
    "shadcn/require-static-classes": "error",
  },
  overrides: [
    {
      // The shared components are where the design system is written: they own
      // the styles apps may not restyle, and keep shadcn's internal values.
      files: ["packages/ui/src/components/**"],
      rules: {
        "shadcn/no-arbitrary-values": "off",
        "shadcn/no-restyle": "off",
        // cn-* are shadcn style hooks and "toaster" is sonner's: markers, no CSS.
        "shadcn/no-unknown-classes": "off",
        "shadcn/require-static-classes": "off",
      },
    },
    {
      // React Native styles icons and navigators through style props.
      files: ["apps/native/**"],
      rules: { "shadcn/no-inline-styles": "off" },
    },
  ],
});
