// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import globals from "globals";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    files: ["**/*.ts"],
    plugins: { obsidianmd, "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...obsidianmd.configs.recommended,
      // TypeScript rules matching ObsidianReviewBot's scanner
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/require-await": "error",
      // OpenCode brand name — allow capital O and C
      "obsidianmd/ui/sentence-case": [
        "error",
        {
          brands: ["OpenCode"],
          acronyms: ["URL", "MCP", "AWS", "SSE", "CORS", "API", "JSON", "ID"],
          ignoreRegex: [
            "^https?://",                          // URL placeholders
            "^[a-z0-9-]+/[a-z0-9._:@/-]+$",       // provider/model-id strings
          ],
        },
      ],
    },
  },
]);
