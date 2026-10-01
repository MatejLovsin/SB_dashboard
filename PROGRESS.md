# PROGRESS — read this first, every session

**How this file works.** It holds only what is *active*: the next step, and the threads that are
genuinely open. Anything shipped moves to `PROGRESS_ARCHIVE.md` the moment it is done — that file
is the record of what exists and why it is shaped that way, and you should open it only when you
need the history. This file is capped at 140 lines by `npm run lines`; when it grows past that,
that is the signal to archive, not to raise the cap.

---

## ▶ NEXT STEP

**Page-load speed: continue here next session.** Done on 2026-10-01: the board loads only
the goals it links to, goal progress needs 2 waits in a row instead of 4, and the login check is
local (see Open threads → Boards follow-ups). Two steps were agreed and are still to do:
1. **Section pages stop waiting for goals.** `/fitness`, `/school` and `/work` await
   `listResolvedGoals` in their `Promise.all`, so the whole page waits for the goal strip. Load the
   `GoalStrip` separately (an async server component inside `<Suspense>`). The catch: the strip
   sits above the KPI tiles, so the fallback must hold its space, or the tiles jump down when it
   arrives.
2. **Load less history as it grows.** The resolvers in `lib/queries/goals.ts` read all
   `workout_sessions`, all `session_sets` for an exercise, all cardio, exams and so on, with no
   limit, so each load grows over time. Supabase also caps a query at 1,000 rows by default,
   which would silently cut off long histories. Look at selecting less, using a DB view or RPC,
   or paging past 1,000.

**Boards — SHIPPED (2026-09-28).** All four steps are live (canvas, phases + goal links,
phone quick-add, images); `0021` and `0022` are applied. The summary and gotchas are in
`PROGRESS_ARCHIVE.md`. Small follow-ups are under Open threads → Boards.

**Heavy / light emphasis on est-1RM trends — SHIPPED (2026-09-22).** Migrations `0019` and `0020`
are both applied and the split is live. Light days are their own series; heavy and unclassified
days share the main line. `lib/utils/emphasis.ts` is the one rule every screen reads it through,
which also corrected `isStalled`, the hub sparkline delta and the `exercise_*` goal metrics.
`PROGRESS_ARCHIVE.md` has where the two columns live and why.

**Still to eyeball:** the two lines on `/fitness/exercise/[id]` at phone width — that the legend
does not crowd and that the dimmer light line still reads. Worth a second look at the stalled list
on `/fitness` too, now that light days no longer count as failed heavy ones.

Carried over from the loading screens (shipped, archived): visit `/goals`, then `/fitness`,
`/school`, `/work` and confirm the right section's goal appears over a readable ghost, that a fast
navigation shows nothing rather than a flash, and the goal detail overlay at phone width plus
ticking a manual step from inside it (outstanding since 2026-09-15).

The nearest product gap is **goal check-ins have a backend but no UI** — `goal_checkins`,
`addCheckin` and `listCheckins` are built and tested, but nothing in `GoalForm` logs one, so a
manual *numeric* goal can only move its bar by ticking milestones.

---

## Open threads

### Needs eyes on real data
- **Exam retakes are not yet exercised against live rows.** Link one real retake on
  `/school/exams` and confirm the subject average and any grade goal move as expected.
- **Markdown long-form surfaces have never been eyeballed in a browser** (journal, work notes,
  study session notes). Typecheck and build are clean; the rendering is unverified.
- **`workout_streak_weeks` is the one goal metric synthesised week-by-week** rather than read
  from rows, so it is the likeliest to be subtly wrong. Unchecked against real data.
- **Only `exercise_best_weight` was exercised end-to-end** of the 21 goal metric kinds. The
  school and work ones deserve a sanity check the first time a goal binds to them.

