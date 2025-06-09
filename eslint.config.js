import globals from "globals";
import jsPlugin from "@eslint/js";
import tsPlugin from "typescript-eslint";
import prettierOverrides from "eslint-config-prettier/flat";
import prettierRules from "eslint-plugin-prettier/recommended";
import allowedDepsPlugin from "eslint-plugin-allowed-dependencies";
import { builtinModules } from "node:module";

const importConcerns = [
  {
    selector:
      "ImportDeclaration[source.value='ramda'] > ImportSpecifier, " +
      "ImportDeclaration[source.value='ramda'] > ImportDefaultSpecifier",
    message: "use import * as R from 'ramda'",
  },
  {
    selector: "ImportDeclaration[source.value=/^zod/] > ImportDefaultSpecifier",
    message: "do import { z } instead",
  },
  {
    selector: "ImportDeclaration[source.value='zod'] > ImportSpecifier",
    message: "should import from zod/v4", // @todo remove when zod version changed to 4.0.0
  },
  ...builtinModules.map((mod) => ({
    selector: `ImportDeclaration[source.value='${mod}']`,
    message: `use node:${mod} for the built-in module`,
  })),
];

export default tsPlugin.config(
  {
    languageOptions: { globals: globals.node },
    plugins: {
      allowed: allowedDepsPlugin,
    },
  },
  jsPlugin.configs.recommended,
  tsPlugin.configs.recommended,
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
      "no-restricted-syntax": ["warn", ...importConcerns],
    },
  },
  // For the sources
  {
    files: ["src/*.ts"],
    rules: {
      "allowed/dependencies": "error",
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
      "allowed/dependencies": "off",
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
      "prettier/prettier": "off",
    },
  },
);
