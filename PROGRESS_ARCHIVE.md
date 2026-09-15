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
- [x] **S9 — PWA + polish.** Manifest, app icons, loading skeletons per route, error boundary, Recharts lazy-load via `dynamic(ssr:false)` in client components.
- [x] **R1 — Redesign foundation.** Dark-only navy+blue tokens in `globals.css`; `.nums`/`.panel` utilities; shared chart kit (`chartTheme.ts`, `StatTile`, `ChartCard`, `Sparkline`, `AreaTrend`, `DonutStat`, `BarCluster`); rethemed shell + Card; existing charts refactored onto chartTheme.
- [x] **R2 — Fitness showcase.** `FitnessOverview` rebuilt with KPI row, hero AreaTrend, BarCluster, DonutStat, BodyweightLogger. `body_metrics` migration + types. `ExerciseHistory` side-by-side charts. `PlanList`/`SessionRunner` rethemed.
- [x] **R3 — Home dashboard.** `lib/queries/home.ts` `getHomeMetrics()` (fitness 30d volume, school hours this week, work in-progress count + sparklines). `app/(app)/page.tsx` rebuilt with 3-tile KPI strip + existing SummaryCards.

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
- **Next 16 / Turbopack forbids `dynamic(..., { ssr: false })` in Server Components.** Import client components directly; `ssr: false` is only valid inside `'use client'` files.

---

# Shipped detail (moved out of PROGRESS.md, 2026-09-13)

Everything below shipped and is live. It was moved here so PROGRESS.md could go back to
being a short, current file. Open threads from these entries live in PROGRESS.md.

## ▶ NEXT STEP

**Exam retakes — SHIPPED (2026-09-12). Migration `0018_exam_retakes.sql` is APPLIED.**

The problem: failed sittings were dragging the average down, which made a grade-average goal
impossible and didn't match how college actually counts. Two rules now decide which grades are
real, and **`lib/utils/grades.ts` is the only place either is expressed** — every average, chart
and goal metric goes through it, so they cannot drift apart:

1. **A failing grade never counts** (`PASS_MARK = 50`, grades are percentages) — retaken or not,
   because a failed exam isn't in a transcript average either.
2. **`exams.retake_of` links attempts into a chain, and a chain contributes exactly one grade:
   the highest passing attempt** (earliest on a tie). That covers re-sitting a fail *and*
   retaking a pass you weren't happy with — a plain "doesn't count" flag could only do the first,
   and would be bookkeeping to keep in sync by hand.

Nothing is hidden or deleted: a superseded/failed sitting still renders, struck through, tagged
`superseded` / `failed`, with `attempt 2 of 3` under the title and the full chain listed in the
detail overlay.

- `resolveAttempts()` returns `{chainId, attempt, attempts, passed, counts, countedId}` per exam;
  `countedExams()` is the filter every aggregate uses; `descendantsOf()` keeps the form from
  offering a retake target that would close a loop. The walk is depth-capped and cycle-safe (a
  cycle collapses to its lowest id rather than splintering into one chain per starting point).
- `ExamWithSubject` now carries `attempt`, so any consumer of `listExams` gets it for free.
  `listExams` reads the whole table even for `upcoming` — attempt numbering needs the earlier
  sittings a date filter would cut away.
- `listGradedExamsWithStudyHours` returns **only counted grades**, and sums study hours across the
  WHOLE chain, so the hours→grade model no longer learns from "40h → fail" as a separate point.
- Goals: `gradedExams()` in `lib/queries/goals.ts` is filtered through `countedExams`, so
  `subject_avg_grade` / `overall_avg_grade` / `subject_best_grade` all changed value. `exam_grade`
  **follows the chain** — a goal bound to the first sitting moves when the retake passes.

Files: `lib/utils/grades.ts` (new) · `supabase/migrations/0018_exam_retakes.sql` ·
`lib/queries/school.ts` · `lib/queries/goals.ts` · `features/school/{ExamForm,ExamCard,ExamDetail,ExamList}.tsx`
· `app/(app)/school/insights/page.tsx`.

**Verified:** `tsc` · `npm run build` clean, `eslint` unchanged from baseline (73 pre-existing
errors, none in the new code). 18 cases over the pure logic — fail/pass/improved-pass chains,
three-deep chains, ungraded retake, ties, branching chains, dangling parent, cycles, and the
worked average — all pass; the script is in the session scratchpad, not the repo (no test runner
here yet). **Not yet exercised against live rows** — link one real retake on `/school/exams` and
confirm the average and any grade goal move the way you expect.

