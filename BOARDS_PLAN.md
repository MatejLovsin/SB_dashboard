# BOARDS — handoff plan (written 2026-09-27)

The working plan for finishing the Boards feature. `PROGRESS.md` points here. When a step
ships, move its summary to `PROGRESS_ARCHIVE.md` and delete it from this file. Delete the
whole file once step 4 ships.

---

## 0. What the feature is (agreed with the user, do not re-ask)

A whiteboard per project, n8n-like canvas, "lit instrument" styling.

| Decision | Answer |
|---|---|
| Shape | Hybrid: free placement (brainstorm) + optional **phases** (plan structure) |
| Boards | One per project, own top-level page `/boards` (own nav item, violet theme) |
| Node content | Title + **full markdown** note (read/write via `Markdown` / `MarkdownEditor`) |
| Lines | Only mean **"related"** — no arrows, no direction. Optional text label |
| Manual done | Yes — a node can be ticked done by hand (lit in the board accent) |
| Goal links | A node **or a phase** links to **one whole goal** (not a milestone). Goal achieved → lights up in goals amber, brighter than manual done. Needs a link that opens **that specific goal**, not just `/goals` |
| Board → work cards | **No.** Boards never create cards/tasks |
| Page links | A board lists at the foot of any of: Home, Fitness, School, Work, Goals. Nothing renders when no board is linked (keep Fitness clean) |
| Devices | Edit on desktop only. Phone: view + read notes + **quick-add a thought** |
| Images | Wanted, but deferred to the last step |

---

## 1. Step 1 — LIVE (applied + eyeballed 2026-09-28, committed)

### Files (all new unless marked)

| File | Role |
|---|---|
| `supabase/migrations/0021_boards.sql` | `boards`, `board_phases`, `board_nodes`, `board_edges`; RLS owner-only; `touch_board()` trigger bumps `boards.updated_at` on any child write |
| `lib/db/types.ts` *(edited)* | Table types + `BoardPage`, `BoardViewport`, `Board`, `BoardPhase`, `BoardNode`, `BoardEdge` aliases |
| `lib/queries/boards.ts` | `listBoards(client,{page?})` → `BoardSummary[]` (with node/done counts), `getBoard` → `BoardContents`, create/update/delete board, `createNode`, `updateNode`, `moveNodes`, `deleteNodes`, `createEdge`, `setEdgeLabel`, `deleteEdges`, `BOARD_PAGES`, `PAGE_LABEL` |
| `lib/hooks/useCanEdit.ts` | `useSyncExternalStore` on `(min-width:768px) and (pointer:fine)`; false on server |
| `app/(app)/boards/page.tsx` | RSC → `BoardsList` |
| `app/(app)/boards/[id]/page.tsx` | RSC → `getBoard` → `BoardEditor` (notFound if null) |
| `features/boards/BoardsList.tsx` | Header, "New board" overlay, `BoardRow` links |
| `features/boards/BoardForm.tsx` | Name, description, page-link chips, two-tap delete |
| `features/boards/BoardEditor.tsx` | Back link, title, settings overlay, `ReactFlowProvider` around the canvas |
| `features/boards/BoardCanvas.tsx` | `<ReactFlow>` + hint bar + node/edge overlays + `useViewportSaver` (debounced 800 ms, desktop only) |
| `features/boards/useBoardGraph.ts` | Flow state + all writes. Split into `useAttempt` / `useNodeOps` / `useEdgeOps` to satisfy the 80-line function rule. `attempt()` returns `{value}` or `null` (writes resolve to `undefined`, so never test the raw result) |
| `features/boards/IdeaNode.tsx` | Custom node: light dot + title + 2-line excerpt. One `Handle type="source"` laid **over the dot** |
| `features/boards/LightEdge.tsx` | Straight path + midpoint label via `EdgeLabelRenderer` |
| `features/boards/NodePanel.tsx` | Overlay body: edit form (desktop) or `Markdown` reading view (phone) |
| `features/boards/EdgePanel.tsx` | Label input + remove line |
| `features/boards/board.css` | All canvas styling. Imported from `BoardCanvas.tsx` with `@xyflow/react/dist/base.css` |
| `features/boards/BoardsFooter.tsx` | Async RSC; returns `null` with no linked boards. Added in `<Suspense fallback={null}>` at the end of `/`, `/fitness`, `/school`, `/work`, `/goals` *(those 5 pages edited)* |
| `components/layout/nav-items.ts` *(edited)* | `Boards` item (`Waypoints` icon), `'boards'` in `SectionTheme` |
| `app/themes.css` *(edited)* | `[data-theme='boards']` violet `167,139,250` |
| `package.json` *(edited)* | `@xyflow/react ^12.12.0` |

