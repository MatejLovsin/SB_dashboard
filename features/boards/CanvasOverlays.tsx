'use client';

import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { isIdea, isPhase } from './boardFlow';
import { EdgePanel } from './EdgePanel';
import { NodePanel } from './NodePanel';
import { IdeaReading, PhaseReading } from './NodeReading';
import { PhasePanel } from './PhasePanel';
import { ThoughtForm } from './ThoughtForm';
import type { useBoardGraph } from './useBoardGraph';

/** An idea or phase opens to its reading view; `edit` opens the form instead. */
export type Open =
  | { kind: 'idea' | 'phase'; id: string; edit?: boolean }
  | { kind: 'edge'; id: string }
  | { kind: 'thought' }
  | null;

interface OverlaysProps {
  graph: ReturnType<typeof useBoardGraph>;
  canEdit: boolean;
  open: Open;
  setOpen: (open: Open) => void;
}

// What you can open on a board: an idea or a phase (read, or edit on desktop),
// a line's label, and (on the phone) the quick-add for a thought.
export function CanvasOverlays({ graph, canEdit, open, setOpen }: OverlaysProps) {
  const close = () => setOpen(null);
  const id = open && 'id' in open ? open.id : null;
  const found = id ? graph.nodes.find((n) => n.id === id) : undefined;
  const idea = found && isIdea(found) && open?.kind === 'idea' ? found : undefined;
  const phase = found && isPhase(found) && open?.kind === 'phase' ? found : undefined;
  const edge = open?.kind === 'edge' ? graph.edges.find((e) => e.id === id) : undefined;
  const editing = canEdit && open !== null && 'edit' in open && open.edit === true;
  const node = idea ?? phase;
  const show = (edit: boolean) => node && setOpen({ kind: idea ? 'idea' : 'phase', id: node.id, edit });
  // Leaving the form goes back to reading what was just edited.
  const back = () => show(false);
  const reading = {
    nodes: graph.nodes,
    canEdit,
    onOpen: (kind: 'idea' | 'phase', next: string) => setOpen({ kind, id: next }),
    onEdit: () => show(true),
    onToggleDone: (kind: 'idea' | 'phase', target: string, done: boolean) =>
      kind === 'idea' ? graph.saveNode(target, { done }) : graph.savePhase(target, { done }),
  };

  return (
    <>
      <FocusOverlay
        open={idea !== undefined}
        onClose={close}
        size={idea?.data.imagePath && !editing ? 'plate' : 'reading'}
        title={editing ? 'Idea' : idea?.data.title}
      >
        {idea && !editing ? (
          <IdeaReading key={idea.id} idea={idea} edges={graph.edges} {...reading} />
        ) : null}
        {idea && editing ? (
          <NodePanel
            key={idea.id}
            data={idea.data}
            onSave={(patch, image) => graph.saveNode(idea.id, patch, image)}
            onDelete={() => {
              void graph.removeNode(idea.id);
              close();
            }}
            onClose={back}
          />
        ) : null}
      </FocusOverlay>

      <FocusOverlay
        open={phase !== undefined}
        onClose={close}
        title={editing ? 'Phase' : phase?.data.title}
      >
        {phase && !editing ? <PhaseReading key={phase.id} phase={phase} {...reading} /> : null}
        {phase && editing ? (
          <PhasePanel
            key={phase.id}
            data={phase.data}
            onSave={(patch) => graph.savePhase(phase.id, patch)}
            onDelete={() => {
              void graph.removePhase(phase.id);
              close();
            }}
            onClose={back}
          />
        ) : null}
      </FocusOverlay>

      <FocusOverlay open={open?.kind === 'thought'} onClose={close} title="New thought">
        <ThoughtForm onAdd={(_, thought) => graph.addThought(thought)} onCancel={close} />
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
