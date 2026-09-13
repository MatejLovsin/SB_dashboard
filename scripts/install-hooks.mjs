#!/usr/bin/env node
// Installs .git/hooks/pre-commit. .git/hooks is not versioned, so this script is
// the versioned source of truth; `npm install` runs it via the prepare script.

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../.claude/hooks/lib/limits.mjs";

const HOOK = `#!/bin/sh
# Managed by scripts/install-hooks.mjs — edit that file, then run: npm run hooks:install
set -e
node scripts/check-staged.mjs
node scripts/check-lines.mjs --staged
node scripts/check-lint.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
`;

const hooksDir = path.join(REPO_ROOT, ".git", "hooks");
if (!existsSync(path.join(REPO_ROOT, ".git"))) {
  console.log("install-hooks: no .git directory, nothing to install");
  process.exit(0);
}

mkdirSync(hooksDir, { recursive: true });
const target = path.join(hooksDir, "pre-commit");

if (existsSync(target) && !readFileSync(target, "utf8").includes("scripts/install-hooks.mjs")) {
  console.error(`install-hooks: ${target} exists and was not written by this script — leaving it alone.`);
  process.exit(1);
}

writeFileSync(target, HOOK);
try {
  chmodSync(target, 0o755);
} catch { /* Windows filesystems without exec bits: git runs it via sh anyway */ }
console.log("install-hooks: .git/hooks/pre-commit installed");
