'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fitnessKeys, type SessionSetGroup, type SessionWithSets } from '@/lib/queries/fitness';
import {
  addSessionSet,
  deleteSession,
  deleteSessionSet,
  getSessionWithSets,
  updateSession,
  updateSessionSet,
  type SessionSetPatch,
} from '@/lib/queries/sessions';
import { recomputePlanTargets, type PlanAutoUpdate } from '@/lib/queries/plans';
import type { Exercise, SessionSet } from '@/lib/db/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseBlock } from './SessionExerciseBlock';

function nextPosition(data: SessionWithSets): number {
  let max = -1;
  for (const group of data.groups) {
    for (const set of group.sets) max = Math.max(max, set.position);
  }
  return max + 1;
}

function countSets(data: SessionWithSets): { done: number; total: number } {
  let done = 0; let total = 0;
  for (const group of data.groups) {
    for (const set of group.sets) { total += 1; if (set.completed) done += 1; }
  }
  return { done, total };
}

interface ActiveSessionProps {
  sessionId: string;
  onFinish: () => void;
}

function fmtTarget(v: { weight: number | null; reps: number | null }): string {
  const reps = v.reps ?? '—';
  return v.weight != null && v.weight > 0 ? `${v.weight} kg × ${reps}` : `${reps} reps`;
}

