# PROGRESS ARCHIVE — completed sessions & gotchas

Only open this file when you need historical context. PROGRESS.md holds the active state.

---

## Completed session checklist

- [x] **S1 — Foundation & deploy skeleton.** Next 16 scaffold; schema migration + RLS;
      hand-authored DB types; single-user auth (`proxy.ts`, login page, `(app)` guard);
      AppShell (BottomNav/SideNav/TopBar); stub pages; UI primitives. tsc + build + lint clean.
- [x] **S2 — Fitness data layer.** `exercises` dictionary + `ExercisePicker` (type-to-search,
      create-on-miss); plans CRUD (`/fitness/plans` list+create, `/fitness/plans/[id]` editor
      with per-set targets, reorder, delete); typed fns in `lib/queries/fitness.ts`;
      `Button`/`Input`/`Spinner` UI primitives. tsc + build + lint clean.
      **Per-set model:** added migration `0002_plan_sets.sql` — a `plan_sets` child table (one
      row per set, each with its own reps + weight) and dropped `target_sets/reps/weight` from
      `plan_exercises`.
- [x] **S3 — Workout logger (core mobile flow).** `/fitness/log` + `SessionRunner` (plan picker /
      empty workout) + `ActiveSession` (live set logging). Prefills sets from `plan_sets`;
      numpad entry via new `NumberField` primitive; green ✓ toggles `session_sets.completed`
      live; add set/exercise ad hoc; sticky Finish/Discard bar.
      **Migration `0003_session_sets_position.sql`** adds `session_sets.position`.
- [x] **S4 — Fitness analytics.** `lib/utils/stats.ts` (best-set/1RM, volume, stalled, streak);
      `/fitness/history` (LineTrend, VolumeBar, ConsistencyHeatmap per exercise);
      `/fitness/overview` (SessionsPerWeek, streak, stalled list). tsc + build + lint clean.
- [x] **S5 — School tracker.** `subjects`, `exams` CRUD; `UpcomingExams` RSC; `/school`,
      `/school/subjects`, `/school/exams` pages. `lib/queries/school.ts`. tsc + build + lint clean.
- [x] **S6 — Study timer & subject analytics.** `StudyTimer` → `study_sessions`; `StudySessionsChart`;
      `/school/subjects/[id]` detail page. tsc + build clean.
- [x] **S7 — Work section.** `KanbanBoard` (drag-to-reorder, priority chips); `NoteList` with
      full-text search; `/work` home + `/work/notes`. `lib/queries/work.ts`. tsc + build clean.
- [x] **S8 — AI summary layer.** `lib/ai/` (Anthropic client + prompts); `app/api/summary/route.ts`
      (JWT check, gather data, `claude-sonnet-4-6`, prompt caching, upsert `ai_summaries`);
      `SummaryCard` with Regenerate on home + sections. tsc + build clean.

---

## Gotchas / decisions to remember

- **Next 16 specifics:** `cookies()` is async; gate file is `proxy.ts` (not `middleware.ts`);
  Tailwind v4 config in `app/globals.css` (no `tailwind.config.js`).
- **DB types are hand-maintained** in `lib/db/types.ts` — update when schema changes.
- **RLS everywhere:** owner-scoped (`auth.uid() = user_id`); inserts can omit `user_id`.
- **AI model is `claude-sonnet-4-6`**, server-side only, small `max_tokens`, stable prompt
  prefix marked for prompt caching.
- **Data strategy:** RSC for read-heavy pages; Client Components + TanStack Query for interactive
  flows (logger, timer, kanban); mutations go straight to Supabase.
- **No PostgREST embeds.** `lib/db/types.ts` has empty `Relationships`; queries in
  `lib/queries/fitness.ts` run separate typed queries and join in JS.
- **Query fns take an explicit Supabase client** so they work from both browser and server.
- **Session set ordering:** sets seeded from a plan share `created_at` (transaction-time), so
  `session_sets.position` (migration 0003) is the ordering column — 0-based global index.
- **Logger session lives in cache (`fitnessKeys.session(id)`), `staleTime: Infinity`.** Seeded
  via `setQueryData`; every edit writes through; "mark done" is optimistic.
- **Plan editor writes to cache, doesn't refetch.** `patchPlan` merges into cached
  `PlanWithExercises` instead of invalidating — avoids 4 round trips per edit.
- **Schema changes** go in new files under `supabase/migrations/` (don't edit `0001_init.sql`).