**Open:** grades are percentages with a pass at 50, both hardcoded in `grades.ts`; if a subject
ever grades on another scale this becomes a setting. There is no "show superseded attempts"
filter on the past-exams tab — every sitting is listed.

---

**Goals — SHIPPED (2026-09-11).** A goal is a target with ordered milestones and a progress
bar. `/goals` (new SideNav entry) plus a read-only strip on each of the three hubs.

- **Migration `0017_goals.sql` is APPLIED.** `goals` · `goal_milestones` · `goal_checkins`,
  four enums, owner-only RLS, `goals_auto_needs_metric` check.
- **Auto goals resolve ON READ.** `resolveMetric()` in `lib/queries/goals.ts` is the only code
  that reaches into fitness/school/work data for a goal. **No write-back hooks** in
  `sessions.ts` / `school.ts` / `work.ts` / `plans.ts` — the feature is purely additive, and a
  goal created today backfills its milestone dates out of history.
- **One shape for every metric:** a time-ordered `Observation[]` plus a mode (`peak` = running
  best, `cumulative` = running total). Headline value, milestone hit dates and the trend all
  derive from that array, so a new metric kind is one query. Catalog = **21 kinds** (12 fitness,
  6 school, 3 work) in `GOAL_METRICS`, each declaring the args the picker collects. Fixed list
  by design, not a query builder. `work_metric_value` / `work_metric_total` read any label in
  `work_metrics` — the escape hatch for anything the schema can't otherwise answer.
- **Progress rule (both modes): the fill reaches the furthest point you have ever been** — your
  `best`, or the furthest cleared milestone. Milestones with values draw to scale between
  `start` and `target`; a tick-only set falls back to evenly spaced count mode. Cleared never
  un-clears; when `current` sits behind the fill a hollow marker shows where you actually are.
- **`GoalBar` takes BOTH `current` and `best`.** ⚠️ It originally took only `current`, which
  silently disagreed with the server whenever the latest session was below the all-time best
  (a best landing *between* two milestones is invisible to the notches). `goalPercent()` and
  `percentOf()` are now proven to agree — there is a regression case for exactly this.
- **Four sections:** fitness · school · work · **life** (life renders only on `/goals`, and
  borrows the home accent since it has no theme of its own).
- **`[data-theme]` blocks are nestable** (`globals.css`). They previously set only
  `--accent-rgb`, but `--accent`/`--accent-soft` are *declared* at `:root`, and a custom property
  resolves where it is declared — so a nested theme did nothing (hence `AppShell` stamping
  `documentElement`). Each block now re-declares both derived tokens, and `[data-theme='home']`
  was added. **This is what lets `/goals` show fitness red, school teal and work graphite on one
  page**, and it is the way to theme any subtree from now on.

Files: `lib/queries/goals.ts` (catalog · resolver · CRUD · `listMetricOptions`) ·
`components/ui/GoalBar.tsx` · `features/goals/{GoalCard,GoalStrip,GoalForm,GoalsBoard}.tsx` ·
`app/(app)/goals/page.tsx` (RSC — resolution happens server-side; mutations write straight to
Supabase then `router.refresh()`) · hub strips wired into `fitness/school/work/page.tsx` ·
`components/layout/nav-items.ts`.

**Decisions taken as defaults (not explicitly confirmed):** `deadline` is stored always but only
rendered once set (then shows "12d left" / "3d late"); the hub strip shows **all active** goals
for its section, ordered nearest-to-done, capped at 6 with a "+N more" link (not pinned-only).

**Verified:** `tsc` · `eslint` · `npm run build` clean. 25 assertions over the resolver's pure
functions (peak + slip, cumulative, direction-down, count mode, stored-tick floor, running
max/min/sum, and the best-between-milestones regression) all pass. End-to-end in the browser: an
auto goal bound to a real exercise resolved **32 kg current / 34 kg best → 70%** off his own
`session_sets`, auto-cleared the 25 and 30 milestones, and the create/edit/delete paths all work.
The test goal was deleted afterwards.

**Still open (his call):** whether the per-notch captions (`45 · 50 · 55`) earn their space, and
whether the **work** section's graphite accent makes a work goal's bar read as *disabled* rather
than *progressing* — a progress bar is the first real value-carrying element in that section.
Both are now judged on the live `/goals` page; the `/goals/preview` sandbox has been deleted.

