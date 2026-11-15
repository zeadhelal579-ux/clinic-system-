// Standard lint rules for the Next.js server and its future pages.
import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...next,
  ...nextTypescript,
  globalIgnores([".next/**", "next-env.d.ts"]),
]);
