'use client';

import { useState } from 'react';
import { Circle, CircleCheck, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CardTitle } from '@/components/ui/Card';
import { Markdown } from '@/components/ui/Markdown';
import { isIdea, type BoardFlowNode, type IdeaFlowNode, type LightFlowEdge, type PhaseFlowNode } from './boardFlow';
import { useImageUrl } from './boardContext';
import { GoalLinkStatus } from './goalLinks';
import { IdeaPlate } from './IdeaPlate';

// What a click on an idea or a phase shows: the thing itself, written out, and
// what it is tied to — its goal, its phase, the ideas around it. Done is one
// tap from here; the form is behind Edit.

export type OpenNode = (kind: 'idea' | 'phase', id: string) => void;

interface ReadingProps {
  nodes: BoardFlowNode[];
  canEdit: boolean;
  onOpen: OpenNode;
  onEdit: () => void;
  /** Flip an idea's or the phase's done. */
  onToggleDone: (kind: 'idea' | 'phase', id: string, done: boolean) => Promise<boolean>;
}

export function IdeaReading({
  idea,
  edges,
  ...props
}: ReadingProps & { idea: IdeaFlowNode; edges: LightFlowEdge[] }) {
  const { data } = idea;
  const imageUrl = useImageUrl(data.imagePath);
  const phase = props.nodes.find((n) => n.id === idea.parentId);
  const links = connections(idea.id, props.nodes, edges);
  const tied = Boolean(data.goalId || phase || links.length);

  const text = (
    <div className="space-y-6">
      <Actions
        done={data.done}
        canEdit={props.canEdit}
        onEdit={props.onEdit}
        onToggle={() => props.onToggleDone('idea', idea.id, !data.done)}
      />
      {data.body ? (
        <Markdown>{data.body}</Markdown>
      ) : (
        <p className="text-sm text-muted">No notes on this idea yet.</p>
      )}
      {tied ? (
        <section className="space-y-3">
          <CardTitle>Tied to</CardTitle>
          <GoalLinkStatus goalId={data.goalId} />
          {phase ? (
            <Row
              kicker="Phase"
              title={phase.data.title}
              done={phase.data.done}
              onOpen={() => props.onOpen('phase', phase.id)}
            />
          ) : null}
          {links.map(({ node, label }) => (
            <Row
              key={node.id}
              kicker={label ?? 'Linked idea'}
              title={node.data.title}
              done={node.data.done}
              onOpen={() => props.onOpen('idea', node.id)}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
  if (!imageUrl) return text;

  // With an image the panel goes wide: the image whole on the left, the words
  // beside it. On the phone they stack, image first.
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-9">
      <IdeaPlate src={imageUrl} />
      {text}
    </div>
  );
}

export function PhaseReading({ phase, ...props }: ReadingProps & { phase: PhaseFlowNode }) {
  const { data } = phase;
  const ideas = props.nodes.filter(isIdea).filter((n) => n.parentId === phase.id);
  const doneCount = ideas.filter((n) => n.data.done).length;

  return (
    <div className="space-y-6">
      <Actions
        done={data.done}
        canEdit={props.canEdit}
        onEdit={props.onEdit}
        onToggle={() => props.onToggleDone('phase', phase.id, !data.done)}
      />
      <GoalLinkStatus goalId={data.goalId} />
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle>Ideas</CardTitle>
          {ideas.length ? (
            <span className="label nums text-[10px] text-muted">
              {doneCount}/{ideas.length} done
            </span>
          ) : null}
        </div>
        {ideas.length ? (
          <>
            <Progress fraction={doneCount / ideas.length} />
            <ul className="space-y-1">
              {ideas.map((n) => (
                <li key={n.id} className="flex items-center gap-2">
                  <TickButton
                    done={n.data.done}
                    onToggle={() => void props.onToggleDone('idea', n.id, !n.data.done)}
                  />
                  <button
                    type="button"
                    onClick={() => props.onOpen('idea', n.id)}
                    className={`min-w-0 flex-1 truncate py-1.5 text-left text-sm transition-colors hover:text-accent ${
                      n.data.done ? 'text-muted line-through' : ''
                    }`}
                  >
                    {n.data.title}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">No ideas in this phase yet.</p>
        )}
      </section>
    </div>
  );
}

/** The ideas a line runs to from this one, with the line's label if it has one. */
function connections(id: string, nodes: BoardFlowNode[], edges: LightFlowEdge[]) {
  const ideas = new Map(nodes.filter(isIdea).map((n) => [n.id, n]));
  return edges.flatMap((e) => {
    const other = e.source === id ? e.target : e.target === id ? e.source : null;
    const node = other ? ideas.get(other) : undefined;
    return node ? [{ node, label: e.data?.label ?? null }] : [];
  });
}

function Actions({
  done,
  canEdit,
  onEdit,
  onToggle,
}: {
  done: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onToggle: () => Promise<boolean>;
}) {
  const [pending, setPending] = useState(false);
  async function toggle() {
    setPending(true);
    await onToggle();
    setPending(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={done ? 'ghost' : 'secondary'}
        aria-pressed={done}
        disabled={pending}
        onClick={() => void toggle()}
        className={done ? 'text-accent' : ''}
      >
        {done ? <CircleCheck className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        {done ? 'Done' : 'Mark as done'}
      </Button>
      {canEdit ? (
        <Button type="button" variant="ghost" onClick={onEdit} className="ml-auto">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      ) : null}
    </div>
  );
}

function TickButton({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={done ? 'Mark as not done' : 'Mark as done'}
      onClick={onToggle}
      className={`flex-none p-1 transition-colors ${done ? 'text-accent' : 'text-muted hover:text-foreground'}`}
    >
      {done ? <CircleCheck className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
    </button>
  );
}

/** A thing this one is tied to; opening it moves the panel there. */
function Row({ kicker, title, done, onOpen }: { kicker: string; title: string; done: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group flex w-full items-center gap-3 py-1 text-left">
      {done ? <CircleCheck className="h-4 w-4 flex-none text-accent" /> : <Circle className="h-4 w-4 flex-none text-muted" />}
      <span className="min-w-0 flex-1">
        <span className="label block text-[10px] text-muted">{kicker}</span>
        <span className="block truncate text-sm transition-colors group-hover:text-accent">{title}</span>
      </span>
    </button>
  );
}

function Progress({ fraction }: { fraction: number }) {
  const width = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <div className="h-[3px] overflow-hidden rounded-full bg-accent-soft" aria-hidden>
      <div
        className="h-full rounded-full bg-accent shadow-[0_0_8px_var(--accent)] transition-[width] duration-500"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