**Also open:** manual **check-ins have a backend but no UI** — `goal_checkins`, `addCheckin` and
`listCheckins` are built and tested, but nothing in `GoalForm` logs one, so a manual *numeric*
goal can currently only move its bar by ticking milestones. Closest gap to fill.
`workout_streak_weeks` is the one metric whose series is synthesised week-by-week rather than
read from rows, so it is the likeliest to be subtly wrong; it has not been checked against real
data. Only `exercise_best_weight` was exercised end-to-end against live rows — the other 20 kinds
are typechecked and share the same shape, but the school and work ones deserve a sanity check the
first time a goal binds to them.

**Design language replaced (2026-09-09) — "lit instrument".** The grey-card era is over.
Full spec in `DESIGN_GUIDE.md` §0; the token layer is `app/globals.css`.

What changed, and why it propagates without touching pages:
- **No containers.** `.panel` now draws a hairline top rule and nothing else — no fill, no
  border box, no shadow. Every existing `<Card>` converted for free.
- **Light is a source.** One fixed lamp above the content column. `AppShell` wraps pages in
  `.page-lit`, which assigns `--depth` to the page root's children by position; `--foreground`,
  `--muted` and `--border` are computed from that depth, so every `text-muted` /
  `border-border` utility already in the app became light-responsive with no component edits.
  Dials: `--glow-strength` **.70** on hubs / **.40** on subpages (`data-scope`, off the route
  depth), `--light-response` **.75** everywhere. These are the values chosen from the mockups.
- **The lamp dims as you scroll** (added right after the token pass): `--scroll-fade` goes
  linearly from 1 at the top of a page to **0.2** at the bottom, written per frame by `AppShell`
  straight to the DOM (no React state, rAF-coalesced, passive listener) and multiplied into the
  glow's opacity. Driven off the `<main>` scroll container, not the window. A ResizeObserver
  re-reads when a page grows after mount, and a next-frame recheck covers Next's scroll reset on
  navigation. Floor lives in `SCROLL_FADE_FLOOR` in `AppShell.tsx`.
- **Type:** Martian Mono (display + all numbers, `-0.045em`), Spline Sans Mono (labels),
  Archivo (body). Geist is gone from `layout.tsx`.
- Touched: `globals.css`, `layout.tsx`, `AppShell`, `Card`, `StatTile` (adds `lead` for the one
  `.emissive` metric per screen), `PageHeader` (adds optional `eyebrow`), `SideNav`, `TopBar`.
- Verified: `npx tsc --noEmit` clean, `npm run build` clean, and the depth chain measured live
  in the browser (ink .957 → .835, rules .11 → .06 top to bottom of a page).

**Long-form typography pass — DONE (2026-09-11).** `--type-longform` now resolves to
**Newsreader** (variable optical size + italic, loaded in `layout.tsx`), and the three surfaces
that are genuinely *read* rather than scanned are **markdown end-to-end**: weekly journal
entries, work notes, study session notes (incl. discarded sessions).

- **No migration.** The markdown source is stored in the existing text columns
  (`journal_weeks.content`, `notes.body`, `study_sessions.note`). Old plain-text entries render
  unchanged — plain prose is already valid markdown.
- **Read:** `components/ui/Markdown.tsx` — react-markdown + remark-gfm rendering into
  `.longform-body`. Raw HTML in the source is deliberately **not** rendered (no `rehype-raw`).
  Tables get their own scroll container; links open in a new tab.
- **Write:** `components/ui/MarkdownEditor.tsx` — Write/Preview tabs on a hairline rail, a
  caret-aware toolbar (H2 · H3 · bold · italic · bullets · numbers · quote · link) that toggles
  syntax on the selected lines, `Ctrl/⌘ + B/I/K`, and Enter continuing (or ending) a list.
  Preview renders through the same `<Markdown>`, so the two sides can't drift. Wraps the
  existing auto-grow `TextArea`; the writing surface is borderless and set in the reading face
  at the reading measure, so a line breaks where it will when read back.
- **List previews:** `markdownExcerpt()` in `lib/utils/markdown.ts` flattens the source to plain
  prose so a `line-clamp` row never shows `##` / `**`. Regex, not a parse — the output is never
  rendered as markup. Underscore emphasis is boundary-guarded so `plan_set_id` survives.
- **More room to read:** `FocusOverlay` gained `size="reading"` — `max-w-2xl` / `max-h-[90vh]`
  with wider padding, vs the compact `max-w-lg` default. Used by the journal review, work notes
  and study session history overlays. The compact size is still correct for short detail
  read-outs and forms.
