'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PlanSet } from '@/lib/db/types';
import type { PlanExerciseLine } from '@/lib/queries/fitness';
import type { PlanSetTargets } from '@/lib/queries/plans';
import { DragHandle, useExerciseSortable } from './SortableExerciseList';
import { EmphasisChip } from './EmphasisChip';

// ---------------------------------------------------------------------------
// ExerciseCard — one plan exercise with its set rows
// ---------------------------------------------------------------------------

export interface ExerciseCardProps {
  line: PlanExerciseLine;
  exerciseBusy: boolean;
  setBusy: boolean;
  onRemove: () => void;
  onCycleEmphasis: () => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, patch: PlanSetTargets) => void;
  onRemoveSet: (setId: string) => void;
}

export function ExerciseCard({
  line,
  exerciseBusy,
  setBusy,
  onRemove,
  onCycleEmphasis,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}: ExerciseCardProps) {
  const { setNodeRef, style, handleProps } = useExerciseSortable(line.id);

  return (
    <li ref={setNodeRef} style={style} className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <DragHandle {...handleProps} />
        <p className="min-w-0 flex-1 truncate self-center font-medium">
          {line.exercise?.name ?? 'Unknown exercise'}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <EmphasisChip value={line.emphasis} disabled={exerciseBusy} onCycle={onCycleEmphasis} />
          <Button size="icon" variant="danger" aria-label="Remove exercise" disabled={exerciseBusy} onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {line.sets.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center gap-2 px-1 text-xs font-medium text-muted">
            <span className="w-10">Set</span>
            <span className="flex-1 text-center">Reps</span>
            <span className="flex-1 text-center">Weight</span>
            <span className="w-9" />
          </div>
          <ul className="space-y-1.5">
            {line.sets.map((set, index) => (
              <SetRow
                key={set.id}
                set={set}
                number={index + 1}
                busy={setBusy}
                onUpdate={(patch) => onUpdateSet(set.id, patch)}
                onRemove={() => onRemoveSet(set.id)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <Button size="sm" variant="secondary" className="mt-3" disabled={setBusy} onClick={onAddSet}>
        <Plus className="h-4 w-4" />
        Add set
      </Button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// SetRow — one set within an exercise card
// ---------------------------------------------------------------------------

function parseNum(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

interface SetRowProps {
  set: PlanSet;
  number: number;
  busy: boolean;
  onUpdate: (patch: PlanSetTargets) => void;
  onRemove: () => void;
}

function SetRow({ set, number, busy, onUpdate, onRemove }: SetRowProps) {
  const [reps, setReps] = useState(set.target_reps?.toString() ?? '');
  const [weight, setWeight] = useState(set.target_weight?.toString() ?? '');

  function commit(field: keyof PlanSetTargets, raw: string, original: number | null) {
    const next = parseNum(raw);
    if (next !== original) onUpdate({ [field]: next });
  }

  return (
    <li className="flex items-center gap-2">
      <span className="w-10 text-sm font-medium text-muted">{number}</span>
      <Input
        type="text"
        inputMode="numeric"
        value={reps}
        placeholder="—"
        className="text-center"
        onChange={(e) => setReps(e.target.value)}
        onBlur={() => commit('target_reps', reps, set.target_reps)}
      />
      <Input
        type="text"
        inputMode="decimal"
        value={weight}
        placeholder="—"
        className="text-center"
        onChange={(e) => setWeight(e.target.value)}
        onBlur={() => commit('target_weight', weight, set.target_weight)}
      />
      <Button size="icon" variant="ghost" aria-label={`Remove set ${number}`} disabled={busy} onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}
