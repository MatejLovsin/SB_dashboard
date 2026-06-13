# REDESIGN reference — R4 / R5 / R6

Read this at the start of every redesign session. Full plan (context/rationale) at
`C:\Users\matej\.claude\plans\use-this-image-as-temporal-blanket.md` — only open if stuck.

---

## Design contract (never deviate)

**Tokens** (CSS vars, already in `globals.css`):
`--background #080b14` · `--surface #0d1322` · `--card #111a2e` · `--card-2 #16213a`
`--border #1e2a44` · `--foreground #e8edf7` · `--muted #7d8aa6`
`--accent #3b82f6` · `--accent-soft rgba(59,130,246,0.12)`
`--chart-1..6` (light→dark blue scale) · `--up #4ade80` · `--down #f87171`

**Typography:** big KPIs → `text-3xl/4xl font-bold tracking-tight nums`. Labels → `text-xs font-medium uppercase tracking-widest text-muted`.

**Surfaces:** all cards use `.panel` class (already on `Card`). Charts: horizontal gridlines at `--border` low-opacity, no axis lines, `--muted` ticks.

**Charts:** area/line = `--accent` stroke + `linearGradient` fill (`--chart-4` 35% → transparent). Bars = `--accent`, `radius={[4,4,0,0]}`, graded blue scale for categorical. Donut track = `--border`, arc = `--accent`. Tooltips = `bg-surface border-border` rounded small.

---

## Shared kit (already built — reuse, don't rebuild)

| Import | Usage |
|--------|-------|
| `@/components/ui/StatTile` | KPI tile: `label`, `value`, `unit`, `delta?`, `children?` (sparkline slot) |
| `@/components/charts/ChartCard` | Panel wrapper with title + chart body |
| `@/components/charts/Sparkline` | Tiny inline area, `data: number[]`, `height?` |
| `@/components/charts/AreaTrend` | Hero gradient area chart, `series` prop |
| `@/components/charts/DonutStat` | Donut + center value |
| `@/components/charts/BarCluster` | Vertical bars, single or multi-series |
| `@/lib/utils/chartTheme` | `useChartTheme()` → `{ accent, muted, border, scale[] }` |
| `@/lib/utils/stats` | `mondayOf`, `deltaPercent`, `sessionsPerWeek`, `weeklyVolumeSeries`, etc. |

**Gotcha:** `dynamic(..., { ssr: false })` is forbidden in Server Components (Next 16 Turbopack). Put `dynamic` calls inside `'use client'` files only.

---

## R4 — School

**Page:** `app/(app)/school/` and sub-pages (`/subjects`, `/exams`, `/subjects/[id]`).

**KPI strip** (top of `/school`): StatTiles for — study hours this week + delta, upcoming exams count, longest study streak (days or sessions).

**Charts to add:**
- `DonutStat` — study hours per subject (from `study_sessions` joined to `subjects`)
- `AreaTrend` — weekly study hours (replace/extend existing `StudySessionsChart`)
- `BarCluster` — actual vs target study hours per exam (from `study_sessions` + `exams.target_study_hours`)

**Subject detail** `/subjects/[id]`: `AreaTrend` of study time over weeks for that subject.

**Restyle:** `ExamList`, `SubjectList`, `StudyTimer` — navy tokens, accent icons, consistent `.panel` cards.

**Queries to reuse:** `listSubjects`, `listExams`, `getStudySecondsForExams`, `listUpcomingExamsWithProgress` (all in `lib/queries/school.ts`). Add small aggregation helpers as needed (e.g. weekly hours per subject).

---

## R5 — Work

**Page:** `app/(app)/work/` and `/work/notes`.

**Replace 3 placeholder panels with:**
- `DonutStat` — cards by status (from `roadmap_cards.status`)
- `BarCluster` — cards by priority
- `AreaTrend` — notes per week (from `notes.entry_date`)

**New light tracking:** add `work_metrics` table (`date date`, `value numeric`, `label text`) + migration + `lib/db/types.ts` update + quick-log input + `AreaTrend` hero metric. Confirm exact metric label with user before building (or default to "focus score").

**Restyle:** `KanbanBoard` (navy columns, blue status accents), `NoteList`.

**Queries to reuse:** `listCards`, `listNotes` (all in `lib/queries/work.ts`).

---

## R6 — Polish & consistency

- Staggered page-load reveals: CSS `animation-delay` on cards (no JS needed).
- Hover/active micro-interactions on interactive elements.
- Mobile audit: Fitness primary — charts legible, tap targets ≥ 44 px.
- Empty/loading states on every new chart (show skeleton or `EmptyState`).
- Cross-section sweep: spacing scale, card heights, label casing consistency.
- Run `/web-design-guidelines` review at end.
