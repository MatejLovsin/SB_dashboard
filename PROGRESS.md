# PROGRESS — read this first, every session

Full session history and gotchas live in `PROGRESS_ARCHIVE.md` — only open it when explicitly asked about something from a previous session.

---

## ▶ NEXT STEP

**All redesign plans complete and deleted.** `redesign-plans/` folder removed.

**Full visual redesign pipeline DONE:**
- R1–R6: dark analytics aesthetic (foundation, fitness, home, school, work, polish)
- Plan 01: slim persistent sidebar (`w-52 h-dvh`), wider content (`max-w-6xl`), blue diet (neutral hovers)
- Plan 02: density + motion system — bento instrument panels, CountUp KPIs, ChartReveal hero charts, chartAnim bars/areas, press-flash feedback, accent bar in SideNav
- Plan 03: per-section color themes (Home=indigo, Fitness=red, School=teal, Work=graphite)
  via `[data-theme]` blocks in `globals.css` + `AppShell` wiring off the route; shared
  neutral chrome repainted from navy-tinted to true neutral so it stops clashing with
  section accents; one ambient `.section-glow` wash pinned to the top of the viewport
  (auto-colored per theme) — a second per-element hero glow was tried and removed.

**Design rules live in `DESIGN_GUIDE.md`.**

No active redesign tasks. Next work: new features or content updates.

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

**Pending manual actions:** apply migrations `0006_exercise_pins.sql`, `0009_journal_weeks.sql`,
`0010_todos.sql`, `0011_session_set_plan_link.sql`, **and `0012_plan_progress.sql`** to Supabase
(`supabase db push` / SQL editor). Until `0012` is applied, plan auto-progression degrades (the
new `base_*` / `plan_updates` columns are missing, so queries error and no banner shows). Until
`0010` is applied, the todo widget/review degrade gracefully (queries catch errors → empty state).
Until `0009` is applied, the journal widget + review degrade gracefully to a "no summaries /
caught up" state.

---

## Validate any change
```
npx tsc --noEmit
npm run build
```
