import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 ships flat config arrays directly, so there is no
 * FlatCompat layer here. Spread them and add the project's own rules.
 */
const config = [
  { ignores: ["node_modules/**", ".next/**", "out/**", "playwright-report/**", "test-results/**"] },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    rules: {
      // Accessibility rules are errors, not warnings. The point of a build gate
      // is that an inaccessible change cannot merge.
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-redundant-roles": "error",
      "jsx-a11y/role-has-required-aria-props": "error",

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  {
    // Node scripts are not part of the app bundle.
    files: ["scripts/**/*.mjs", "*.config.mjs", "*.config.ts"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];

export default config;
