# DESIGN GUIDE — keep every page consistent

This is the **living instruction manual** for applying the dashboard's design language
consistently across **Fitness, Home, School, Work**. The Fitness page is the reference
implementation — when in doubt, match it.

> As we add features and approve them, each approved pattern gets appended here so the
> other pages can be brought in line without re-deciding anything. Treat the rules below
> as binding; only deviate with an explicit reason noted in `PROGRESS.md`.

---

## 1. Cards / "squares" — clickability, hover, cursor

Every card that represents a destination MUST read as interactive and behave identically
across the app. There are exactly **two allowed patterns**:

### Pattern A — whole-card link (default, preferred)
Use when the card body has **no** nested links/buttons.
```tsx
<Link href="/destination" className="block">
  <Card className="panel-hover">
    {/* title row + preview body */}
  </Card>
</Link>
```
- The entire square is clickable.
- `panel-hover` gives the border/background highlight on hover + press scale.
- The `<Link>` (`<a>`) supplies the pointer cursor natively.
- The inner title is a plain `<div>`, **not** another `<Link>`.

### Pattern B — card with nested links (when body rows are their own links)
Use when the body renders per-item `<Link>` rows (nested anchors are invalid HTML, so the
whole card can't be one link).
```tsx
<Card className="panel-hover cursor-pointer">
  <Link href="/destination" className="...title row...">…</Link>
  {/* body with its own per-row <Link>s */}
</Card>
```
- Add **both** `panel-hover` (hover highlight) **and** `cursor-pointer` (the card isn't an
  `<a>`, so the cursor must be set explicitly) so it matches Pattern A visually.
- Note in `PROGRESS.md` that this card is Pattern B and why.

**Rule of thumb:** if a card highlights on hover in one place, it must highlight the same
way everywhere. No card with a destination should be missing `panel-hover`, and none
should be missing a pointer cursor.

## 2. Density — favor side-by-side over full-width

- Rows whose content has **no striking visual value at first glance** (plain action rows:
  icon + title + subtitle) must NOT span the full width alone. Pair them into
  `grid grid-cols-2 gap-4` tiles — side by side on **both phone and desktop**.
- Tiles in a pair use a **vertical** layout (icon badge on top, then title + subtitle) and
  `h-full` so both tiles match height.
- Cards that show real previews/charts (Overview, Exercise history) may stay full width.

## 3. Tokens & utilities (don't hardcode)

- Surfaces: `panel` (via `<Card>`), hover via `panel-hover`.
- Accent: `bg-accent` / `text-accent`; soft accent fill via `style={{ background: 'var(--accent-soft)' }}`.
- Muted text: `text-muted`. Borders: `border-border`. Page bg: `bg-background`.
- Icon badge: rounded-xl square, `h-10 w-10` (tile) or smaller inline, accent-soft bg.
- Affordance chevron: `<ChevronRight className="h-4 w-4 text-muted" />` (or `text-white/80` on accent).

## 4. Spacing & rhythm

- Page wrapper: vertical stack with consistent gap (`space-y-4`/`space-y-6` — match the
  page you're editing; don't mix within one page).
- `PageHeader` at the top of every page, then the AI `SummaryCard` where applicable.

## 5. Per-page rollout checklist

Apply §1–§4 to each page; tick in `PROGRESS.md`:
- [x] **Fitness** — reference implementation (all cards Pattern A except Plans = Pattern B).
- [ ] **Home dashboard**
- [ ] **School**
- [ ] **Work**

---

## Approved feature patterns (append-only)

_New design decisions land here as features get approved. Each entry: what it is, the
exact markup/util to reuse, and which pages it applies to._

### Pinned highlights on a hub's preview card
**What:** a hub's "see more" card surfaces 1–N pinned items as side-by-side mini tiles with
a sparkline + headline number + up/down delta, instead of only a flat list.
**Reuse:** `getPinnedLiftTrends` pattern (server-compute the series → pass numbers, not raw
rows, to the client) · `features/fitness/PinnedLifts.tsx` (grid `grid-cols-2`, tiles are
`rounded-xl border border-border bg-background p-3`, display-only so the parent stays one
`<Link>`) · `features/fitness/charts/MiniTrendChart.tsx` (axis-free recharts sparkline,
`dynamic(ssr:false)`, `isAnimationActive={false}`). Delta colors: `text-emerald-500` up /
`text-red-400` down.
**Applies to:** any hub with a per-entity history → School (pinned subjects), Work (pinned
boards/metrics). Add a `pinned boolean default false` column + a partial index per table.

### "Pinnable" + "renamable" entities (generic admin)
**What:** entities stored as `(id, name, …, pinned)` rows. Pin toggles a highlight; rename is
a single `UPDATE name` that propagates everywhere because everything references the `id`.
**Reuse:** `renameExercise` / `setExercisePinned` / `listExercises` (pinned-first ordering)
in `lib/queries/fitness.ts` · a dedicated **Manage** screen (`/fitness/exercises`,
`features/fitness/ExerciseManager.tsx`): one-row-per-entity list, inline pencil→input→check
rename, Pin/PinOff toggle, invalidate the `…exercisesAll()` key on mutate. Reach it via a
`border border-border bg-card` **Manage** pill (with `Settings2` icon) next to the page
header.
**Applies to:** School subjects, Work boards — same row UI, swap the query module.
