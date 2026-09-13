// Content and path guards for writes: secrets, env files, applied migrations.
// Each guard returns null when the write is fine, or a message explaining the
// refusal. Messages are read by Claude, so they say what to do instead.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./limits.mjs";

// Key shapes, not key names: `service_role` on its own is legitimate SQL in an
// RLS policy, so matching the word would fire on every migration.
const SECRET_PATTERNS = [
  { re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, what: "a JWT (Supabase anon/service key)" },
  { re: /sb_secret_[A-Za-z0-9]{10,}/, what: "a Supabase secret key" },
  { re: /sbp_[a-f0-9]{40}/, what: "a Supabase personal access token" },
  { re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S/, what: "an inline service-role key" },
];

// These files describe the guards, so they may quote the shapes they match.
const SECRET_SCAN_EXEMPT = [".claude/hooks/", "scripts/", "AGENTS.md"];

export function checkSecrets(repoPath, addedText) {
  if (SECRET_SCAN_EXEMPT.some((p) => repoPath.startsWith(p) || repoPath === p)) return null;
  for (const { re, what } of SECRET_PATTERNS) {
    if (re.test(addedText)) {
      return `Blocked: this write puts ${what} into ${repoPath}. Secrets belong in .env.local (untracked) and are read via process.env — never written into a tracked file.`;
    }
  }
  return null;
}

export function checkEnvFile(repoPath) {
  const name = path.basename(repoPath);
  if (!name.startsWith(".env")) return null;
  if (name === ".env.local.example") return null;
  return `Blocked: ${repoPath} holds live secrets and is not yours to rewrite. Ask the user to edit it, or add the key to .env.local.example with a placeholder value instead.`;
}

const MIGRATIONS_DIR = "supabase/migrations";

/** The newest migration is still being authored; every older one is applied. */
function latestMigration() {
  const dir = path.join(REPO_ROOT, MIGRATIONS_DIR);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  return files.at(-1) ?? null;
}

export function checkMigration(repoPath, isNewFile) {
  if (!repoPath.startsWith(`${MIGRATIONS_DIR}/`) || !repoPath.endsWith(".sql")) return null;
  if (isNewFile) return null;
  const name = path.basename(repoPath);
  if (name === latestMigration()) return null;
  return `Blocked: ${repoPath} is an applied migration and is immutable — editing it drifts the repo from the live database without either side knowing. Add a new numbered migration in ${MIGRATIONS_DIR}/ that alters the schema forward, and update lib/db/types.ts to match.`;
}
