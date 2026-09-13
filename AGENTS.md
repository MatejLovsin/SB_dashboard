# Personal Dashboard — how to work in this repo

A private, single-user "second brain" for **Fitness**, **School** and **Work**, plus a home
dashboard. Mobile-first; Fitness is the heavy mobile-use section. One user, one database.

> 🟢 **Every session starts by reading `PROGRESS.md`** — it holds the current state and the next
> step, and nothing else. Update it as you finish work, and move anything shipped into
> `PROGRESS_ARCHIVE.md` rather than letting PROGRESS grow.

## This is not the Next.js you know

Next 16 has breaking changes against your training data. **Read the relevant guide in
`node_modules/next/dist/docs/` before writing code** that touches routing, caching, server
components or config. Heed deprecation notices. In particular: `cookies()` is async, the gate file
is `proxy.ts` (not `middleware.ts`), Tailwind v4 is configured in `app/globals.css` with no
`tailwind.config.js`, and `dynamic(..., { ssr: false })` is forbidden in Server Components.

## Stack

Next.js 16 (App Router, TypeScript, Turbopack) · Tailwind v4 · Supabase (Postgres + Auth) with
`@supabase/ssr` · TanStack Query · Recharts · lucide-react · Vitest.

## Conventions

- **Paths.** Import alias `@/*` → repo root. No `src/`. Pages live under `app/(app)/` (the route
  group carrying the authenticated `AppShell`); `app/login/` is public.
- **Auth and RLS.** Single Supabase user. Every table has `user_id default auth.uid()` and
  owner-only RLS; inserts may omit `user_id`. `proxy.ts` refreshes the session and redirects
  unauthenticated users to `/login`.
- **Supabase clients.** `lib/supabase/client.ts` in the browser, `lib/supabase/server.ts` in RSC
  and route handlers, `lib/supabase/middleware.ts` for the session helper. Query functions take an
  explicit client argument so they run from either side.
- **DB types are hand-maintained** in `lib/db/types.ts` to match `supabase/migrations/`. Keep them
  in sync — a commit that adds a migration without touching them is refused.
- **No PostgREST embeds.** `Relationships` is empty by design; run separate typed queries and join
  in JS.
- **Data strategy.** Server Components for read-heavy pages; Client Components + TanStack Query
  for interactive flows (logger, timer, kanban). Mutations go straight to Supabase, RLS-guarded.
- **Migrations are append-only.** Never edit an applied migration; add a new numbered file that
  moves the schema forward.

## Design

`DESIGN_GUIDE.md` is the spec — read it before changing anything visual. The short version: the
design language is "lit instrument" — no containers, light as a source, industrial type. Colors
come from CSS variables in `app/globals.css`, never from hex literals in components.

## Shared UI kit — reuse, don't rebuild

Before building a chart, tile or overlay, use what exists. All verified present.

| Import | What it is |
|---|---|
| `@/components/ui/StatTile` | KPI tile: `label`, `value`, `unit`, `delta?`, `lead?`, sparkline slot |
| `@/components/ui/FocusOverlay` | Modal panel; `size="reading"` for long-form, compact by default |
| `@/components/ui/Markdown` · `MarkdownEditor` | Long-form read / write (journal, notes, session notes) |
| `@/components/ui/GoalBar` | Milestone progress bar; takes **both** `current` and `best` |
| `@/components/charts/ChartCard` | Panel wrapper with title + chart body |
| `@/components/charts/AreaTrend` | Hero gradient area chart — one per page |
| `@/components/charts/Sparkline` · `BarCluster` · `DonutStat` | The minis |
| `@/components/charts/ChartReveal` | Defers chart mount until in view; wrap hero charts |
| `@/lib/utils/chartTheme` | `useChartTheme()`, `chartAnim` — the only way to read theme colors |
| `@/lib/utils/stats` · `grades` | Pure logic, under test: volume/1RM/streaks, and which grades count |

## Rules that are enforced, not requested

These are checked by hooks and by `npm run check`. They will block you; the fix is never to weaken
the rule.

| Rule | Enforced by | How to comply |
|---|---|---|
| **No file over 300 lines** | pre-write hook, `npm run lines` | Split before writing: extract a sub-component, a hook, a group of pure helpers, or one query family into its own file. |
| Files already over 300 may shrink, never grow | `.claude/line-baseline.json` | Take the opportunity to split. After shrinking, run `npm run lines:ratchet` to lower the baseline. |
| No secrets in tracked files | pre-write hook | Secrets live in `.env.local` and are read via `process.env`. Never write `.env*` yourself. |
| Applied migrations are immutable | pre-write hook, pre-commit | Add a new numbered migration instead. |
| A migration ships with its types | pre-commit | Update `lib/db/types.ts` in the same commit. |
| Client Components never import `lib/supabase/server` | pre-commit | Use `lib/supabase/client.ts` in client code. |
| No hex colors in `components/`, `features/`, `app/` | ESLint | Use a CSS variable from `app/globals.css`; chart colors belong in `lib/utils/chartTheme.ts`. |
| No `any`, no `!`, no `console.log` | ESLint | Narrow the type properly; `console.error`/`warn` are allowed. |
| Functions stay under 80 lines | ESLint | The same split that fixes a long file usually fixes this. |
| A turn that touched TypeScript ends type-clean | Stop hook | Fix the errors before finishing; do not hand back broken code. |

**Two baselines exist because the repo predates the rules:** `.claude/line-baseline.json` (15 files
over the cap) and `.claude/lint-baseline.json` (171 accepted violations). Both are ratchets — the
numbers may fall, never rise. **Never raise a baseline to make a check pass.** If you genuinely
cannot fix something, say so and leave it failing rather than editing the baseline.

`npm run lint:debt` lists the outstanding lint violations if you want to pay some down.

## Validating changes

```
npm run check      # lines + lint + types + tests — this is also the pre-commit gate
npm run build      # additionally, when you touched rendering or config
```

The build passes without secrets (authenticated pages are dynamic). Runtime needs the Supabase URL
and anon key in `.env.local`.

Tests are Vitest over the pure logic in `lib/utils` only (`grades.ts`, `stats.ts`) — the rules that
several screens depend on agreeing about. There are no component or database tests; do not add a
test that needs a running Supabase.

## File-reading discipline — follow this strictly

Token budget is tight. Do **not** speculatively read files to "understand the project".

- **Never** glob or read the whole `components/`, `features/`, `lib/` or `app/` tree at the start
  of a session or between prompts.
- **Never** read a file to confirm something AGENTS.md or PROGRESS.md already told you.
- **Do** use Grep to locate a specific symbol before opening the file it lives in.
- **Do** read only the file you are about to edit, and only the lines you need.
- For a DB type or a query function's shape, read `lib/db/types.ts` or the one relevant
  `lib/queries/*.ts` — not every file that imports them.
- Read `PROGRESS_ARCHIVE.md` only when you explicitly need history.
