#!/usr/bin/env node
// PreToolUse hook (Write | Edit). Refuses a write before it lands when it would
// push a file over its line cap, leak a secret, or edit an applied migration.
// Exit 2 = blocked, stderr goes back to Claude. Any internal error exits 1
// (surfaced to the user, write allowed) so a bug here cannot brick a session.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  REPO_ROOT, toRepoPath, isChecked, limitFor, countLines, DEFAULT_LIMIT,
} from "./lib/limits.mjs";
import { checkSecrets, checkEnvFile, checkMigration } from "./lib/guards.mjs";

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

/** The file as it would look after this tool call, plus just the added text. */
function project(toolName, input, absPath, exists) {
  const current = exists ? readFileSync(absPath, "utf8") : "";
  if (toolName === "Write") {
    return { next: input.content ?? "", added: input.content ?? "" };
  }
  const edits = toolName === "MultiEdit" ? (input.edits ?? []) : [input];
  let next = current;
  let added = "";
  for (const edit of edits) {
    const { old_string: from = "", new_string: to = "" } = edit;
    added += `${to}\n`;
    if (!from || !next.includes(from)) continue; // the tool itself will error
    next = edit.replace_all ? next.split(from).join(to) : next.replace(from, to);
  }
  return { next, added };
}

function sizeMessage(repoPath, lines, limit, kind) {
  const head = `Blocked: this write would make ${repoPath} ${lines} lines (cap ${limit}).`;
  if (kind === "baseline") {
    return `${head} This file is grandfathered above the ${DEFAULT_LIMIT}-line cap at its current size — it may shrink but never grow. Split a cohesive group of exports out into a new sibling module (each new file under ${DEFAULT_LIMIT} lines), then run \`npm run lines:ratchet\` to lower the baseline.`;
  }
  if (kind === "override") {
    return `${head} This file has a deliberate cap of ${limit}. Move content out rather than raising it.`;
  }
  return `${head} Every file in this repo is capped at ${DEFAULT_LIMIT} lines. Split before writing: extract a cohesive piece — a sub-component, a hook, a group of pure helpers, one query family — into its own file under the cap, and import it back. Do not delete code you still need in order to fit.`;
}

const payload = readStdin();
if (!payload) process.exit(0);

const toolName = payload.tool_name ?? "";
const input = payload.tool_input ?? {};
if (!["Write", "Edit", "MultiEdit"].includes(toolName) || !input.file_path) {
  process.exit(0);
}

const absPath = path.resolve(REPO_ROOT, input.file_path);
const repoPath = toRepoPath(absPath);
if (!repoPath) process.exit(0); // outside the repo (scratchpad, home config)

const exists = existsSync(absPath);

for (const message of [
  checkEnvFile(repoPath),
  checkMigration(repoPath, !exists),
]) {
  if (message) block(message);
}

const { next, added } = project(toolName, input, absPath, exists);

const secret = checkSecrets(repoPath, added);
if (secret) block(secret);

if (isChecked(repoPath)) {
  const lines = countLines(next);
  const { limit, kind } = limitFor(repoPath);
  if (lines > limit) block(sizeMessage(repoPath, lines, limit, kind));
}

process.exit(0);
