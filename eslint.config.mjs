// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import globals from "globals";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // OpenCode brand name — allow capital O and C
      "obsidianmd/ui/sentence-case": [
        "warn",
        {
          brands: ["OpenCode"],
          acronyms: ["URL", "MCP", "AWS", "SSE", "CORS", "API", "JSON", "ID"],
        },
      ],
    },
  },
]);
