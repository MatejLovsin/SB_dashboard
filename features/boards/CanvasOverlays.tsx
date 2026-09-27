'use client';

import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { isIdea, isPhase } from './boardFlow';
import { EdgePanel } from './EdgePanel';
import { NodePanel } from './NodePanel';
import { PhasePanel } from './PhasePanel';
import type { useBoardGraph } from './useBoardGraph';

export type Open = { kind: 'idea' | 'phase' | 'edge'; id: string } | null;

interface OverlaysProps {
  graph: ReturnType<typeof useBoardGraph>;
  canEdit: boolean;
  open: Open;
  close: () => void;
}

// The three things you can open on a board: an idea's note, a phase's
// settings, and a line's label.
export function CanvasOverlays({ graph, canEdit, open, close }: OverlaysProps) {
  const found = open && open.kind !== 'edge' ? graph.nodes.find((n) => n.id === open.id) : undefined;
  const idea = found && isIdea(found) && open?.kind === 'idea' ? found : undefined;
  const phase = found && isPhase(found) && open?.kind === 'phase' ? found : undefined;
  const edge = open?.kind === 'edge' ? graph.edges.find((e) => e.id === open.id) : undefined;

  return (
    <>
      <FocusOverlay
        open={idea !== undefined}
        onClose={close}
        size="reading"
        title={canEdit ? 'Idea' : idea?.data.title}
      >
        {idea ? (
          <NodePanel
            key={idea.id}
            data={idea.data}
            canEdit={canEdit}
            onSave={(patch) => graph.saveNode(idea.id, patch)}
            onDelete={() => {
              void graph.removeNode(idea.id);
              close();
            }}
            onClose={close}
          />
        ) : null}
      </FocusOverlay>

      <FocusOverlay
        open={phase !== undefined}
        onClose={close}
        title={canEdit ? 'Phase' : phase?.data.title}
      >
        {phase ? (
          <PhasePanel
            key={phase.id}
            data={phase.data}
            canEdit={canEdit}
            onSave={(patch) => graph.savePhase(phase.id, patch)}
            onDelete={() => {
              void graph.removePhase(phase.id);
              close();
            }}
            onClose={close}
          />
        ) : null}
      </FocusOverlay>

      <FocusOverlay open={edge !== undefined} onClose={close} title="Line">
        {edge ? (
          <EdgePanel
            key={edge.id}
            label={edge.data?.label ?? null}
            onSave={(label) => void graph.labelEdge(edge.id, label)}
            onDelete={() => void graph.removeEdge(edge.id)}
            onClose={close}
          />
        ) : null}
      </FocusOverlay>
    </>
  );
}