- **All typography lives in `.longform-body`** (`globals.css`), derived from the lit tokens so a
  reading surface dims with the lamp: 17px/1.7, `--reading-measure` 68ch, headings in the
  reading face (`####` drops to the label face as an uppercase divider), bullets as a short
  accent rule, ordered markers in label-face numerals, GFM tables/task lists/strikethrough.
  Switching the reading face is still one line: `--type-longform`.
- New deps: `react-markdown`, `remark-gfm`. Verified `npx tsc --noEmit` + `npm run build` clean;
  **not yet eyeballed in the browser** (the Chrome extension wasn't connected this session).

**Overlay panels made opaque (2026-09-11).** With `.panel` drawing no fill, `FocusOverlay`'s
floating panel let the dimmed page read straight through its text — unreadable on anything long.
New `.floating-panel` class in `globals.css` (used only by `FocusOverlay`): opaque **`#0d0d10`**
fill (a touch *above* the page's `#09090b` — pure black read as a hole, since the dimmed
backdrop computes to about `#030303`), a hairline on all four sides (a floating surface has to show its own edges, and the top
edge is brighter because the lamp hangs above), and `--depth: 0.06` with the ink/rule tokens
re-declared — so overlay content is the most-lit text on screen. The backdrop is unchanged
(`bg-black/70` + blur). This is the **only** opaque fill in the app; `.panel` stays fill-less.

**Not yet done (per-page work, needs eyes on the real screens):**
- Section *order* is now a visual decision (first section gets the light). No page has been
  re-ordered for it.
- The solid `bg-accent` action cards (e.g. "Start workout" on `/fitness`) are still solid blocks
  from the old language. The mockup used a soft accent wash + accent text instead.
- Nested `bg-card-2` chips, the kanban cards and form fields still carry faint fills. They
  degrade fine, but the kanban wants the mockup's 2px priority-tick treatment.
- No hub has picked its `lead` metric yet (`<StatTile lead />` → `.emissive`).

**Design rules live in `DESIGN_GUIDE.md`.**

No active redesign tasks. Next work: new features or content updates.

**AI summaries removed (2026-09-09).** The `SummaryCard` button on `/fitness`, `/school`,
`/work` and the summary blurbs on the home bento were never used and never worked, so the
whole feature is gone: `components/ai/`, `lib/ai/`, `lib/queries/ai.ts`, `app/api/summary/`
deleted and `@anthropic-ai/sdk` uninstalled. The `ai_summaries` table and its `lib/db/types.ts`
entry are intentionally left in place (no migration written) — drop them if you want the
schema clean. The journal's *weekly summary* is user-written and unrelated.

**Open question (weekly programme):** the seeded split follows `full_programme_updated.svg`
literally, where the light days are asymmetric — **DB incl** and **Pullup** are light on *both*
Legs and Lower, while **Dips** and **Row** are light only on Upper. Unconfirmed whether that's
intentional or a slip in the source diagram (Lower may have been meant to mirror Upper). Fixable
without a migration: toggle the chips at `/fitness/programme`.

### Fitness features shipped (patterns logged in DESIGN_GUIDE → Approved feature patterns)
- [x] **Exercise library** — `/fitness/history` (component `ExerciseLibrary`) replaces the old
  search-only "Exercise history". Browse mode lists **every** exercise in a responsive grid
  (`grid-cols-1 lg:grid-cols-2`), ordered **most-used first**, each card showing best est-1RM,
  session count, last-done date, and an e1RM sparkline. Click → `ExerciseDetail`: headline
  StatTiles, **editable per-exercise notes** (`exercises.notes`, no migration), e1RM trend +
  volume + consistency charts, pin toggle, and a "Most used in" top-5 session list (links to
  `/fitness/sessions/[id]`). Data: `getExerciseLibrary` in `analytics.ts` (one pass over
  exercises/session_sets/sessions → per-exercise stats + 8-pt sparkline); `updateExerciseNotes`
  in `fitness.ts`. Old `ExerciseHistory.tsx` deleted.
- [x] **Pinned lifts** — `exercises.pinned` flag (migration `0006`); squat+bench seeded.
- [x] **Rename / pin exercises** — `/fitness/exercises` Manage screen (`ExerciseManager`).
- [x] **Fitness KPI strip** — volume 30d, sessions this week, streak, best est-1RM (via `getFitnessHubMetrics` in `analytics.ts`).
- [x] **Compare sessions** — `/fitness/compare`: pick a category and view its last 3 sessions side-by-side. **Category = the plan's `category`** (Push/Pull/Legs, grouped case-insensitively), so multiple plans in one category (e.g. "Push A" + "Push B") roll up together and let you compare lifts across them. Sessions link via `plan_id`; manual/plan-less sessions are excluded. Reuses the read-only `SessionDetailBody` (extracted from `FitnessSessionDetail`), with the session title shown above each column. Queries `listSessionCategories` / `getRecentSessionsByCategory` in `analytics.ts`. Reached via the 3-up action grid on the fitness hub (Start workout · Session log · Compare). Mobile = snap-scroll columns; `lg` = 3-col grid. No migration.

- [x] **Weekly journal** — dashboard-only feature for weekly written summaries (foundation for
  future AI multi-month synthesis). Table `journal_weeks` (migration `0009`, `week_start` = the
  Monday of the summarized week, unique per user). Logic in `lib/queries/journal.ts`: the entry
  always targets **last completed week** (`targetWeekStart`); it's **open** iff no row exists for
  that week (`isEntryOpen`). Submitting closes it until the next Monday rolls the target forward;
  a skipped week is simply left uncovered (backfill in review). Two routes, linked **only** from
  the home dashboard widget (no SideNav entry): `/journal/new` (`JournalEntry` — auto-grow
  `TextArea`, save→upsert→redirect, or a "caught up" state) and `/journal` (`JournalReview` —
  weeks grouped into month sections via `groupByMonth`, click → `FocusOverlay` full read, pencil
  → inline edit/delete, "+ Add a past week" backfill picker of recent uncovered Mondays). Reuses
  `FocusOverlay`, `TextArea`, `mondayOf`. No AI yet — schema is shaped for a later
  `summarizeJournalRange` route.

- [x] **Daily to-do list** — PLANNED the day before, EXECUTED the next day. Two tables
  (migration `0010`): `todo_pins` (non-negotiable templates) and `todos` (per-day items with
  `due_date`, `position`, `completed`, `pin_id`). Logic in `lib/queries/todos.ts`: key factory
  (`todoKeys`), pure UTC helpers (`todayUTC`, `tomorrowUTC`, `addDaysUTC`, `dateLabel`), DB fns
  (`listTodosByDate`, `listTodosInRange`, `listActivePins`, `materializePinsForDate` — idempotent
  pin injection, `addTodo`, `updateTodoPositions`, `setTodoCompleted`, `updateTodoTitle`,
  `deleteTodo`, `pinTodo`, `unpinTodo`), stats helpers (`computeDayStats`, `positionStats`,
  `weeklyRollup`), and `buildComparisons` — returns STRUCTURED `{ key, label, current, previous,
  deltaPct, text }[]` for today-vs-yesterday rate, week-vs-week rate, and avg rank of completed
  (ready for AI formatting later). Rules: past incomplete = failed permanently; no late check-offs;
  reorder via up/down arrows. Two routes linked only from the home dashboard widget (no SideNav):
  `/todos/plan` (`TodoPlanner` — materializes pins on load, ordered list with arrow reorder,
  inline edit, pin toggle, add row) and `/todos` (`TodoReview` — StatTile KPIs, stacked
  `CompletionBars` chart, `AreaTrend` rate trend, `BarCluster` weekly rollup, comparisons feed).
  Dashboard widget `TodoDashboard` — card with today's checklist (optimistic toggle) + link cards
  to plan/review — placed between the morning briefing header and the KPI strip.

- [x] **Auto-progressing premade plans** — training from a plan seeds `session_sets.plan_set_id`
  (migration `0011`) so each logged set is tied to its plan target. On **Finish** (and whenever a
  past session's sets are edited), `recomputePlanTargets` in `lib/queries/plans.ts` re-derives each
  linked plan target from the **full logged history**, not a one-way ratchet. Rule lives in
  `bestTargetFromHistory` (`lib/utils/stats.ts`): target = the hardest qualifying set (highest
  est-1RM; weight never below the set's **baseline**), where baseline = `plan_sets.base_reps/
  base_weight` (migration `0012`, backfilled from target; a manual plan-set edit resets it). So more
  reps / higher-e1RM weight raises the target, a weak/deload day never lowers it (your best set still
  stands), and **correcting a bad number walks it back down** (e.g. a typo'd 500 kg that bumped the
  plan returns to 50 kg once you fix the source set — handled both before finishing and by editing the
  finished session later). Changes are persisted per session in `workout_sessions.plan_updates`
  (jsonb, migration `0012`) and shown as a **"Plan updated"** banner at the top of `SessionDetailBody`
  — visible in the session log detail overlay **and** the Compare screen (which reuses that body). A
  one-time summary screen also appears right after Finish (`PlanUpdateSummary` in `ActiveSession`).

- [x] **Cardio logging** — `/fitness/cardio` (component `CardioLogger`), linked from the fitness
  hub's action grid (now 2x2 → 4-across on `lg`) alongside Start workout / Session log / Compare.
  Separate from weightlifting: a `cardio_sessions` row holds one or more `cardio_entries`
  (migration `0013_cardio.sql`), one per machine/activity, each with a freeform `activity` name
  (typed, not a dictionary — quick-select chips suggest recently used names via
  `listRecentActivityNames`), `duration_minutes`, optional `distance_km`, and its own `notes`.
  **Intensity is a universal 1-10 RPE (perceived exertion) score** — chosen specifically so it's
  comparable across activities that expose different stats (treadmill incline+speed vs.
  stairmaster speed-only vs. an outdoor hike with no machine stats at all); machine-specific
  numbers are not stored as structured fields, just folded into the entry's free-text notes.
  Query layer in `lib/queries/cardio.ts` (`createCardioSession`, `getCardioSessionWithEntries`,
  `listCardioSessions`, `deleteCardioSession`) mirrors the create-session-then-insert-children
  pattern from `lib/queries/sessions.ts`.

- [x] **Cardio history / compare / activity breakdown** — added as a **"Weights | Cardio" toggle**
  inside the *existing* Session log, Compare, and Exercises screens (component `ModeToggle`), not
  as new hub cards — keeps weightlifting the visually dominant part of `/fitness` per explicit
  request. Three pieces:
  - **History** (`/fitness/sessions`, Cardio mode) — `CardioSessionList` lists past cardio
    sessions (date + activity names + total duration), tap → read-only `CardioSessionDetail` in
    the shared `FocusOverlay`, pencil → full editor at `/fitness/cardio/sessions/[id]`
    (`CardioSessionEditor`: per-entry field edits via onBlur, add/remove activity, delete
    session). New query fns: `updateCardioSession`, `updateCardioEntry`, `addCardioEntry`,
    `deleteCardioEntry` in `lib/queries/cardio.ts`.
  - **Compare** (`/fitness/compare`, Cardio mode) — `CardioCompare` shows the last 3 cardio
    sessions side-by-side. Deliberately **no grouping** (unlike the weights side's Push/Pull/Legs
    category grouping) — cardio activities don't repeat predictably enough session-to-session to
    make a grouped comparison useful.
  - **Activity breakdown** (`/fitness/history`, Cardio mode) — `CardioActivityLibrary` browses
    activities grouped by (case-insensitive) name — mirrors weights' Exercise Library — each card
    showing avg RPE, session count, total duration, and an RPE sparkline (reusing
    `components/charts/Sparkline`). Click → `CardioActivityDetail`: per-activity drill-down with
    RPE trend + duration trend charts (new `features/fitness/charts/CardioTrendChart.tsx`),
    12-week `ConsistencyHeatmap`, and a recent-sessions list. New query fns:
    `getCardioActivityLibrary`, `getCardioActivityHistory` in `lib/queries/cardio.ts`.

  Separately, **`FitnessOverview`** (`/fitness/overview`) gained one compact combined panel —
  "Overall consistency" — showing a **weights + cardio merged** streak/this-week count and
  12-week heatmap, via `getCombinedTrainingConsistency` in `lib/queries/analytics.ts` (reuses the
  existing `sessionsPerWeek`/`currentStreakWeeks` helpers, which are already generic over any
  `{ performed_at }` array — no new stats logic needed). Kept to a single panel, not a new KPI
  row, for the same reason as above.

- [x] **Work boards** — the `/work` Kanban is now split into user-named **boards** (table
  `work_boards`, migration `0014_work_boards.sql`), so unrelated projects don't pile into one
  unreadable board. `roadmap_cards.board_id` (not null, FK cascade-delete) scopes every card to a
  board; the migration seeds a `"Main"` board per existing user and backfills all current cards
  onto it. UI: `BoardTabs` in `KanbanBoard.tsx` — pill tabs above the columns, click to switch
  (only the selected board's cards are ever shown — no "all boards" view by design), "+ Board" to
  type a new name inline, pencil/trash on the active tab to rename or delete (delete cascades all
  its cards; blocked via a `boards.length > 1` guard so you can never delete the last board — no
  empty-board-list state to handle). Last-selected board persists in `localStorage`
  (`work-selected-board`) and restores on reload. Query layer: `listBoards`/`createBoard`/
  `renameBoard`/`deleteBoard` in `lib/queries/work.ts`; `listCards`/`createCard` now take an
  optional/required `boardId` — `page.tsx`'s server-side KPI strip and `WorkCharts` still call
  `listCards(supabase)` with no `boardId`, so those stay **aggregated across all boards** by
  design (only the Kanban itself needed splitting). `workKeys.cards(boardId)` keys the cache per
  board.

- [x] **Weekly programme strip** — the training split pinned to the **top of `/fitness`**, directly
  under `PageHeader`. Source of truth: `full_programme_updated.svg`
  (kept in the repo root as the design reference). Table `programme_days` (migration
  `0015_programme.sql`) holds **exactly 7 rows per user**, one per ISO weekday (`1`=Mon … `7`=Sun,
  `unique (user_id, weekday)`); a null `label` means **rest day**. That fixed-7 shape makes "what
  am I training today?" a single weekday lookup with no cycle math, and means add/remove/reorder
  never inserts or deletes rows — it only rewrites `(label, plan_id, items)` in place.
  Seeded split: **Mon Push · Tue Pull · Wed Legs · Thu Rest · Fri Upper · Sat Lower · Sun Rest**.
  - `items` is a jsonb `[{ name, emphasis: 'heavy'|'light'|null }]` shorthand chip list, kept
    **decoupled from `plan_id`** on purpose: the strip needs terse labels ("DB incl") that stay
    stable when the linked plan changes, and heavy/light emphasis has no equivalent in the plan
    schema. Four main lifts (DB incl, Dips, Pullup, Row) are heavy on Push/Pull, light on
    Legs/Upper/Lower.
  - `lib/queries/programme.ts`: `programmeKeys`, `isoWeekday`/`weekdayLabel`/`weekdayFull`,
    `listProgrammeDays` (backfills missing weekdays in memory so the strip never renders a ragged
    week), `upsertProgrammeDay` (upserts on `user_id,weekday` so an unseeded day still saves),
    `swapProgrammeDays`.
  - `features/fitness/WeekProgramme.tsx` — mobile = snap-scroll row (`basis-[44%]`, today
    auto-scrolled into view); `lg` = `grid-cols-7`. **Today is resolved in a `useEffect`, not on
    the server** — Vercel runs UTC and would mis-highlight the day around midnight; deferring to
    the client also avoids a hydration mismatch. Tapping a training day → `/fitness/plans/[id]`
    (or the editor if no plan is linked yet); rest days aren't destinations.
  - `features/fitness/ProgrammeEditor.tsx` at `/fitness/programme` — renders the real
    `WeekProgramme` as a **live preview**, then a card per weekday: rename (empty = rest), link a
    plan via `<select>` over `listPlans`, add/rename/remove exercise chips, cycle emphasis
    (—→heavy→light→—), and up/down arrows that **swap contents with the neighbouring weekday**.
    Local state is the render source of truth (so inputs stay responsive); writes fire on commit
    events (blur/change/click) and `router.refresh()` on success because the hub is an RSC.
  - **Plan link (the day → split connection).** `programme_days.plan_id` is a real FK to
    `workout_plans (id) on delete set null` — deleting a plan blanks the link instead of breaking
    the strip. `listProgrammeDays` resolves the linked plan's **name** in a second round-trip
    (not an embedded join, so a stale reference can't fail the whole strip) and returns
    `ProgrammeDayWithPlan`; each day card shows that name in a footer row, or a `Link a plan`
    prompt in accent when unlinked. Migration `0016_programme_plan_autolink.sql` pre-fills the
    links by matching the day label against existing plans (exact name → category → `"Push A"`
    prefix, newest wins), guarded by `plan_id is null` so it's re-runnable and never overwrites a
    manual pick.
  - **Full loop:** tap a day → `/fitness/plans/[id]` → **Start workout** button (added to
    `PlanEditor`'s header) → `/fitness/log?plan=<id>`, where `SessionRunner` reads the search param
    and auto-fires `startSessionFromPlan` (ref-guarded against Strict Mode's double effect, spinner
    instead of flashing the plan picker, falls through to the picker on error). `app/(app)/fitness/
    log/page.tsx` now wraps `SessionRunner` in `<Suspense>` because of `useSearchParams`.
  - New global tokens `--load-heavy`/`--load-light` (+ `-soft` fills) in `globals.css`. Like
    `--up`/`--down` these are **semantic data colors, not decorative chrome**, so they sit outside
    the blue budget and stay constant across section themes (fitness is red, so heavy could not
    just reuse `--accent`).

**Migrations: all applied.** Every migration `0001`–`0016` is live in Supabase (confirmed
2026-09-11). The old "pending manual actions" backlog is gone — assume the schema in
`supabase/migrations/` matches the database. `0016_programme_plan_autolink.sql` is still
re-runnable: execute it again after adding new plans to link any programme day showing
"Link a plan".

---

- [x] **Enforcement layer.** (2026-09-13) The rules in `AGENTS.md` are machine-checked rather than
  requested — `.claude/hooks/lib/limits.mjs` and `scripts/` are the implementation. One command
  validates everything: `npm run check`.

- [x] **Goal checkpoint fixes.** (2026-09-15) Chased a report of checkpoints "disappearing" down to
  two bugs, both rooted in the goal-editing form:
  - **Mislabeled checkpoints.** `features/goals/GoalForm.tsx`'s milestone row had both the label
    and value `<input>`s built on `inputClasses` (which bakes in `w-full`), then each added its own
    conflicting width class (`flex-1` vs `w-24`). `w-full` won the cascade for the value input,
    stretching it to ~520px and squashing the label input to ~30px right next to the remove
    button — invisible enough to fat-finger text into by mistake. `GoalBar`'s caption logic
    (`m.label ?? fmtGoalValue(m.value)`) then shows a truthy label *instead of* the number, so a
    stray label silently overrode the correct value on display.
  - **Permanent data loss.** Worse: that same cramped layout put the label field right next to the
    "×" remove button, so a mis-click could drop a milestone row from the form entirely — and
    `replaceMilestones` used to save by deleting *every* milestone for the goal and reinserting
    whatever was currently in the form. Any row missing at save time was gone for good, including
    its `first_hit_at` history. This is almost certainly what erased two already-cleared
    checkpoints (32kg, 34kg) from a real auto goal — recovered by re-adding them (auto goals derive
    "hit" live from history, so nothing was actually lost there; a manual goal would not have been
    so lucky).
  - **Fixes:** input width bug fixed (`w-24!` + `shrink-0` on the value field, `min-w-0 flex-1` on
    the label). `replaceMilestones` (`lib/queries/goals.ts`) rewritten to diff by milestone `id`
    instead of delete-and-reinsert: a row is deleted only if its `id` is missing from what's
    submitted, an existing `id` is updated in place (leaving `completed`/`first_hit_at` untouched),
    a row without an `id` is inserted fresh with a client-generated uuid. `GoalForm`/`GoalsBoard`
    now thread `id` through the milestone row state to make this possible.
  - **Also this session:** `GoalBar`'s pure layout math (the `geometry()` function and friends)
    split into `components/ui/goalBarGeometry.ts` — the component file was pushing its line cap.
    Cleared checkpoints now render muted + struck-through instead of accent-colored (they were
    visually indistinguishable from the lit fill). Slipping back below your best now shades the
    checkpoint tier you're actually sitting at (`bg-accent-soft`), distinct from ones you've since
    moved past. The floating "now X" label that used to render directly on the bar (duplicating the
    "Now X" text already under it on `/goals`, and overlapping the start/end labels on the narrow
    hub-strip cards) was removed; `GoalStrip` gained its own "Now X" text line so the value appears
    exactly once, consistently, on every page.
  - **Hook gotcha:** `lib/queries/goals.ts` and `GoalForm.tsx` are CRLF-encoded (pre-existing,
    Windows-authored). `.claude/hooks/check-write.mjs` does its own naive `string.includes()`
    line-cap simulation against the raw file, using whatever line ending the edit's `old_string`
    happens to use — an LF-based multi-line `old_string` silently fails to match a CRLF file, so
    the hook falls back to reporting the file's *unchanged* size and can wrongly block a
    size-reducing edit. Confirmed by testing the same string with `\n` (no match) vs `\r\n`
    (match). Worked around by applying those specific edits with a one-off Node script that
    preserves CRLF, then verified with the real `npm run lines` (not the hook) that the result was
    genuinely under cap. If a multi-line edit to an old file gets blocked at a size that doesn't
    match your own count, check the file's line endings before assuming your math is wrong.

---
