import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "expo/**",
    // The V2 UI restore point. tsconfig.json already excludes it; linting a frozen
    // snapshot of the old Expo app was never the intent and its 15 errors have
    // failed the gate on every push since this config was introduced. The
    // directory itself is untouched -- this only stops ESLint reading it.
    "V2_UI_Backup/**",
    "public/**",
    ".data/**",
    "android/**",
  ]),
]);
