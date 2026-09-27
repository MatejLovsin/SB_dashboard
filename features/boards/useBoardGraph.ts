'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { useEdgesState, useNodesState, useReactFlow, type Connection } from '@xyflow/react';
import { createClient } from '@/lib/supabase/client';
import {
  createEdge,
  createNode,
  deleteEdges,
  deleteNodes,
  setEdgeLabel,
  type BoardContents,
} from '@/lib/queries/boards';
import {
  isIdea,
  orderNodes,
  phaseRects,
  placeIdea,
  toFlowEdge,
  toFlowNode,
  toPhaseNode,
  type BoardFlowNode,
  type LightFlowEdge,
} from './boardFlow';
import { usePhaseOps } from './usePhaseOps';
import { useUnsorted } from './useUnsorted';
import { useBoardImages, useSaveIdea } from './useIdeaImages';

export type Attempt = <T>(what: string, run: () => Promise<T>) => Promise<{ value: T } | null>;
export type SetNodes = Dispatch<SetStateAction<BoardFlowNode[]>>;
type SetEdges = Dispatch<SetStateAction<LightFlowEdge[]>>;

/**
 * The canvas's state and every write it makes. React Flow owns positions and
 * selection while you work; each finished gesture (a drop, a new line, a
 * delete) is written straight to Supabase. Nothing waits on a save button.
 */
export function useBoardGraph(
  { board, phases, nodes: rows, edges: edgeRows }: BoardContents,
  imageUrls: Record<string, string>,
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<BoardFlowNode>(
    orderNodes(phases.map(toPhaseNode), rows.filter((r) => !r.unsorted).map(toFlowNode)),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<LightFlowEdge>(edgeRows.map(toFlowEdge));
  const { error, attempt } = useAttempt();
  const images = useBoardImages(board.id, imageUrls);

  return {
    nodes,
    edges,
    error,
    onNodesChange,
    onEdgesChange,
    imageUrls: images.urls,
    saveNode: useSaveIdea(attempt, setNodes, images),
    ...useNodeOps(board.id, attempt, setNodes, setEdges, images.discard),
    ...usePhaseOps(board.id, attempt, setNodes),
    ...useUnsorted(board.id, rows.filter((r) => r.unsorted), attempt, setNodes),
    ...useEdgeOps(board.id, attempt, edges, setEdges),
  };
}

// Every write goes through here, so a failed save is always visible. Returns
// null on failure — wrapped, because most writes resolve to undefined.
function useAttempt() {
  const [error, setError] = useState<string | null>(null);
  const attempt: Attempt = useCallback(async (what, run) => {
    try {
      const value = await run();
      setError(null);
      return { value };
    } catch (e) {
      console.error(e);
      setError(`Could not ${what}. Reload to see what was saved.`);
      return null;
    }
  }, []);
  return { error, attempt };
}

type Discard = (paths: (string | null)[]) => void;

function useNodeOps(
  boardId: string,
  attempt: Attempt,
  setNodes: SetNodes,
  setEdges: SetEdges,
  discardImages: Discard,
) {
  const { getNodes } = useReactFlow<BoardFlowNode>();

  // Dropped inside a phase, a new idea is born a member of it.
  const addNode = useCallback(
    async (position: { x: number; y: number }) => {
      const place = placeIdea(position, phaseRects(getNodes()));
      const created = await attempt('add the idea', () =>
        createNode(createClient(), { board_id: boardId, title: 'New idea', ...place }),
      );
      if (!created) return undefined;
      const node = toFlowNode(created.value);
      setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), node]);
      return node.id;
    },
    [attempt, boardId, getNodes, setNodes],
  );

  // Phases are not deletable by key, so only ideas arrive here — filter anyway.
  const onNodesDelete = useCallback(
    (deleted: BoardFlowNode[]) => {
      const ideas = deleted.filter(isIdea);
      void attempt('delete the idea', () =>
        deleteNodes(createClient(), ideas.map((n) => n.id)),
      ).then((ok) => {
        if (ok) discardImages(ideas.map((n) => n.data.imagePath));
      });
    },
    [attempt, discardImages],
  );

  const removeNode = useCallback(
    async (id: string) => {
      const gone = getNodes().find((n) => n.id === id);
      const ok = await attempt('delete the idea', () => deleteNodes(createClient(), [id]));
      if (!ok) return;
      if (gone && isIdea(gone)) discardImages([gone.data.imagePath]);
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    },
    [attempt, discardImages, getNodes, setEdges, setNodes],
  );

  return { addNode, onNodesDelete, removeNode };
}

function useEdgeOps(boardId: string, attempt: Attempt, edges: LightFlowEdge[], setEdges: SetEdges) {
  const onConnect = useCallback(
    async ({ source, target }: Connection) => {
      if (source === target) return;
      // Lines only mean "related", so A–B and B–A are the same line.
      const exists = edges.some(
        (e) =>
          (e.source === source && e.target === target) ||
          (e.source === target && e.target === source),
      );
      if (exists) return;
      const created = await attempt('connect the ideas', () =>
        createEdge(createClient(), { board_id: boardId, source_id: source, target_id: target }),
      );
      if (created) setEdges((prev) => [...prev, toFlowEdge(created.value)]);
    },
    [attempt, boardId, edges, setEdges],
  );

  const onEdgesDelete = useCallback(
    (deleted: LightFlowEdge[]) =>
      void attempt('delete the line', () => deleteEdges(createClient(), deleted.map((e) => e.id))),
    [attempt],
  );

  const labelEdge = useCallback(
    async (id: string, label: string | null) => {
      const ok = await attempt('save the label', () => setEdgeLabel(createClient(), id, label));
      if (ok) setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, data: { label } } : e)));
    },
    [attempt, setEdges],
  );

  const removeEdge = useCallback(
    async (id: string) => {
      const ok = await attempt('delete the line', () => deleteEdges(createClient(), [id]));
      if (ok) setEdges((prev) => prev.filter((e) => e.id !== id));
    },
    [attempt, setEdges],
  );

  return { onConnect, onEdgesDelete, labelEdge, removeEdge };
}
