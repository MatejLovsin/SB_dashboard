# PROGRESS — read this first, every session

**How this file works.** It holds only what is *active*: the next step, and the threads that are
genuinely open. Anything shipped moves to `PROGRESS_ARCHIVE.md` the moment it is done — that file
is the record of what exists and why it is shaped that way, and you should open it only when you
need the history. This file is capped at 140 lines by `npm run lines`; when it grows past that,
that is the signal to archive, not to raise the cap.

---

## ▶ NEXT STEP

**Loading screens now show a real goal — SHIPPED (2026-09-22).** Every `loading.tsx` under
`app/(app)/` centres one active goal on screen — its name, its percent counting up, and a lit rule
that draws out to its progress and then keeps reaching past it with a chase of ticks — over a
page-shaped skeleton dimmed to a ghost. Not the `/goals` card and not
`GoalBar`; see `LoadingScreen.tsx`. The data is a `localStorage` breadcrumb the goals surfaces
leave behind (`lib/utils/goalSnapshot.ts`), because a Suspense fallback cannot fetch.
`PROGRESS_ARCHIVE.md` has the two React gotchas and the choices behind it.
**Still to eyeball:** visit `/goals` once, then navigate to `/fitness`, `/school`, `/work` and
confirm the right section's goal appears, centred, with the ghost readable but not busy and the
chase reading as "working" rather than as noise; check
that a fast navigation shows nothing at all rather than a flash; and the goal detail overlay at
phone width, plus ticking a manual step from inside it (outstanding since 2026-09-15).

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

---

## State of the schema

**Migrations `0001`–`0018` are all applied.** Assume `supabase/migrations/` matches the live
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
