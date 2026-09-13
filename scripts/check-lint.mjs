#!/usr/bin/env node
// ESLint with a ratchet. The repo carries pre-existing violations that are real
// but out of scope to fix in one go, so the gate is "no NEW violations" rather
// than "no violations": each file's per-rule count may fall, never rise.
//
//   node scripts/check-lint.mjs           # fail on anything above baseline
//   node scripts/check-lint.mjs --ratchet # lower the baseline to actual counts
//   node scripts/check-lint.mjs --debt    # list the outstanding violations
//   (add --init to --ratchet to seed the baseline from scratch)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, toRepoPath } from "../.claude/hooks/lib/limits.mjs";

const BASELINE_PATH = path.join(REPO_ROOT, ".claude", "lint-baseline.json");
const ESLINT = path.join(REPO_ROOT, "node_modules", "eslint", "bin", "eslint.js");
const args = new Set(process.argv.slice(2));

function runEslint() {
  try {
    return execFileSync(process.execPath, [ESLINT, "-f", "json"], {
      cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    // eslint exits 1 when it reports problems; the JSON is still on stdout.
    if (error.stdout) return error.stdout;
    throw error;
  }
}

/** { "features/x/Foo.tsx": { "react-hooks/refs": 3 } } plus the messages behind them. */
function collect() {
  const results = JSON.parse(runEslint());
  const counts = {};
  const details = {};
  for (const file of results) {
    const rel = toRepoPath(file.filePath);
    if (!rel) continue;
    for (const message of file.messages) {
      const rule = message.ruleId ?? "(fatal)";
      counts[rel] ??= {};
      counts[rel][rule] = (counts[rel][rule] ?? 0) + 1;
      (details[`${rel}|${rule}`] ??= []).push(
        `    ${rel}:${message.line}:${message.column}  ${message.message.split("\n")[0]}`,
      );
    }
  }
  return { counts, details };
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8")).files ?? {};
  } catch {
    console.error(`[check-lint] unreadable ${BASELINE_PATH} — treating every violation as new`);
    return {};
  }
}

function writeBaseline(counts) {
  const files = Object.fromEntries(
    Object.entries(counts)
      .filter(([, rules]) => Object.keys(rules).length > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, rules]) => [file, Object.fromEntries(Object.entries(rules).sort())]),
  );
  const total = Object.values(files).reduce(
    (sum, rules) => sum + Object.values(rules).reduce((a, b) => a + b, 0), 0,
  );
  writeFileSync(BASELINE_PATH, `${JSON.stringify({
    comment: "Accepted ESLint debt, per file per rule. Counts may fall, never rise. Lower with: npm run lint:ratchet",
    total,
    files,
  }, null, 2)}\n`);
  return total;
}

const { counts, details } = collect();
const baseline = loadBaseline();

if (args.has("--debt")) {
  let total = 0;
  for (const [file, rules] of Object.entries(counts).sort()) {
    const n = Object.values(rules).reduce((a, b) => a + b, 0);
    total += n;
    console.log(`${String(n).padStart(3)}  ${file}  ${Object.keys(rules).join(", ")}`);
  }
  console.log(`\n${total} outstanding violation(s). Fix some, then run: npm run lint:ratchet`);
  process.exit(0);
}

if (args.has("--ratchet")) {
  const next = {};
  for (const [file, rules] of Object.entries(counts)) {
    for (const [rule, count] of Object.entries(rules)) {
      const recorded = args.has("--init") ? Infinity : baseline[file]?.[rule];
      if (recorded === undefined) continue; // not accepted debt: a violation to fix
      const lowered = Math.min(recorded, count);
      if (lowered > 0) (next[file] ??= {})[rule] = lowered;
    }
  }
  console.log(`lint baseline: ${writeBaseline(next)} accepted violation(s) -> .claude/lint-baseline.json`);
  process.exit(0);
}

const regressions = [];
for (const [file, rules] of Object.entries(counts)) {
  for (const [rule, count] of Object.entries(rules)) {
    const allowed = baseline[file]?.[rule] ?? 0;
    if (count > allowed) regressions.push({ file, rule, count, allowed, details: details[`${file}|${rule}`] });
  }
}

if (regressions.length === 0) {
  console.log("check-lint: no new violations");
  process.exit(0);
}

for (const { file, rule, count, allowed, details: lines } of regressions) {
  console.error(`  ${file} — ${rule}: ${count} (baseline allows ${allowed})`);
  for (const line of lines.slice(allowed)) console.error(line);
}
console.error(`\ncheck-lint: ${regressions.length} rule(s) regressed. Fix them — do not raise the baseline.`);
process.exit(1);
