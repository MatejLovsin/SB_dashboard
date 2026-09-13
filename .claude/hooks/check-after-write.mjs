#!/usr/bin/env node
// PostToolUse hook (Write | Edit). Two jobs:
//   1. Measure the file that actually landed, in case the PreToolUse projection
//      missed something (a tool that rewrites content, a concurrent edit).
//   2. Record which source files this session touched, so the Stop hook knows
//      whether a type-check is warranted.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, toRepoPath, isChecked, limitFor, countFileLines } from "./lib/limits.mjs";

const STATE_DIR = path.join(REPO_ROOT, ".claude", ".state");

function recordTouched(sessionId, repoPath) {
  if (!sessionId || !/\.(ts|tsx)$/.test(repoPath)) return;
  const file = path.join(STATE_DIR, `${sessionId.replace(/[^\w-]/g, "")}.json`);
  let touched = [];
  try {
    if (existsSync(file)) touched = JSON.parse(readFileSync(file, "utf8")).touched ?? [];
  } catch { /* a corrupt state file just means a fresh list */ }
  if (!touched.includes(repoPath)) touched.push(repoPath);
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify({ touched }));
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const input = payload?.tool_input ?? {};
if (!["Write", "Edit", "MultiEdit"].includes(payload?.tool_name ?? "") || !input.file_path) {
  process.exit(0);
}

const absPath = path.resolve(REPO_ROOT, input.file_path);
const repoPath = toRepoPath(absPath);
if (!repoPath || !existsSync(absPath)) process.exit(0);

recordTouched(payload.session_id, repoPath);

if (isChecked(repoPath)) {
  const lines = countFileLines(absPath);
  const { limit } = limitFor(repoPath);
  if (lines > limit) {
    process.stderr.write(
      `${repoPath} is now ${lines} lines, over its cap of ${limit}. This write got past the pre-write check — split the file now, before doing anything else.\n`,
    );
    process.exit(2);
  }
}
process.exit(0);
