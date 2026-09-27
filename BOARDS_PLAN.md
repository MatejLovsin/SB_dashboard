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

## 2. Step 2 — phases + goal links: LIVE (approved + committed 2026-09-28)

`npm run check` + `npm run build` pass. Exercised in the browser on a throwaway board (since
deleted): add phase, link a goal (amber trace shows), double-click inside the pool adds an idea
*into* the phase, dragging the phase carries its ideas, dragging an idea out unparents it, all
persisted across reload; `/goals?goal=<id>` opens that goal's overlay.

| File | Role |
|---|---|
| `features/boards/boardFlow.ts` | Flow types (`IdeaFlowNode \| PhaseFlowNode`), converters, `orderNodes` (phases first), and the pure membership rule: `phaseAt`, `placeIdea`, `settleIdeas` |
| `features/boards/usePhaseOps.ts` | `useMembership` (drag stop, resize end → `settleIdeas` + writes) and `usePhaseCrud` (add/save/remove) |
| `features/boards/boardContext.tsx` | `BoardGoals` `{states, options}`, `canEdit`, `resizePhase` for custom nodes |
| `features/boards/goalLinks.tsx` | `GoalTrace`, `GoalLinkField` (select by section), `GoalLinkStatus` (→ `/goals?goal=`) |
| `features/boards/PhaseNode.tsx` · `PhasePanel.tsx` · `phase.css` | The pool, its settings, its styling |
| `features/boards/CanvasOverlays.tsx` · `CanvasHint.tsx` | Split out of `BoardCanvas.tsx` |
| `lib/queries/boardPhases.ts` | `createPhase`, `updatePhase`, `deletePhase` (children → absolute first) |
| `lib/queries/boards.ts` | `moveNodes` accepts `phase_id`; `createNode` accepts `phase_id` |
| `components/ui/FocusOverlay.tsx` | Renders nothing on the server — an overlay open on first render crashed SSR (`document is not defined`) |

Rules as built: membership is **geometry** — after any drop, resize or new phase, each idea
belongs to the smallest phase containing its light. A phase's pool is `pointer-events:none`;
only its title (drag handle / double-click to edit) and resize grips catch the pointer.
Phases are `deletable:false` (React Flow would delete children with a parent) — delete from
the phase panel, which keeps the ideas. The board page resolves **all** goals once;
`states` covers every goal, `options` only active ones, so linking needs no refresh.

### Step 2 eyeball (user)
- [ ] Resize a phase from its **top-left** grip, reload → ideas stayed put on screen.
- [ ] Link an idea to an **achieved** goal → amber light brighter than done; its lines amber.
- [ ] Phone width: tap a phase title → read view; tap "open goal" link → lands on that goal.
- [ ] The pool's soft edge reads as light, not as a box. Tune `phase.css` if not.

Not done (optional, ask first): the reverse "On board: X" link inside `GoalDetail`.

---

## 3. Step 3 — phone quick-add + Unsorted tray: LIVE (approved + committed 2026-09-28)

`npm run check` + `npm run build` pass. Exercised in the browser on a throwaway board (since
deleted), with the phone side driven through a 400 px same-origin iframe (the window would not
resize): quick-add from `/boards` with the board picker, quick-add from inside a board, the
row's `N unsorted` count, desktop tray listing both, **Place** ×2, reload → both persisted and
the tray button gone.

| File | Role |
|---|---|
| `lib/utils/thought.ts` (+ test) | `splitThought`: first non-empty line → title (overlong lines cut at a word, carried into the note with `…`), rest → body |
| `features/boards/ThoughtForm.tsx` | One textarea, optional board picker, stays open after adding and says `Added · <title>` (or that it failed) so several can go in a row |
| `features/boards/useUnsorted.ts` | Tray state: `addThought`, `placeThought` (via `placeIdea`, so a thought placed over a phase joins it), `discardThought` |
| `features/boards/UnsortedTray.tsx` | Floating list over the canvas, top-left; Place + two-tap delete per row |
| `BoardsList.tsx` | Phone `+ Thought` (`QuickThought`) beside `+ Board`; rows show `N unsorted` in accent |
| `CanvasHint.tsx` | Desktop `Unsorted · N` toggle (only when N > 0); phone `+ Thought` |
| `lib/queries/boards.ts` | `BoardSummary.unsorted`; `nodes`/`done` now count **placed** ideas only; `createNode` takes `body` |

Placement: at the centre of the view, fanned out a little per remaining item so a run of
Places does not stack. Drag-from-tray is still a later nicety.

### Step 3 eyeball (user)
- [ ] On the real phone: `/boards` → `+ Thought`, keyboard comes up, add two in a row.
- [ ] Place one while a phase is under the view's centre → it lands inside that phase.
- [ ] Delete a thought from the tray (two taps on the bin).

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
