'use client';

import '@xyflow/react/dist/base.css';
import './board.css';
import './phase.css';
import { useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  ReactFlow,
  useReactFlow,
  useStoreApi,
} from '@xyflow/react';
import { useCanEdit } from '@/lib/hooks/useCanEdit';
import type { BoardContents } from '@/lib/queries/boards';
import { BoardContextProvider, type BoardGoals } from './boardContext';
import type { BoardFlowNode, LightFlowEdge } from './boardFlow';
import { CanvasHint, useViewportSaver } from './CanvasHint';
import { CanvasOverlays, type Open } from './CanvasOverlays';
import { IdeaNode } from './IdeaNode';
import { LightEdge } from './LightEdge';
import { PhaseNode } from './PhaseNode';
import { UnsortedTray } from './UnsortedTray';
import { useBoardGoals } from './useBoardGoals';
import { useBoardGraph } from './useBoardGraph';

// Module-level so React Flow never sees a new object and remounts every node.
const nodeTypes = { idea: IdeaNode, phase: PhaseNode };
const edgeTypes = { light: LightEdge };

interface BoardCanvasProps {
  contents: BoardContents;
  goals: Promise<BoardGoals>;
  images: Record<string, string>;
}

export function BoardCanvas({ contents, goals: pendingGoals, images }: BoardCanvasProps) {
  const canEdit = useCanEdit();
  const graph = useBoardGraph(contents, images);
  const goals = useBoardGoals(pendingGoals, graph.nodes);
  const [open, setOpen] = useState<Open>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const onMoveEnd = useViewportSaver(contents.board.id, canEdit);
  const edges = useLitEdges(graph.nodes, graph.edges, goals);
  const { viewport } = contents.board;
  const { resizePhase, imageUrls } = graph;
  const context = useMemo(
    () => ({ goals, images: imageUrls, canEdit, resizePhase }),
    [goals, imageUrls, canEdit, resizePhase],
  );

  const openNode = (node: BoardFlowNode) =>
    setOpen({ kind: node.type === 'phase' ? 'phase' : 'idea', id: node.id });
  const add = useCanvasAdd(graph, canEdit, setOpen);

  return (
    <BoardContextProvider value={context}>
      <div className="space-y-2">
        <CanvasHint
          canEdit={canEdit}
          error={graph.error}
          onAddIdea={add.idea}
          onAddPhase={add.phase}
          unsorted={graph.unsorted.length}
          onToggleTray={() => setTrayOpen((o) => !o)}
          onAddThought={() => setOpen({ kind: 'thought' })}
        />
        <div
          onDoubleClick={add.onDoubleClick}
          className="board-canvas panel relative h-[calc(100dvh-15rem)] min-h-[420px] md:h-[calc(100dvh-13rem)]"
        >
          <ReactFlow
            nodes={graph.nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={graph.onNodesChange}
            onEdgesChange={graph.onEdgesChange}
            onNodeDragStop={graph.onNodeDragStop}
            onConnect={graph.onConnect}
            onNodesDelete={graph.onNodesDelete}
            onEdgesDelete={graph.onEdgesDelete}
            onNodeDoubleClick={(_, node) => openNode(node)}
            onNodeClick={canEdit ? undefined : (_, node) => openNode(node)}
            onEdgeDoubleClick={canEdit ? (_, edge) => setOpen({ kind: 'edge', id: edge.id }) : undefined}
            onMoveEnd={onMoveEnd}
            connectionMode={ConnectionMode.Loose}
            connectionLineType={ConnectionLineType.Straight}
            nodesDraggable={canEdit}
            nodesConnectable={canEdit}
            edgesFocusable={canEdit}
            deleteKeyCode={canEdit ? ['Backspace', 'Delete'] : null}
            zoomOnDoubleClick={false}
            defaultViewport={viewport ?? undefined}
            fitView={!viewport}
            fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            colorMode="dark"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={28} size={1} />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
          {canEdit && trayOpen && graph.unsorted.length > 0 ? (
            <UnsortedTray
              items={graph.unsorted}
              onPlace={(id) => void add.place(id)}
              onDiscard={(id) => void graph.discardThought(id)}
              onClose={() => setTrayOpen(false)}
            />
          ) : null}
        </div>
        <CanvasOverlays graph={graph} canEdit={canEdit} open={open} close={() => setOpen(null)} />
      </div>
    </BoardContextProvider>
  );
}

/** Adding ideas and phases: by double-click on the canvas, or at its centre. */
function useCanvasAdd(
  graph: ReturnType<typeof useBoardGraph>,
  canEdit: boolean,
  setOpen: (open: Open) => void,
) {
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const store = useStoreApi();

  async function ideaAt(position: { x: number; y: number }) {
    const id = await graph.addNode(position);
    if (id) setOpen({ kind: 'idea', id });
  }

  // The middle of what is on screen, in canvas coordinates.
  function centre() {
    const { width, height } = store.getState();
    const { x, y, zoom } = getViewport();
    return { x: (width / 2 - x) / zoom, y: (height / 2 - y) / zoom };
  }

  // React Flow has no pane double-click event; the wrapper catches it instead,
  // and only when the click landed on empty canvas (a phase's pool counts —
  // it lets clicks through, and the new idea joins that phase).
  function onDoubleClick(e: React.MouseEvent) {
    if (!canEdit || !(e.target instanceof Element)) return;
    if (e.target.classList.contains('react-flow__pane')) {
      void ideaAt(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    }
  }

  async function phase() {
    const id = await graph.addPhase(centre());
    if (id) setOpen({ kind: 'phase', id });
  }

  // Placed thoughts fan out a little from the centre so a run of them does not
  // land in one pile.
  async function place(id: string) {
    const c = centre();
    const step = graph.unsorted.length % 5;
    await graph.placeThought(id, { x: c.x + step * 24, y: c.y + step * 36 });
  }

  return {
    onDoubleClick,
    idea: () => void ideaAt(centre()),
    phase: () => void phase(),
    place,
  };
}

/** A line touching an idea whose goal is achieved carries the goal's amber. */
function useLitEdges(nodes: BoardFlowNode[], edges: LightFlowEdge[], goals: BoardGoals) {
  return useMemo(() => {
    const lit = new Set(
      nodes
        .filter((n) => n.data.goalId && goals.states[n.data.goalId]?.achieved)
        .map((n) => n.id),
    );
    if (!lit.size) return edges;
    return edges.map((e) =>
      lit.has(e.source) || lit.has(e.target) ? { ...e, className: 'goal-lit' } : e,
    );
  }, [nodes, edges, goals]);
}
