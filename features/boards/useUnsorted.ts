'use client';

import { useCallback, useState } from 'react';
import { useReactFlow, type XYPosition } from '@xyflow/react';
import type { BoardNode } from '@/lib/db/types';
import { createClient } from '@/lib/supabase/client';
import { createNode, deleteNodes, updateNode } from '@/lib/queries/boards';
import { phaseRects, placeIdea, toFlowNode, type BoardFlowNode } from './boardFlow';
import type { Attempt, SetNodes } from './useBoardGraph';

/**
 * The Unsorted tray: thoughts added from the phone that are not on the canvas
 * yet. Placing one drops it at a point (inside a phase if it lands in one) and
 * hands it to the canvas's flow state.
 */
export function useUnsorted(
  boardId: string,
  initial: BoardNode[],
  attempt: Attempt,
  setNodes: SetNodes,
) {
  const [unsorted, setUnsorted] = useState(initial);
  const { getNodes } = useReactFlow<BoardFlowNode>();

  const addThought = useCallback(
    async (thought: { title: string; body: string | null }) => {
      const created = await attempt('add the thought', () =>
        createNode(createClient(), { board_id: boardId, ...thought, unsorted: true }),
      );
      if (created) setUnsorted((prev) => [...prev, created.value]);
      return created !== null;
    },
    [attempt, boardId],
  );

  const placeThought = useCallback(
    async (id: string, point: XYPosition) => {
      const row = unsorted.find((r) => r.id === id);
      if (!row) return;
      const place = placeIdea(point, phaseRects(getNodes()));
      const ok = await attempt('place the thought', () =>
        updateNode(createClient(), id, { unsorted: false, ...place }),
      );
      if (!ok) return;
      setUnsorted((prev) => prev.filter((r) => r.id !== id));
      const node = { ...toFlowNode({ ...row, ...place, unsorted: false }), selected: true };
      setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), node]);
    },
    [attempt, getNodes, setNodes, unsorted],
  );

  const discardThought = useCallback(
    async (id: string) => {
      const ok = await attempt('delete the thought', () => deleteNodes(createClient(), [id]));
      if (ok) setUnsorted((prev) => prev.filter((r) => r.id !== id));
    },
    [attempt],
  );

  return { unsorted, addThought, placeThought, discardThought };
}
