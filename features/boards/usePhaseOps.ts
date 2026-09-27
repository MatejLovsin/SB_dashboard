'use client';

import { useCallback } from 'react';
import { useReactFlow, type OnNodeDrag, type XYPosition } from '@xyflow/react';
import { createClient } from '@/lib/supabase/client';
import { moveNodes } from '@/lib/queries/boards';
import { createPhase, deletePhase, updatePhase, type PhasePatch } from '@/lib/queries/boardPhases';
import {
  isIdea,
  isPhase,
  PHASE_SIZE,
  settleIdeas,
  toPhaseNode,
  type BoardFlowNode,
  type PhaseData,
} from './boardFlow';
import type { Attempt, SetNodes } from './useBoardGraph';

type Rect = { x: number; y: number; width: number; height: number };

const round = (r: Rect): Rect => ({
  x: Math.round(r.x),
  y: Math.round(r.y),
  width: Math.round(r.width),
  height: Math.round(r.height),
});

/**
 * Phases, and the one rule that ties ideas to them: after any gesture that
 * moves things (a drop, a resize, a new phase), membership is re-decided from
 * where each idea's light now sits. So an idea joins a phase by being dropped
 * in it, and leaves by being dragged out.
 */
export function usePhaseOps(boardId: string, attempt: Attempt, setNodes: SetNodes) {
  const { getNodes } = useReactFlow<BoardFlowNode>();
  const { settle, onNodeDragStop, resizePhase } = useMembership(attempt, setNodes);
  return {
    onNodeDragStop,
    resizePhase,
    ...usePhaseCrud(boardId, attempt, setNodes, settle, getNodes),
  };
}

type Settle = (current: BoardFlowNode[], touched: Set<string>) => void;

function useMembership(attempt: Attempt, setNodes: SetNodes) {
  const { getNodes } = useReactFlow<BoardFlowNode>();

  const settle: Settle = useCallback(
    (current: BoardFlowNode[], touched: Set<string>) => {
      const { nodes, moves } = settleIdeas(current, touched);
      setNodes(nodes);
      if (moves.length) {
        void attempt('save the new position', () => moveNodes(createClient(), moves));
      }
    },
    [attempt, setNodes],
  );

  const onNodeDragStop: OnNodeDrag<BoardFlowNode> = useCallback(
    (_event, _node, dragged) => {
      const at = new Map(dragged.map((n) => [n.id, n.position]));
      const current = getNodes().map((n) => {
        const p = at.get(n.id);
        return p ? { ...n, position: { x: Math.round(p.x), y: Math.round(p.y) } } : n;
      });
      for (const phase of dragged.filter(isPhase)) {
        const { x, y } = phase.position;
        const patch = { x: Math.round(x), y: Math.round(y) };
        void attempt('move the phase', () => updatePhase(createClient(), phase.id, patch));
      }
      settle(current, new Set(dragged.filter(isIdea).map((n) => n.id)));
    },
    [attempt, getNodes, settle],
  );

  // Resizing from the top or left moves the phase's origin, and React Flow
  // shifts the children's relative positions to keep them still on screen —
  // those shifted positions have to be written too.
  const resizePhase = useCallback(
    (id: string, rect: Rect) => {
      const r = round(rect);
      void attempt('resize the phase', () => updatePhase(createClient(), id, r));
      const nodes = getNodes();
      const before = nodes.find((n) => n.id === id);
      const shifted =
        !before || Math.round(before.position.x) !== r.x || Math.round(before.position.y) !== r.y;
      const current = nodes.map((n) =>
        n.id === id ? { ...n, position: { x: r.x, y: r.y }, width: r.width, height: r.height } : n,
      );
      const children = shifted ? current.filter((n) => n.parentId === id).map((n) => n.id) : [];
      settle(current, new Set(children));
    },
    [attempt, getNodes, settle],
  );

  return { settle, onNodeDragStop, resizePhase };
}

function usePhaseCrud(
  boardId: string,
  attempt: Attempt,
  setNodes: SetNodes,
  settle: Settle,
  getNodes: () => BoardFlowNode[],
) {
  const addPhase = useCallback(
    async (center: XYPosition) => {
      const created = await attempt('add the phase', () =>
        createPhase(createClient(), {
          board_id: boardId,
          title: 'New phase',
          x: Math.round(center.x - PHASE_SIZE.width / 2),
          y: Math.round(center.y - PHASE_SIZE.height / 2),
          ...PHASE_SIZE,
        }),
      );
      if (!created) return undefined;
      const phase = toPhaseNode(created.value);
      // Ideas already under the new phase become its members.
      settle([phase, ...getNodes().map((n) => ({ ...n, selected: false }))], new Set());
      return phase.id;
    },
    [attempt, boardId, getNodes, settle],
  );

  const savePhase = useCallback(
    async (id: string, patch: PhasePatch) => {
      const ok = await attempt('save the phase', () => updatePhase(createClient(), id, patch));
      if (!ok) return false;
      setNodes((prev) =>
        prev.map((n) => (n.id === id && isPhase(n) ? { ...n, data: patchPhase(n.data, patch) } : n)),
      );
      return true;
    },
    [attempt, setNodes],
  );

  // Its ideas stay exactly where they are on screen; they just stop belonging.
  const removePhase = useCallback(
    async (id: string) => {
      const ok = await attempt('delete the phase', () => deletePhase(createClient(), id));
      if (!ok) return;
      setNodes((prev) => {
        const phase = prev.find((n) => n.id === id);
        const origin = phase?.position ?? { x: 0, y: 0 };
        return prev
          .filter((n) => n.id !== id)
          .map((n) =>
            n.parentId === id
              ? {
                  ...n,
                  parentId: undefined,
                  position: { x: n.position.x + origin.x, y: n.position.y + origin.y },
                }
              : n,
          );
      });
    },
    [attempt, setNodes],
  );

  return { addPhase, savePhase, removePhase };
}

const patchPhase = (data: PhaseData, patch: PhasePatch): PhaseData => ({
  title: patch.title ?? data.title,
  done: patch.done ?? data.done,
  goalId: patch.goal_id !== undefined ? patch.goal_id : data.goalId,
});
