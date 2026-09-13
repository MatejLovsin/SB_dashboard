import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The 300-line file cap is NOT expressed here: .claude/hooks/lib/limits.mjs owns it,
// enforced by the write hooks and `npm run lines`. One source of truth, one baseline.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    "scripts/**",
  ]),
  {
    name: "sb-dashboard/rules",
    files: ["**/*.{ts,tsx}"],
    rules: {
      // A function long enough to need scrolling is a file that wants splitting.
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
      // DB types in lib/db/types.ts are hand-maintained: `any` is how they silently drift.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Leave the console clean; errors are worth keeping.
      "no-console": ["error", { allow: ["error", "warn"] }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
    },
  },
  {
    // The design language lives in CSS variables (app/globals.css) and, for charts,
    // lib/utils/chartTheme.ts. A hex literal in a component is the system eroding.
    name: "sb-dashboard/no-hardcoded-colors",
    files: ["components/**/*.{ts,tsx}", "features/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: String.raw`Literal[value=/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/]`,
          message:
            "No hex colors in components. Use a CSS variable from app/globals.css (see DESIGN_GUIDE.md); chart colors belong in lib/utils/chartTheme.ts.",
        },
        {
          selector: String.raw`TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/]`,
          message:
            "No hex colors in components. Use a CSS variable from app/globals.css (see DESIGN_GUIDE.md); chart colors belong in lib/utils/chartTheme.ts.",
        },
      ],
    },
  },
  {
    // Platform metadata must emit literal colors: the PWA manifest, the viewport
    // theme color and the generated icons are consumed by the OS, not the browser,
    // so a CSS variable would never be resolved.
    name: "sb-dashboard/platform-metadata-colors",
    files: ["app/manifest.ts", "app/layout.tsx", "app/icon.tsx", "app/apple-icon.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // Test files: a describe block is one long function by construction.
    name: "sb-dashboard/tests",
    files: ["**/*.test.{ts,tsx}"],
    rules: { "max-lines-per-function": "off" },
  },
]);

export default eslintConfig;
