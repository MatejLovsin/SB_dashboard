'use client';

import '@xyflow/react/dist/base.css';
import './board.css';
import { useCallback, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  ReactFlow,
  useReactFlow,
  type Viewport,
} from '@xyflow/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { useCanEdit } from '@/lib/hooks/useCanEdit';
import { createClient } from '@/lib/supabase/client';
import { updateBoard, type BoardContents } from '@/lib/queries/boards';
import { EdgePanel } from './EdgePanel';
import { IdeaNode } from './IdeaNode';
import { LightEdge } from './LightEdge';
import { NodePanel } from './NodePanel';
import { useBoardGraph } from './useBoardGraph';

// Module-level so React Flow never sees a new object and remounts every node.
const nodeTypes = { idea: IdeaNode };
const edgeTypes = { light: LightEdge };

type Graph = ReturnType<typeof useBoardGraph>;

export function BoardCanvas({ contents }: { contents: BoardContents }) {
  const canEdit = useCanEdit();
  const graph = useBoardGraph(contents);
  const { screenToFlowPosition } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const [openNode, setOpenNode] = useState<string | null>(null);
  const [openEdge, setOpenEdge] = useState<string | null>(null);
  const onMoveEnd = useViewportSaver(contents.board.id, canEdit);
  const { viewport } = contents.board;

  async function addAt(clientX: number, clientY: number) {
    const id = await graph.addNode(screenToFlowPosition({ x: clientX, y: clientY }));
    if (id) setOpenNode(id);
  }

  // React Flow has no pane double-click event; the wrapper catches it instead,
  // and only when the click landed on empty canvas.
  function onDoubleClick(e: React.MouseEvent) {
    if (!canEdit || !(e.target instanceof Element)) return;
    if (e.target.classList.contains('react-flow__pane')) void addAt(e.clientX, e.clientY);
  }

  function addCentered() {
    const rect = wrapper.current?.getBoundingClientRect();
    if (rect) void addAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  return (
    <div className="space-y-2">
      <CanvasHint canEdit={canEdit} error={graph.error} onAdd={addCentered} />
      <div
        ref={wrapper}
        onDoubleClick={onDoubleClick}
        className="board-canvas panel h-[calc(100dvh-15rem)] min-h-[420px] md:h-[calc(100dvh-13rem)]"
      >
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={graph.onNodesChange}
          onEdgesChange={graph.onEdgesChange}
          onNodeDragStop={graph.onNodeDragStop}
          onConnect={graph.onConnect}
          onNodesDelete={graph.onNodesDelete}
          onEdgesDelete={graph.onEdgesDelete}
          onNodeDoubleClick={(_, node) => setOpenNode(node.id)}
          onNodeClick={canEdit ? undefined : (_, node) => setOpenNode(node.id)}
          onEdgeDoubleClick={canEdit ? (_, edge) => setOpenEdge(edge.id) : undefined}
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
      </div>
      <CanvasOverlays
        graph={graph}
        canEdit={canEdit}
        openNode={openNode}
        openEdge={openEdge}
        closeNode={() => setOpenNode(null)}
        closeEdge={() => setOpenEdge(null)}
      />
    </div>
  );
}

function CanvasHint({
  canEdit,
  error,
  onAdd,
}: {
  canEdit: boolean;
  error: string | null;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <p className={`label text-[10px] ${error ? 'text-down' : 'text-muted'}`}>
        {error ??
          (canEdit
            ? 'Double-click to add · drag from a light to connect · double-click a line to label it'
            : 'Viewing · tap an idea to read it · edit on a computer')}
      </p>
      {canEdit ? (
        <Button size="sm" variant="secondary" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Idea
        </Button>
      ) : null}
    </div>
  );
}

interface OverlaysProps {
  graph: Graph;
  canEdit: boolean;
  openNode: string | null;
  openEdge: string | null;
  closeNode: () => void;
  closeEdge: () => void;
}

function CanvasOverlays({ graph, canEdit, openNode, openEdge, closeNode, closeEdge }: OverlaysProps) {
  const node = openNode ? graph.nodes.find((n) => n.id === openNode) : undefined;
  const edge = openEdge ? graph.edges.find((e) => e.id === openEdge) : undefined;

  return (
    <>
      <FocusOverlay
        open={node !== undefined}
        onClose={closeNode}
        size="reading"
        title={canEdit ? 'Idea' : node?.data.title}
      >
        {node ? (
          <NodePanel
            key={node.id}
            data={node.data}
            canEdit={canEdit}
            onSave={(patch) => graph.saveNode(node.id, patch)}
            onDelete={() => {
              void graph.removeNode(node.id);
              closeNode();
            }}
            onClose={closeNode}
          />
        ) : null}
      </FocusOverlay>

      <FocusOverlay open={edge !== undefined} onClose={closeEdge} title="Line">
        {edge ? (
          <EdgePanel
            key={edge.id}
            label={edge.data?.label ?? null}
            onSave={(label) => void graph.labelEdge(edge.id, label)}
            onDelete={() => void graph.removeEdge(edge.id)}
            onClose={closeEdge}
          />
        ) : null}
      </FocusOverlay>
    </>
  );
}

/** Remembers where the camera was, so a board reopens where you left it. */
function useViewportSaver(boardId: string, canEdit: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      // The phone only looks; it should not move the desktop's camera.
      if (!canEdit) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const { x, y, zoom } = viewport;
        updateBoard(createClient(), boardId, { viewport: { x, y, zoom } }).catch(console.error);
      }, 800);
    },
    [boardId, canEdit],
  );
}
