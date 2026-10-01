'use client';

import { useState } from 'react';
import type { PhasePatch } from '@/lib/queries/boardPhases';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PhaseData } from './boardFlow';
import { GoalLinkField, GoalLinkStatus } from './goalLinks';
import { DoneToggle } from './NodePanel';

interface PhasePanelProps {
  data: PhaseData;
  onSave: (patch: PhasePatch) => Promise<boolean>;
  onDelete: () => void;
  onClose: () => void;
}

// A phase's settings: its name, done, and the goal it answers to. Deleting it
// keeps its ideas on the canvas. Reading it is NodeReading's job.
export function PhasePanel({ data, onSave, onDelete, onClose }: PhasePanelProps) {
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
      <DoneToggle done={done} onToggle={() => setDone((d) => !d)} />
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
