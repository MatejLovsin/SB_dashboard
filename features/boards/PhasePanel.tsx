'use client';

import { useState } from 'react';
import { Circle, CircleCheck } from 'lucide-react';
import type { PhasePatch } from '@/lib/queries/boardPhases';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PhaseData } from './boardFlow';
import { GoalLinkField, GoalLinkStatus } from './goalLinks';

interface PhasePanelProps {
  data: PhaseData;
  canEdit: boolean;
  onSave: (patch: PhasePatch) => Promise<boolean>;
  onDelete: () => void;
  onClose: () => void;
}

// A phase's settings: its name, done, and the goal it answers to. Deleting it
// keeps its ideas on the canvas.
export function PhasePanel({ data, canEdit, onSave, onDelete, onClose }: PhasePanelProps) {
  if (!canEdit) {
    return (
      <div className="space-y-4">
        <GoalLinkStatus goalId={data.goalId} />
        {data.done ? (
          <span className="label flex items-center gap-1.5 text-[11px] text-accent">
            <CircleCheck className="h-3.5 w-3.5" /> Done
          </span>
        ) : null}
        {!data.goalId && !data.done ? (
          <p className="text-sm text-muted">A phase of this board.</p>
        ) : null}
      </div>
    );
  }
  return <PhaseEditing data={data} onSave={onSave} onDelete={onDelete} onClose={onClose} />;
}

function PhaseEditing({ data, onSave, onDelete, onClose }: Omit<PhasePanelProps, 'canEdit'>) {
  const [title, setTitle] = useState(data.title);
  const [done, setDone] = useState(data.done);
  const [goalId, setGoalId] = useState(data.goalId ?? '');
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    const ok = await onSave({ title: title.trim(), done, goal_id: goalId || null });
    setPending(false);
    if (ok) onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Phase"
        id="phase-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        required
        autoFocus
      />
      <button
        type="button"
        aria-pressed={done}
        onClick={() => setDone((d) => !d)}
        className={`flex items-center gap-2 text-sm transition-colors ${
          done ? 'text-accent' : 'text-muted hover:text-foreground'
        }`}
      >
        {done ? <CircleCheck className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        {done ? 'Done' : 'Mark as done'}
      </button>
      <GoalLinkField value={goalId} onChange={setGoalId} />
      {goalId === (data.goalId ?? '') ? <GoalLinkStatus goalId={data.goalId} /> : null}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={!title.trim() || pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          className="ml-auto"
          onClick={() => (confirming ? onDelete() : setConfirming(true))}
        >
          {confirming ? 'Delete? Ideas stay' : 'Delete phase'}
        </Button>
      </div>
    </form>
  );
}
