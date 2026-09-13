// The repo-wide file-size cap.
// Shared by the Claude Code write hooks and scripts/check-lines.mjs so the rule
// is expressed exactly once. Nothing here touches the filesystem except the
// baseline read, so it is safe to import from a hook on every tool call.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const DEFAULT_LIMIT = 300;
export const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");

const BASELINE_PATH = path.join(REPO_ROOT, ".claude", "line-baseline.json");

// Files whose cap is deliberately not DEFAULT_LIMIT.
export const LIMIT_OVERRIDES = {
  // The operating manual is a set of pointers, not a document to read.
  "AGENTS.md": 200,
  // Read at the start of every session: finished work belongs in the archive.
  "PROGRESS.md": 140,
};

// Not counted: generated, vendored, binary, or append-only by design.
const IGNORED_DIRS = [
  "node_modules", ".next", ".git", ".vercel", "out", "build", "public", "coverage",
];
const IGNORED_FILES = [
  "package-lock.json",
  "tsconfig.tsbuildinfo",
  "next-env.d.ts",
  "PROGRESS_ARCHIVE.md", // the archive grows forever on purpose
];
const IGNORED_EXT = [
  ".jpg", ".jpeg", ".png", ".gif", ".ico", ".svg", ".webp",
  ".woff", ".woff2", ".ttf", ".otf", ".pdf", ".lock", ".tsbuildinfo",
];

/** Absolute or relative path -> repo-relative posix path. "" if outside the repo. */
export function toRepoPath(filePath) {
  const abs = path.resolve(REPO_ROOT, filePath);
  const rel = path.relative(REPO_ROOT, abs);
  if (!rel || rel.startsWith("..")) return "";
  return rel.split(path.sep).join("/");
}

/** Should a directory be descended into when scanning? */
export function isCheckedDir(repoPath) {
  if (!repoPath) return false;
  if (repoPath.startsWith(".claude/.state")) return false;
  return !repoPath.split("/").some((s) => IGNORED_DIRS.includes(s));
}

/** Is this file subject to the cap at all? */
export function isChecked(repoPath) {
  if (!isCheckedDir(path.posix.dirname(repoPath))) return false;
  const name = path.posix.basename(repoPath);
  if (IGNORED_DIRS.includes(name) || IGNORED_FILES.includes(name)) return false;
  return !IGNORED_EXT.includes(path.extname(repoPath).toLowerCase());
}

let baselineCache;

/** { "lib/queries/goals.ts": 1132, ... } — files grandfathered above the cap. */
export function loadBaseline() {
  if (baselineCache) return baselineCache;
  baselineCache = {};
  if (existsSync(BASELINE_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
      baselineCache = parsed.files ?? {};
    } catch {
      // A corrupt baseline must not silently disable the cap.
      process.stderr.write(`[limits] ignoring unreadable ${BASELINE_PATH}\n`);
    }
  }
  return baselineCache;
}

/** The cap for one file, and why it is that number. */
export function limitFor(repoPath) {
  if (repoPath in LIMIT_OVERRIDES) {
    return { limit: LIMIT_OVERRIDES[repoPath], kind: "override" };
  }
  const baselined = loadBaseline()[repoPath];
  if (typeof baselined === "number" && baselined > DEFAULT_LIMIT) {
    return { limit: baselined, kind: "baseline" };
  }
  return { limit: DEFAULT_LIMIT, kind: "default" };
}

/** Line count matching `wc -l` for newline-terminated text. */
export function countLines(text) {
  if (text === "") return 0;
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines.length;
}

export function countFileLines(absPath) {
  if (!existsSync(absPath)) return 0;
  return countLines(readFileSync(absPath, "utf8"));
}