function PlanUpdateSummary({ updates, onDone }: { updates: PlanAutoUpdate[]; onDone: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workout saved</h1>
        <p className="mt-1 text-sm text-muted">
          {updates.length} plan {updates.length === 1 ? 'target' : 'targets'} updated — you beat your plan.
        </p>
      </div>
      <Card>
        <CardTitle className="mb-3">Plan progress</CardTitle>
        <ul className="space-y-2.5">
          {updates.map((u, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium">{u.exerciseName}</span>
              <span className="shrink-0 nums text-muted">
                {fmtTarget(u.from)} → <span className="font-semibold text-foreground">{fmtTarget(u.to)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Button className="w-full" onClick={onDone}>Done</Button>
    </div>
  );
}

export function ActiveSession({ sessionId, onFinish }: ActiveSessionProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: fitnessKeys.session(sessionId),
    queryFn: () => getSessionWithSets(supabase, sessionId),
    staleTime: Infinity,
  });

  const patch = (updater: (prev: SessionWithSets) => SessionWithSets) =>
    queryClient.setQueryData<SessionWithSets>(fitnessKeys.session(sessionId), (prev) =>
      prev ? updater(prev) : prev,
    );

  const replaceSet = (set: SessionSet) =>
    patch((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => ({ ...g, sets: g.sets.map((s) => (s.id === set.id ? set : s)) })),
    }));

  const mergeSet = (setId: string, fields: SessionSetPatch) =>
    patch((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => ({
        ...g,
        sets: g.sets.map((s) => (s.id === setId ? { ...s, ...fields } : s)),
      })),
    }));

  const updateSetMutation = useMutation({
    mutationFn: ({ setId, fields }: { setId: string; fields: SessionSetPatch }) =>
      updateSessionSet(supabase, setId, fields),
    onMutate: ({ setId, fields }) => mergeSet(setId, fields),
    onSuccess: (set) => replaceSet(set),
    onError: () => queryClient.invalidateQueries({ queryKey: fitnessKeys.session(sessionId) }),
  });

  const addSetMutation = useMutation({
    mutationFn: (group: SessionSetGroup) => {
      const last = group.sets.at(-1);
      return addSessionSet(supabase, {
        session_id: sessionId,
        exercise_id: group.exercise_id,
        set_number: group.sets.length + 1,
        position: data ? nextPosition(data) : group.sets.length,
        reps: last?.reps ?? null,
        weight: last?.weight ?? null,
      });
    },
    onSuccess: (set) =>
      patch((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.exercise_id === set.exercise_id ? { ...g, sets: [...g.sets, set] } : g,
        ),
      })),
  });

  const addExerciseMutation = useMutation({
    mutationFn: (exercise: Exercise) =>
      addSessionSet(supabase, {
        session_id: sessionId,
        exercise_id: exercise.id,
        set_number: 1,
        position: data ? nextPosition(data) : 0,
      }),
    onSuccess: (set, exercise) =>
      patch((prev) => ({
        ...prev,
        groups: [
          ...prev.groups,
          { exercise_id: exercise.id, exercise: { id: exercise.id, name: exercise.name, category: exercise.category }, sets: [set] },
        ],
      })),
  });

  const removeSetMutation = useMutation({
    mutationFn: (setId: string) => deleteSessionSet(supabase, setId),
    onSuccess: (_d, setId) =>
      patch((prev) => ({
        ...prev,
        groups: prev.groups
          .map((g) => ({ ...g, sets: g.sets.filter((s) => s.id !== setId) }))
          .filter((g) => g.sets.length > 0),
      })),
  });

  const finishMutation = useMutation({
    mutationFn: async (notes: string | null) => {
      await updateSession(supabase, sessionId, { notes });
      return recomputePlanTargets(supabase, sessionId);
    },
    onSuccess: (updates) => {
      queryClient.invalidateQueries({ queryKey: fitnessKeys.sessions() });
      if (updates.length > 0) {
        queryClient.invalidateQueries({ queryKey: fitnessKeys.plans() });
        setPlanUpdates(updates);
      } else {
        onFinish();
      }
    },
  });

  const discardMutation = useMutation({
    mutationFn: () => deleteSession(supabase, sessionId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: fitnessKeys.session(sessionId) });
      onFinish();
    },
  });

  const [notes, setNotes] = useState('');
  const [planUpdates, setPlanUpdates] = useState<PlanAutoUpdate[] | null>(null);

  if (planUpdates) return <PlanUpdateSummary updates={planUpdates} onDone={onFinish} />;

  if (isPending) return <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Loading session…</div>;
  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>;

  const { session, groups } = data;
  const { done, total } = countSets(data);
  const setBusy = updateSetMutation.isPending || addSetMutation.isPending || removeSetMutation.isPending;

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{session.title ?? 'Workout'}</h1>
        <p className="mt-1 text-sm text-muted">
          {total > 0 ? `${done} / ${total} sets done` : 'No sets yet — add an exercise below.'}
        </p>
      </div>

      {groups.map((group) => (
        <ExerciseBlock
          key={group.exercise_id}
          group={group}
          setBusy={setBusy}
          onToggle={(set) => updateSetMutation.mutate({ setId: set.id, fields: { completed: !set.completed } })}
          onCommit={(setId, fields) => updateSetMutation.mutate({ setId, fields })}
          onAddSet={() => addSetMutation.mutate(group)}
          onRemoveSet={(setId) => removeSetMutation.mutate(setId)}
        />
      ))}

      <Card>
        <CardTitle className="mb-3">Add exercise</CardTitle>
        <ExercisePicker onSelect={(exercise) => addExerciseMutation.mutate(exercise)} />
        {addExerciseMutation.isPending ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Spinner /> Adding…</p>
        ) : null}
      </Card>

      <Card>
        <CardTitle className="mb-3">Session notes</CardTitle>
        <TextArea
          value={notes}
          placeholder="How did it go? (optional)"
          rows={4}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-background/95 p-3 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Button
            variant="ghost"
            disabled={finishMutation.isPending || discardMutation.isPending}
            onClick={() => {
              if (confirm('Discard this workout? Logged sets will be deleted.')) {
                discardMutation.mutate();
              }
            }}
          >
            Discard
          </Button>
          <Button
            className="flex-1"
            disabled={finishMutation.isPending || discardMutation.isPending}
            onClick={() => finishMutation.mutate(notes.trim() || null)}
          >
            {finishMutation.isPending ? <Spinner /> : <Check className="h-4 w-4" />}
            Finish workout
          </Button>
        </div>
      </div>
    </div>
  );
}
