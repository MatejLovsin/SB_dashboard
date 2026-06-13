<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Personal Dashboard — project notes

A private, single-user "second brain" for **Fitness**, **School**, **Work**, plus a
home dashboard with AI summaries. Mobile-first; Fitness is the heavy mobile-use section.

> 🟢 **START HERE every session:** read `PROGRESS.md` first — it holds the current status
> and the exact next step. Update it as you complete work.

**Full build plan:** `C:\Users\matej\.claude\plans\peppy-finding-ember.md` (schema,
component structure, 9-session roadmap). We are building it session by session.

## Stack
- Next.js 16 (App Router, TypeScript, Turbopack) · Tailwind v4 (CSS config in `app/globals.css`)
- Supabase (Postgres + Auth, single user) · `@supabase/ssr`
- TanStack Query (interactive client state) · Recharts (charts) · lucide-react (icons)
- `@anthropic-ai/sdk`, model `claude-sonnet-4-6`, server-side only (Session 8)

## Conventions
- Import alias `@/*` → repo root. No `src/` dir. Pages live under `app/(app)/` (route
  group with the authenticated `AppShell`); `app/login/` is public.
- Auth/security: single Supabase user; **every table has `user_id default auth.uid()`
  and owner-only RLS**. `proxy.ts` (Next 16 renamed `middleware` → `proxy`) refreshes the
  session and redirects unauthenticated users to `/login`.
- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (RSC/route
  handlers — `cookies()` is async in Next 16), `lib/supabase/middleware.ts` (session helper).
- DB types in `lib/db/types.ts` are **hand-maintained** to match
  `supabase/migrations/0001_init.sql`. Keep them in sync (or regenerate once linked:
  `supabase gen types typescript --linked > lib/db/types.ts`).
- Data strategy: Server Components for read-heavy pages; Client Components + TanStack Query
  for interactive flows (logger, timer, kanban). Mutations go straight to Supabase (RLS-guarded).

## Validate changes
`npx tsc --noEmit` then `npm run build`. Build passes without secrets (authenticated pages
are dynamic). For runtime, `.env.local` needs the Supabase URL + anon key (+ Anthropic key).

## File-reading discipline — follow this strictly
Token budget is tight. Do NOT speculatively read files to "understand the project". Only read
a file if you are about to edit it or if it directly exports a symbol you need to reference.

- **Never** glob or read the whole `components/`, `features/`, `lib/`, or `app/` tree at the
  start of a session or between prompts.
- **Never** read a file to confirm what you already know from AGENTS.md / PROGRESS.md.
- **Do** use Grep to locate a specific symbol or import before opening the file it lives in.
- **Do** read only the exact file you are editing, and only the lines you need.
- If you need to know the shape of a DB type or query fn, read `lib/db/types.ts` or the
  relevant `lib/queries/*.ts` file — not every file that imports them.
- Read `PROGRESS_ARCHIVE.md` only when historical context is explicitly needed.