### Boards follow-ups (small)
- **Board load speed-up (2026-10-01, uncommitted, not yet seen in a browser).** `/boards/[id]` now
  resolves only the goals the board links to (`lib/queries/boardGoals.ts`), streams them in
  (`useBoardGoals`) instead of holding the canvas back, signs images right after the board
  loads, and has its own `loading.tsx`. Check: a linked goal still glows, an achieved one lights
  its lines, and linking a new goal in the panel shows its status without a reload.
- **Auth check is local (2026-10-01, uncommitted).** `lib/supabase/middleware.ts` and
  `app/(app)/layout.tsx` now use `getClaims()`. The project signs with ES256, so the JWT is
  verified locally, removing **two** Auth round trips from every page (the layout also called
  `getUser()`). The signed-out redirect is checked and works. Still to check: signed-in pages load,
  and the session still refreshes after an hour idle.
- **Goal resolution speed-up (2026-10-01, uncommitted).** In `lib/queries/goals.ts`: goals and
  milestones load together, sets and lift sessions load together, cardio entries and dates
  load together, and all check-ins come in one query. That's 2 waits in a row instead of 4.
  `/goals` resolves active and achieved in one pass. Check that the goal numbers on `/goals`
  and the section strips match what they showed before.
- The phone bottom bar is now 6 tabs. Fine at 400 px; unchecked at 360 px.
- Board patterns (idea = light + words, line = trace, phase = pool) are recorded only in
  `board.css` / `phase.css` headers — `DESIGN_GUIDE.md` is at its baseline and cannot grow.
- Not yet eyeballed: an idea linked to an *achieved* goal, and an image in the phone reading
  view. Optional, never agreed: an "On board: X" link back from `GoalDetail`.

### Design work left from the "lit instrument" language
`DESIGN_GUIDE.md` is the spec; these are the places the app has not caught up to it.
- Section *order* is now a visual decision (the first section gets the light). No page has been
  re-ordered for it.
- Solid `bg-accent` action cards (e.g. "Start workout" on `/fitness`) are still solid blocks from
  the old language. The mockup used a soft accent wash with accent text.
- Nested `bg-card-2` chips, kanban cards and form fields still carry faint fills. The kanban
  wants the mockup's 2px priority-tick treatment.
- No hub has picked its `lead` metric yet (`<StatTile lead />` → `.emissive`).

### Open questions (his call)
- **Weekly programme light days are asymmetric** — `DB incl` and `Pullup` are light on *both*
  Legs and Lower, while `Dips` and `Row` are light only on Upper. This follows
  `full_programme_updated.svg` literally; unconfirmed whether the diagram is right or Lower was
  meant to mirror Upper. Fixable without a migration at `/fitness/programme`.
- Whether the work section's graphite accent makes a work goal's bar read as *disabled* rather
  than *progressing* — now only on the `/work` hub strip, since `/goals` is amber throughout.
- Grades are percentages with a pass at 50, both hardcoded in `lib/utils/grades.ts`. If a subject
  ever grades on another scale, this becomes a setting.
- There is no "show superseded attempts" filter on the past-exams tab — every sitting is listed.

### Known dead weight
- The `ai_summaries` table and its `lib/db/types.ts` entry are still there after the AI summary
  feature was removed. No migration was written. Drop them if you want the schema clean.
- `supabase/migrations/0016_programme_plan_autolink.sql` is **re-runnable**: execute it again
  after adding new plans to link any programme day still showing "Link a plan".
- `supabase/migrations/0020_backfill_lift_emphasis.sql` is **re-runnable** for the same reason:
  run it again after setting heavy/light on more plan lines.

---

## State of the schema

**Migrations `0001`–`0022` are all applied.** Assume `supabase/migrations/` matches the live
database. A new migration must ship with a matching `lib/db/types.ts` change — the pre-commit
hook refuses the commit otherwise, because those types are hand-maintained.

---

## Validate any change

```
npm run check      # lines + lint + types + tests, in that order
npm run build      # only when you have touched rendering or config
```

`npm run check` is also what the pre-commit hook runs. If it fails on something you did not
cause, say so rather than raising a baseline to make it pass.
