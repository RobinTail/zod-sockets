import globals from "globals";
import jsPlugin from "@eslint/js";
import tsPlugin from "typescript-eslint";
import prettierOverrides from "eslint-config-prettier";
import prettierRules from "eslint-plugin-prettier/recommended";
import unicornPlugin from "eslint-plugin-unicorn";
import importPlugin from "eslint-plugin-import-x";

export default [
  {
    languageOptions: { globals: globals.node },
    plugins: {
      unicorn: unicornPlugin,
      "import-x": importPlugin,
    },
  },
  jsPlugin.configs.recommended,
  ...tsPlugin.configs.recommended,
  prettierOverrides,
  prettierRules,
  // Things to turn off globally
  { ignores: ["dist/", "coverage/"] },
  {
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
    },
  },
  // Things to turn on globally
  {
    rules: {
      "unicorn/prefer-node-protocol": "error",
      "import-x/named": "error",
      "import-x/export": "error",
      "import-x/no-duplicates": "warn",
    },
  },
  // For the sources
  {
    files: ["src/*.ts"],
    rules: {
      "import-x/no-extraneous-dependencies": "error",
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowWithName: "LoggerOverrides" },
      ],
    },
  },
  // For tests
  {
    files: ["tests/**/*.ts", "src/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "warn",
      "import-x/no-extraneous-dependencies": "off",
    },
  },
  // For Async API
  {
    files: ["src/async-api/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  // For generated code
  {
    files: ["example/example-client.ts", "tests/**/quick-start.ts"],
    rules: {
      "@typescript-eslint/no-namespace": "off",
      "import-x/no-duplicates": "off",
      "prettier/prettier": "off",
    },
  },
];