'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import {
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnNodeDrag,
} from '@xyflow/react';
import type { BoardEdge, BoardNode } from '@/lib/db/types';
import { createClient } from '@/lib/supabase/client';
import {
  createEdge,
  createNode,
  deleteEdges,
  deleteNodes,
  moveNodes,
  setEdgeLabel,
  updateNode,
  type BoardContents,
  type NodePatch,
} from '@/lib/queries/boards';

export type IdeaData = { title: string; body: string | null; done: boolean };
export type IdeaFlowNode = Node<IdeaData, 'idea'>;
export type LightFlowEdge = Edge<{ label: string | null }, 'light'>;

export const toFlowNode = (row: BoardNode): IdeaFlowNode => ({
  id: row.id,
  type: 'idea',
  position: { x: row.x, y: row.y },
  data: { title: row.title, body: row.body, done: row.done },
});

export const toFlowEdge = (row: BoardEdge): LightFlowEdge => ({
  id: row.id,
  type: 'light',
  source: row.source_id,
  target: row.target_id,
  data: { label: row.label },
});

type Attempt = <T>(what: string, run: () => Promise<T>) => Promise<{ value: T } | null>;
type SetNodes = Dispatch<SetStateAction<IdeaFlowNode[]>>;
type SetEdges = Dispatch<SetStateAction<LightFlowEdge[]>>;

/**
 * The canvas's state and every write it makes. React Flow owns positions and
 * selection while you work; each finished gesture (a drop, a new line, a
 * delete) is written straight to Supabase. Nothing waits on a save button.
 */
export function useBoardGraph({ board, nodes: rows, edges: edgeRows }: BoardContents) {
  const [nodes, setNodes, onNodesChange] = useNodesState<IdeaFlowNode>(
    rows.filter((r) => !r.unsorted).map(toFlowNode),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<LightFlowEdge>(edgeRows.map(toFlowEdge));
  const { error, attempt } = useAttempt();

  return {
    nodes,
    edges,
    error,
    onNodesChange,
    onEdgesChange,
    ...useNodeOps(board.id, attempt, setNodes, setEdges),
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

function useNodeOps(boardId: string, attempt: Attempt, setNodes: SetNodes, setEdges: SetEdges) {
  const addNode = useCallback(
    async (position: { x: number; y: number }) => {
      const created = await attempt('add the idea', () =>
        createNode(createClient(), {
          board_id: boardId,
          title: 'New idea',
          x: Math.round(position.x),
          y: Math.round(position.y),
        }),
      );
      if (!created) return undefined;
      const node = toFlowNode(created.value);
      setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), node]);
      return node.id;
    },
    [attempt, boardId, setNodes],
  );

  const onNodeDragStop: OnNodeDrag<IdeaFlowNode> = useCallback(
    (_event, _node, dragged) => {
      const moves = dragged.map((n) => ({
        id: n.id,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
      }));
      void attempt('save the new position', () => moveNodes(createClient(), moves));
    },
    [attempt],
  );

  const onNodesDelete = useCallback(
    (deleted: IdeaFlowNode[]) =>
      void attempt('delete the idea', () => deleteNodes(createClient(), deleted.map((n) => n.id))),
    [attempt],
  );

  const saveNode = useCallback(
    async (id: string, patch: NodePatch) => {
      const ok = await attempt('save the idea', () => updateNode(createClient(), id, patch));
      if (!ok) return false;
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, data: patchData(n.data, patch) } : n)),
      );
      return true;
    },
    [attempt, setNodes],
  );

  const removeNode = useCallback(
    async (id: string) => {
      const ok = await attempt('delete the idea', () => deleteNodes(createClient(), [id]));
      if (!ok) return;
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    },
    [attempt, setEdges, setNodes],
  );

  return { addNode, onNodeDragStop, onNodesDelete, saveNode, removeNode };
}

const patchData = (data: IdeaData, patch: NodePatch): IdeaData => ({
  title: patch.title ?? data.title,
  body: patch.body !== undefined ? patch.body : data.body,
  done: patch.done ?? data.done,
});

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
