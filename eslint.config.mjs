import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // French content uses many apostrophes in JSX text. Escaping all of them
      // hurts source readability without adding any security value (React
      // already escapes text content at render time).
      "react/no-unescaped-entities": "off",
      // Downgrade `any` to a warning rather than an error so it doesn't block
      // builds in CI; we still want the signal in the editor.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
