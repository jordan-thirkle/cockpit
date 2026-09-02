import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "src/hermes/vendor/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Known debt, triaged: the fetch-on-mount effects reset state
      // synchronously (classic pre-React-19 pattern), Page.tsx uses the
      // documented "latest ref" pattern, and Sidebar mutates a render-local
      // grouping variable. Rewriting these is its own PR; keep them visible
      // as warnings without failing CI.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      // The transport intentionally types loose backend payloads as unknown/any
      // at the seam; stricter rules live in the first-party typed layer.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
