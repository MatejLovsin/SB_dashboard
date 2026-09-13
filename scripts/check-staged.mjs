#!/usr/bin/env node
// Repo-specific pre-commit checks that no linter can express.
// Reads the STAGED content (git show :file), not the working tree, so a partial
// `git add -p` is judged on what is actually being committed.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { REPO_ROOT } from "../.claude/hooks/lib/limits.mjs";

const git = (args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });

/** [{ status: "A" | "M" | ..., file: "lib/x.ts" }] */
function staged() {
  return git(["diff", "--cached", "--name-status", "--diff-filter=ACMR"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      return { status: parts[0][0], file: parts.at(-1) };
    });
}

function stagedContent(file) {
  try {
    return git(["show", `:${file}`]);
  } catch {
    return "";
  }
}

const entries = staged();
const failures = [];

// 1. A new migration changes the schema; lib/db/types.ts is hand-maintained and
//    must move with it, or every query silently types against the old shape.
const newMigrations = entries.filter(
  (e) => e.status === "A" && e.file.startsWith("supabase/migrations/") && e.file.endsWith(".sql"),
);
const typesTouched = entries.some((e) => e.file === "lib/db/types.ts");
if (newMigrations.length > 0 && !typesTouched) {
  failures.push(
    `New migration(s) staged without lib/db/types.ts:\n` +
    newMigrations.map((m) => `    ${m.file}`).join("\n") +
    `\n  DB types are hand-maintained (AGENTS.md). Update lib/db/types.ts to match, then re-stage.`,
  );
}

// 2. An applied migration is immutable: only the newest may still change.
const migrationFiles = git(["ls-tree", "--name-only", "HEAD", "supabase/migrations/"])
  .split("\n").map((s) => s.trim()).filter((s) => s.endsWith(".sql")).sort();
const newest = migrationFiles.at(-1);
for (const e of entries) {
  if (e.status !== "M" || !e.file.startsWith("supabase/migrations/")) continue;
  if (e.file === newest) continue;
  failures.push(
    `${e.file} is an applied migration and must not change.\n` +
    `  Add a new numbered migration that alters the schema forward instead.`,
  );
}

// 3. The server Supabase client reads cookies() — importing it from a Client
//    Component ships server code to the browser and fails at runtime.
for (const e of entries) {
  if (!/\.(ts|tsx)$/.test(e.file)) continue;
  const content = stagedContent(e.file);
  if (!/^\s*['"]use client['"]/m.test(content)) continue;
  if (!/from\s+['"](@\/lib\/supabase\/server|.*\/lib\/supabase\/server)['"]/.test(content)) continue;
  failures.push(
    `${e.file} is a Client Component but imports lib/supabase/server.\n` +
    `  Use lib/supabase/client.ts in client code; server.ts is for RSC and route handlers.`,
  );
}

// 4. Env files are never committed, gitignore or not.
for (const e of entries) {
  if (path.basename(e.file).startsWith(".env") && path.basename(e.file) !== ".env.local.example") {
    failures.push(`${e.file} must never be committed. Unstage it: git restore --staged ${e.file}`);
  }
}

if (failures.length === 0) {
  console.log(`check-staged: ${entries.length} staged file(s), no issues`);
  process.exit(0);
}
for (const failure of failures) console.error(`  ${failure}`);
console.error(`\ncheck-staged: ${failures.length} problem(s) — commit refused.`);
process.exit(1);
