'use client';

import { useState } from 'react';
import { Check, Dumbbell, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NumberField } from '@/components/ui/NumberField';
import type { SessionSet } from '@/lib/db/types';
import type { SessionSetGroup } from '@/lib/queries/fitness';
import type { SessionSetPatch } from '@/lib/queries/sessions';
import { Card } from '@/components/ui/Card';

// ---------------------------------------------------------------------------
// ExerciseBlock — one exercise group within an active session
// ---------------------------------------------------------------------------

export interface ExerciseBlockProps {
  group: SessionSetGroup;
  setBusy: boolean;
  onToggle: (set: SessionSet) => void;
  onCommit: (setId: string, fields: SessionSetPatch) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
}

export function ExerciseBlock({
  group,
  setBusy,
  onToggle,
  onCommit,
  onAddSet,
  onRemoveSet,
}: ExerciseBlockProps) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Dumbbell className="h-4 w-4 shrink-0 text-muted" />
        <h2 className="min-w-0 flex-1 truncate font-semibold">
          {group.exercise?.name ?? 'Unknown exercise'}
        </h2>
      </div>

      <div className="mb-1 flex items-center gap-2 px-1 text-xs font-medium text-muted">
        <span className="w-8">Set</span>
        <span className="flex-1 text-center">Reps</span>
        <span className="flex-1 text-center">Weight</span>
        <span className="w-11 text-center">Done</span>
        <span className="w-9" />
      </div>

      <ul className="space-y-2">
        {group.sets.map((set, index) => (
          <SessionSetRow
            key={set.id}
            set={set}
            number={index + 1}
            busy={setBusy}
            onToggle={() => onToggle(set)}
            onCommit={(fields) => onCommit(set.id, fields)}
            onRemove={() => onRemoveSet(set.id)}
          />
        ))}
      </ul>

      <Button size="sm" variant="secondary" className="mt-3" disabled={setBusy} onClick={onAddSet}>
        <Plus className="h-4 w-4" />
        Add set
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SessionSetRow — one set row inside an ExerciseBlock
// ---------------------------------------------------------------------------

function parseNum(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

interface SessionSetRowProps {
  set: SessionSet;
  number: number;
  busy: boolean;
  onToggle: () => void;
  onCommit: (fields: SessionSetPatch) => void;
  onRemove: () => void;
}

function SessionSetRow({ set, number, busy, onToggle, onCommit, onRemove }: SessionSetRowProps) {
  const [reps, setReps] = useState(set.reps?.toString() ?? '');
  const [weight, setWeight] = useState(set.weight?.toString() ?? '');

  function commit(field: 'reps' | 'weight', raw: string, original: number | null) {
    const next = parseNum(raw);
    if (next !== original) onCommit({ [field]: next });
  }

  return (
    <li className="flex items-center gap-2">
      <span className="w-8 text-sm font-medium text-muted">{number}</span>
      <div className="flex-1">
        <NumberField
          aria-label={`Set ${number} reps`}
          value={reps}
          placeholder="—"
          onChange={(e) => setReps(e.target.value)}
          onBlur={() => commit('reps', reps, set.reps)}
        />
      </div>
      <div className="flex-1">
        <NumberField
          decimal
          aria-label={`Set ${number} weight`}
          value={weight}
          placeholder="—"
          onChange={(e) => setWeight(e.target.value)}
          onBlur={() => commit('weight', weight, set.weight)}
        />
      </div>
      <button
        type="button"
        aria-label={set.completed ? `Mark set ${number} not done` : `Mark set ${number} done`}
        aria-pressed={set.completed}
        onClick={onToggle}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
          set.completed
            ? 'border-green-600 bg-green-600 text-white'
            : 'border-border bg-card text-muted hover:border-accent'
        }`}
      >
        <Check className="h-5 w-5" />
      </button>
      <Button size="icon" variant="ghost" aria-label={`Remove set ${number}`} disabled={busy} onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}
