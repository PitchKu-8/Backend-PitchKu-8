const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const importPlugin = require("eslint-plugin-import");
const unusedImports = require("eslint-plugin-unused-imports");
const boundaries = require("eslint-plugin-boundaries");
const prettierConfig = require("eslint-config-prettier");
const globals = require("globals");

module.exports = tseslint.config(
  {
    ignores: ["node_modules/", "dist/", "coverage/", "supabase/.temp/"],
  },

  js.configs.recommended,

  {
    files: ["src/**/*.ts"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      import: importPlugin,
      "unused-imports": unusedImports,
      boundaries: boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "modules", pattern: "src/modules/*" },
        { type: "shared", pattern: "src/shared/*" },
        { type: "config", pattern: "src/config/*" },
      ],
    },
    rules: {
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "modules" } },
              allow: [
                { to: { element: { type: "shared" } } },
                { to: { element: { type: "config" } } },
              ],
            },
            {
              from: { element: { type: "shared" } },
              allow: [
                { to: { element: { type: "shared" } } },
                { to: { element: { type: "config" } } },
              ],
            },
            {
              from: { element: { type: "config" } },
              allow: [{ to: { element: { type: "config" } } }],
            },
          ],
        },
      ],
    },
  },

  {
    files: ["*.config.js", "plopfile.js", "scripts/**/*.ts"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  prettierConfig,
);