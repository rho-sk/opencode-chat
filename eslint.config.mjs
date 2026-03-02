// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import globals from "globals";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    files: ["**/*.ts"],
    plugins: { obsidianmd },
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
