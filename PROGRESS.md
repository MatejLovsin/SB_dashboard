# PROGRESS — read this first, every session

Full session history and gotchas live in `PROGRESS_ARCHIVE.md` — only open it when explicitly asked about something from a previous session.

---

## ▶ NEXT STEP

**Build (S1–S9) complete. Running multi-session VISUAL REDESIGN** — dark-only navy+blue analytics aesthetic.
Read `REDESIGN.md` next (design contract + remaining session specs). Benchmark: `design idea.jpg`.

- R1 Foundation — DONE
- R2 Fitness showcase — DONE
- R3 Home dashboard — DONE
- R4 School — DONE (StatTile KPI strip, AreaTrend weekly hours, DonutStat per subject, BarCluster per exam, subject detail AreaTrend)
- R5 Work — DONE (StatTile KPI strip, DonutStat cards-by-status, BarCluster cards-by-priority, AreaTrend notes-per-week + focus score, WorkMetricLogger, restyle KanbanBoard + NoteList, migration 0005_work_metrics.sql)
- R6 Polish & consistency — DONE (fade-up stagger animation on KPI grids, `.panel-hover` micro-interactions on link cards, empty states in AreaTrend + BarCluster, spacing normalized to `space-y-6` across all pages)

**All R1–R6 complete. Redesign done.**

---

## ▶ ACTIVE: Density pass — side-by-side tiles + whole-square click targets

**📐 Design rules live in `DESIGN_GUIDE.md` — read it before touching any page's layout.**
It is the living, append-only manual; new approved feature patterns get added there.

Goal: pack more side-by-side elements on **both desktop and phone**, and remove
full-width rows whose content has no striking visual value at first glance. Every card
with a destination must be clickable AND highlight on hover (`panel-hover`) AND show a
pointer cursor — identical across the whole app (see DESIGN_GUIDE §1, patterns A & B).

Per-page rollout (details + checklist in `DESIGN_GUIDE.md §5`):
- [x] Fitness — Start workout + Session log paired into 2-col fully-clickable tiles
- [x] Fitness — Overview + Exercise history = Pattern A (whole-card `<Link>` + `panel-hover`)
- [x] Fitness — Plans = Pattern B (nested per-plan links → `panel-hover cursor-pointer` on Card)
- [ ] Home dashboard — audit every card
- [ ] School — audit every card
- [ ] Work — audit every card

### Fitness features shipped (patterns logged in DESIGN_GUIDE → Approved feature patterns)
- [x] **Pinned lifts** — `exercises.pinned` flag (migration `0006`); squat+bench seeded.
  Fitness hub Exercise-history card shows side-by-side est-1RM sparklines for pinned lifts
  (`PinnedLifts` + `charts/MiniTrendChart`, server-computed via `getPinnedLiftTrends`).
- [x] **Rename / pin exercises** — `/fitness/exercises` Manage screen (`ExerciseManager`):
  inline rename (`renameExercise`) + pin toggle (`setExercisePinned`). Reached via a
  **Manage** pill next to the Exercise-history page header. Rename is a single `UPDATE name`
  and propagates everywhere (all rows reference `exercise_id`).

**Pending manual actions:** apply migration `0006_exercise_pins.sql` to Supabase
(`supabase db push` / SQL editor). Until applied, the pinned section degrades gracefully
(empty) — the page already catches the missing-column error.

---

## Validate any change
```
npx tsc --noEmit
npm run build
```
