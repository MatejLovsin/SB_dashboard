#!/usr/bin/env node
// Stop hook. If this turn touched TypeScript, the turn does not end until
// `tsc --noEmit` is clean. Exit 2 hands the errors back to Claude to fix.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./lib/limits.mjs";

const TSC = path.join(REPO_ROOT, "node_modules", "typescript", "bin", "tsc");

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

// Already blocked once this turn: let it end rather than loop.
if (payload?.stop_hook_active) process.exit(0);

const sessionId = (payload?.session_id ?? "").replace(/[^\w-]/g, "");
const statePath = path.join(REPO_ROOT, ".claude", ".state", `${sessionId}.json`);
if (!sessionId || !existsSync(statePath) || !existsSync(TSC)) process.exit(0);

let touched = [];
try {
  touched = JSON.parse(readFileSync(statePath, "utf8")).touched ?? [];
} catch { /* fall through: nothing to check */ }
if (touched.length === 0) process.exit(0);

try {
  execFileSync(process.execPath, [TSC, "--noEmit"], {
    cwd: REPO_ROOT, encoding: "utf8", stdio: "pipe", timeout: 180_000,
  });
} catch (error) {
  const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
  const lines = output.split("\n");
  const shown = lines.slice(0, 40).join("\n");
  process.stderr.write(
    `tsc --noEmit failed after this turn changed ${touched.length} TypeScript file(s). Fix these before finishing:\n\n${shown}` +
    `${lines.length > 40 ? `\n... and ${lines.length - 40} more lines (run: npx tsc --noEmit)` : ""}\n`,
  );
  process.exit(2);
}

rmSync(statePath, { force: true });
process.exit(0);
