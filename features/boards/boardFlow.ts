import type { Edge, Node, XYPosition } from '@xyflow/react';
import type { BoardEdge, BoardNode, BoardPhase } from '@/lib/db/types';

// The board's rows as React Flow sees them, and the geometry that decides which
// phase an idea sits in. Pure: nothing here touches Supabase or React.

export type IdeaData = {
  title: string;
  body: string | null;
  done: boolean;
  goalId: string | null;
  imagePath: string | null;
};
export type PhaseData = { title: string; done: boolean; goalId: string | null };
export type IdeaFlowNode = Node<IdeaData, 'idea'>;
export type PhaseFlowNode = Node<PhaseData, 'phase'>;
export type BoardFlowNode = IdeaFlowNode | PhaseFlowNode;
export type LightFlowEdge = Edge<{ label: string | null }, 'light'>;

export const PHASE_SIZE = { width: 480, height: 320 };

// Where an idea's light sits relative to its top-left. Membership is decided by
// the light, not the corner, so an idea is "in" a phase when its dot is.
const LIGHT_OFFSET = { x: 6, y: 9 };

export const isIdea = (n: BoardFlowNode): n is IdeaFlowNode => n.type === 'idea';
export const isPhase = (n: BoardFlowNode): n is PhaseFlowNode => n.type === 'phase';

export const toFlowNode = (row: BoardNode): IdeaFlowNode => ({
  id: row.id,
  type: 'idea',
  position: { x: row.x, y: row.y },
  parentId: row.phase_id ?? undefined,
  data: {
    title: row.title,
    body: row.body,
    done: row.done,
    goalId: row.goal_id,
    imagePath: row.image_path,
  },
});

// A phase sits behind the ideas, can only be dragged by its title (so a drag
// inside the pool pans or selects instead), and is never removed by the Delete
// key — React Flow would take its ideas with it.
export const toPhaseNode = (row: BoardPhase): PhaseFlowNode => ({
  id: row.id,
  type: 'phase',
  position: { x: row.x, y: row.y },
  width: row.width,
  height: row.height,
  zIndex: -1,
  dragHandle: '.phase-title',
  deletable: false,
  data: { title: row.title, done: row.done, goalId: row.goal_id },
});

export const toFlowEdge = (row: BoardEdge): LightFlowEdge => ({
  id: row.id,
  type: 'light',
  source: row.source_id,
  target: row.target_id,
  data: { label: row.label },
});

/** React Flow needs every parent before its children in the array. */
export const orderNodes = (phases: PhaseFlowNode[], ideas: IdeaFlowNode[]): BoardFlowNode[] => [
  ...phases,
  ...ideas,
];

export interface PhaseRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const phaseRects = (nodes: BoardFlowNode[]): PhaseRect[] =>
  nodes.filter(isPhase).map((n) => ({
    id: n.id,
    x: n.position.x,
    y: n.position.y,
    width: n.width ?? n.measured?.width ?? PHASE_SIZE.width,
    height: n.height ?? n.measured?.height ?? PHASE_SIZE.height,
  }));

/** The phase a point on the canvas falls in — the smallest, where they overlap. */
export function phaseAt(point: XYPosition, rects: PhaseRect[]): PhaseRect | null {
  let best: PhaseRect | null = null;
  for (const r of rects) {
    const inside =
      point.x >= r.x && point.x <= r.x + r.width && point.y >= r.y && point.y <= r.y + r.height;
    if (inside && (!best || r.width * r.height < best.width * best.height)) best = r;
  }
  return best;
}

/** Where a brand-new idea with its top-left at `point` belongs, and its stored position. */
export function placeIdea(point: XYPosition, rects: PhaseRect[]) {
  const phase = phaseAt({ x: point.x + LIGHT_OFFSET.x, y: point.y + LIGHT_OFFSET.y }, rects);
  return {
    phase_id: phase?.id ?? null,
    x: Math.round(point.x - (phase?.x ?? 0)),
    y: Math.round(point.y - (phase?.y ?? 0)),
  };
}

export interface IdeaMove {
  id: string;
  x: number;
  y: number;
  phase_id: string | null;
}

/**
 * Re-decides every idea's phase from where it now sits. An idea that crossed a
 * phase edge is reparented and its position converted; `touched` ideas (the
 * ones just dragged, or shifted by a resize) are written even if they stayed.
 * Returns the next node array and the writes it implies.
 */
export function settleIdeas(nodes: BoardFlowNode[], touched: Set<string>) {
  const rects = phaseRects(nodes);
  const byId = new Map(rects.map((r) => [r.id, r]));
  const moves: IdeaMove[] = [];

  const ideas = nodes.filter(isIdea).map((n) => {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    const abs = { x: n.position.x + (parent?.x ?? 0), y: n.position.y + (parent?.y ?? 0) };
    const home = phaseAt({ x: abs.x + LIGHT_OFFSET.x, y: abs.y + LIGHT_OFFSET.y }, rects);
    const phaseId = home?.id ?? null;
    if (phaseId === (n.parentId ?? null) && !touched.has(n.id)) return n;

    const position = { x: Math.round(abs.x - (home?.x ?? 0)), y: Math.round(abs.y - (home?.y ?? 0)) };
    moves.push({ id: n.id, ...position, phase_id: phaseId });
    return { ...n, position, parentId: phaseId ?? undefined };
  });

  return { nodes: orderNodes(nodes.filter(isPhase), ideas), moves };
}
