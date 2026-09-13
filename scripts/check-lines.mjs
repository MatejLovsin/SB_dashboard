#!/usr/bin/env node
// The file-size cap as a CLI: used by `npm run check`, by the pre-commit hook
// (--staged), and to lower the grandfathered baseline (--ratchet).
//
//   node scripts/check-lines.mjs             # every file in the repo
//   node scripts/check-lines.mjs --staged    # only files staged for commit
//   node scripts/check-lines.mjs --ratchet   # lower baseline entries to actual size
//   node scripts/check-lines.mjs --ratchet --init   # seed the baseline (once)

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  REPO_ROOT, DEFAULT_LIMIT, LIMIT_OVERRIDES, toRepoPath, isChecked, isCheckedDir,
  limitFor, countFileLines, loadBaseline,
} from "../.claude/hooks/lib/limits.mjs";

const BASELINE_PATH = path.join(REPO_ROOT, ".claude", "line-baseline.json");
const args = new Set(process.argv.slice(2));

function walk(dir = REPO_ROOT, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = toRepoPath(abs);
    if (!rel) continue;
    if (entry.isDirectory()) {
      if (isCheckedDir(rel)) walk(abs, out);
    } else if (isChecked(rel)) {
      out.push(rel);
    }
  }
  return out;
}

function stagedFiles() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"], {
    cwd: REPO_ROOT, encoding: "utf8",
  });
  return out.split("\n").map((s) => s.trim()).filter(Boolean).filter(isChecked);
}

const files = (args.has("--staged") ? stagedFiles() : walk())
  .filter((rel) => existsSync(path.join(REPO_ROOT, rel)));

const measured = files
  .map((rel) => ({ rel, lines: countFileLines(path.join(REPO_ROOT, rel)) }))
  .sort((a, b) => b.lines - a.lines);

if (args.has("--ratchet")) {
  const previous = args.has("--init") ? {} : loadBaseline();
  const next = {};
  for (const { rel, lines } of measured) {
    const recorded = previous[rel];
    if (args.has("--init")) {
      // A file with a deliberate cap is never grandfathered above it.
      if (lines > DEFAULT_LIMIT && !(rel in LIMIT_OVERRIDES)) next[rel] = lines;
    } else if (typeof recorded === "number") {
      const lowered = Math.min(recorded, lines);
      if (lowered > DEFAULT_LIMIT) next[rel] = lowered;
      else console.log(`graduated to the ${DEFAULT_LIMIT}-line cap: ${rel} (${lines})`);
    }
  }
  // Entries for files not measured this run (e.g. --staged) must survive.
  for (const [rel, lines] of Object.entries(previous)) {
    if (!(rel in next) && !measured.some((m) => m.rel === rel) && existsSync(path.join(REPO_ROOT, rel))) {
      next[rel] = lines;
    }
  }
  const ordered = Object.fromEntries(Object.entries(next).sort((a, b) => b[1] - a[1]));
  writeFileSync(BASELINE_PATH, `${JSON.stringify({
    comment: `Files grandfathered above the ${DEFAULT_LIMIT}-line cap. Each may shrink, never grow. Lower with: npm run lines:ratchet`,
    files: ordered,
  }, null, 2)}\n`);
  console.log(`baseline: ${Object.keys(ordered).length} files over ${DEFAULT_LIMIT} lines -> .claude/line-baseline.json`);
  process.exit(0);
}

const violations = measured
  .map(({ rel, lines }) => ({ rel, lines, ...limitFor(rel) }))
  .filter(({ lines, limit }) => lines > limit);

if (violations.length === 0) {
  console.log(`check-lines: ${measured.length} files, all within cap`);
  process.exit(0);
}

for (const { rel, lines, limit, kind } of violations) {
  const why = kind === "baseline" ? "grandfathered size — may shrink, never grow"
    : kind === "override" ? "deliberate cap for this file"
    : `repo-wide cap`;
  console.error(`  ${rel}: ${lines} lines > ${limit} (${why})`);
}
console.error(`\ncheck-lines: ${violations.length} file(s) over cap. Split them — see AGENTS.md.`);
process.exit(1);