---

## 2. Step 2 — phases + goal links (next)

No migration needed: `board_phases` and the `goal_id` / `phase_id` columns already exist.

### 2a. Phases
- **Flow node type `phase`** (`features/boards/PhaseNode.tsx`): a pool of light, not a box —
  radial `rgba(var(--accent-rgb), .06)` wash, no border, uppercase `.label` title top-left.
  Use React Flow's `NodeResizer` (desktop only, `isVisible={selected}`) and save
  `width/height` on resize end (`onResizeEnd`).
- **Ordering rule:** React Flow requires **parents before children** in the `nodes` array.
  Build the array as `[...phases.map(toPhaseNode), ...ideas.map(toFlowNode)]`. Phase nodes get
  `zIndex: -1`, `style: { width, height }`, `dragHandle: '.phase-title'` so dragging inside the
  pool does not move the whole phase.
- An idea in a phase: `parentId: phase_id`, position is **relative** (that's what's stored).
  Do **not** set `extent: 'parent'` — ideas must be able to leave a phase.
- **Reparenting on drop** (`onNodeDragStop`): for each dragged idea, find the phase whose
  absolute rect contains the idea's absolute position (`useReactFlow().getInternalNode(id)
  .internals.positionAbsolute`). If it changed, convert the position (absolute − phase origin,
  or back to absolute when leaving) and write `{ phase_id, x, y }`. Extend `moveNodes` to
  accept an optional `phase_id`, or add a `reparentNode` query.
- **Create**: a "+ Phase" button next to "+ Idea" (desktop), placed at viewport centre, default
  480×320, opens a small title form. Double-click the phase title to rename / delete.
- **Delete phase**: first rewrite its children to absolute positions with `phase_id = null`,
  then delete the row (the FK is `on delete set null`, but positions would be left relative).
- Add queries to `lib/queries/boards.ts`: `createPhase`, `updatePhase`, `deletePhase`.
  `boards.ts` is ~180 lines. If it approaches 300, move phases into `lib/queries/boardPhases.ts`.
- `useBoardGraph.ts` is exactly 200 lines. Put phase ops in a new `usePhaseOps.ts` rather than
  growing it. The node union type becomes `IdeaFlowNode | PhaseFlowNode`.

### 2b. Goal links
- **Data**: in `app/(app)/boards/[id]/page.tsx`, also call
  `listResolvedGoals(supabase, {})`. Passing `{}` means **all statuses**. The default arg is
  `{status:'active'}`. Pass two things down:
  - `goalOptions`: active goals `{id, title, section}` for the picker
  - `goalStates: Record<goalId, { title, percent, achieved }>` for linked goals, with
    `achieved = r.achieved || r.goal.status === 'achieved'`.

  This is one call with a shared memo, which is cheaper than `getResolvedGoal` per link.
- **Picker**: in `NodePanel` (and the phase form), a "Linked goal" `<select>` grouped by section,
  plus "None". Save via `updateNode({ goal_id })` / `updatePhase`. After linking, call
  `router.refresh()` so `goalStates` includes the newly linked goal (flow state is initialised
  once, so also patch the node's `data.goalId` locally).
- **Node visuals** (add to `IdeaData`: `goalId`, and look up `goalStates[goalId]` at render
  through a small React context, `GoalStatesContext`, so node data stays serialisable):
  - in progress: a 2 px amber bar under the title, width = `percent`%.
  - achieved: `data-goal="achieved"` → light filled amber with a stronger glow, title amber-tinted.
    Must read **brighter than manual done**. Lines touching an achieved node take the amber too
    (pass `achieved` via edge `className` computed in `useBoardGraph`).
  - Define `--goal-rgb: 245, 158, 11` in `board.css` under `.board-canvas`. It is the goals
    theme triplet; comment that it mirrors `[data-theme='goals']` in `app/themes.css`. Do not
    hardcode hex in TSX (ESLint blocks it).
  - Phase achieved → the whole pool glows amber.
- **"Open goal" link**: in `NodePanel` (both reading and editing views), show the goal title
  and percent, and a link to `/goals?goal=<id>`.
- **Deep link on `/goals`**: `app/(app)/goals/page.tsx` takes
  `searchParams: Promise<{ goal?: string }>` (Next 16: async). Pass `initialGoalId` to
  `GoalsBoard` and initialise `viewing` with
  `useState(initialGoalId ? { id: initialGoalId, open: true } : null)`. The overlay already
  finds the goal in `active` or `achieved`. `GoalsBoard.tsx` is 224 lines, so there is room.
  Optionally `router.replace('/goals')` on close so a refresh does not reopen it.
- Optional reverse link: in `GoalDetail`, "On board: X". Needs a query of `board_nodes` /
  `board_phases` by `goal_id` (partial indexes exist). Nice to have, not agreed. Ask first.

---

## 3. Step 3 — phone quick-add + Unsorted tray

No migration: `board_nodes.unsorted` exists and `useBoardGraph` already filters unsorted
rows off the canvas.

- **Phone "+ Thought"**, shown only when `!canEdit`:
  - on `/boards/[id]`: in the hint bar. It adds to this board.
  - on `/boards`: a button next to "New board" that opens a form with a board `<select>`
    (most recent first) + a textarea. The first line becomes the title, the rest becomes `body`.

  Insert with `createNode({ board_id, title, unsorted: true })` (extend its input type with
  `body`). Keep it a single field and one tap. It must be fast with a thumb.
- **Desktop tray**: when a board has unsorted nodes, the hint bar shows `Unsorted · N`.
  Clicking it opens a small floating list (`.floating-panel`, per `DESIGN_GUIDE.md`). Each row
  has **Place**, which calls `updateNode({ unsorted:false, x, y })` at the viewport centre and
  adds it to flow state. Drag-from-tray (HTML5 drag → `onDrop` on the wrapper →
  `screenToFlowPosition`) is a later nicety. Start with click-to-place.
- `getBoard` already returns unsorted rows. Pass them separately from `useBoardGraph`.
- `listBoards` counts include unsorted nodes. Decide whether the row shows "· N unsorted".

---

## 4. Step 4 — images on ideas

Needs **migration `0022`** + `lib/db/types.ts` in the same commit (the pre-commit hook enforces
this).

- Column: `board_nodes.image_path text` (storage object path, not a URL).
- Storage: private bucket `board-images`, created in the migration
  (`insert into storage.buckets (id, name, public) values ('board-images','board-images',false)`).
  Add `storage.objects` policies for select/insert/delete where
  `bucket_id = 'board-images' and (storage.foldername(name))[1] = auth.uid()::text`.
  Object path: `<user_id>/<board_id>/<node_id>-<timestamp>.<ext>`.
- Upload from the browser client (`supabase.storage.from('board-images').upload`). First
  downscale to ~1600 px max edge / JPEG ~0.85 via a canvas, to keep storage and load small.
- Display with signed URLs: `createSignedUrls(paths, 3600)`, batched once per board load, in the
  RSC page, passed down as `Record<nodeId, url>`.
- UI: an "Image" field in `NodePanel` (desktop), a thumbnail above the title on the canvas
  (max ~200 px wide, no frame), and full size in the reading view. Delete the object when the
  image is replaced or the node is deleted (best effort; log with `console.error`).
- Check whether the user wants to paste images (clipboard) — likely yes on desktop.

---

## 5. Also still open (small)

- `DESIGN_GUIDE.md` is at its 321-line baseline and **cannot grow**. To record the board
  patterns (idea = light + words, line = trace, phase = pool), shrink something first or put
  them in `board.css`'s header comment (already partly there).
- The Boards nav item makes the phone bottom bar 6 tabs. Check it at 360 px width. If it's
  cramped, consider dropping labels or moving Boards into Home.
- Keyboard delete has no confirm (standard canvas behaviour). Revisit only if the user asks.

## 6. Rules that bite on this feature

- 300-line file cap, 80-line functions, no hex in TSX, no `any` / `!` / `console.log`. Run
  `npm run check`, then `npm run build` (the canvas touches rendering).
- React Flow custom-node/edge maps must stay **module-level constants** (see `BoardCanvas.tsx`).
- Never edit `0021_boards.sql` once the user has applied it. Every schema change goes in a
  new numbered migration.
- `FocusOverlay` portals to `document.body`. React Flow's delete key ignores inputs, so typing
  in an overlay is safe.
