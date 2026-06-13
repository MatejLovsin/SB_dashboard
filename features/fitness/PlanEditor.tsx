'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fitnessKeys, type PlanExerciseLine, type PlanWithExercises } from '@/lib/queries/fitness';
import {
  addPlanExercise,
  addPlanSet,
  deletePlanExercise,
  deletePlanSet,
  getPlanWithExercises,
  reorderPlanExercises,
  updatePlan,
  updatePlanSet,
  type PlanInput,
  type PlanSetTargets,
} from '@/lib/queries/plans';
import type { Exercise } from '@/lib/db/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlanForm } from './PlanForm';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseCard } from './PlanExerciseRow';

export function PlanEditor({ planId }: { planId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [savedMeta, setSavedMeta] = useState(false);

  const { data, isPending, isError, error } = useQuery({
    queryKey: fitnessKeys.plan(planId),
    queryFn: () => getPlanWithExercises(supabase, planId),
  });

  const patchPlan = (updater: (prev: PlanWithExercises) => PlanWithExercises) =>
    queryClient.setQueryData<PlanWithExercises>(fitnessKeys.plan(planId), (prev) =>
      prev ? updater(prev) : prev,
    );

  const markPlanListStale = () =>
    queryClient.invalidateQueries({ queryKey: fitnessKeys.plans() });

  const mapLine = (lineId: string, fn: (l: PlanExerciseLine) => PlanExerciseLine) =>
    patchPlan((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === lineId ? fn(l) : l)),
    }));

  const metaMutation = useMutation({
    mutationFn: (values: PlanInput) => updatePlan(supabase, planId, values),
    onSuccess: (plan) => {
      patchPlan((prev) => ({ ...prev, plan }));
      markPlanListStale();
      setSavedMeta(true);
      setTimeout(() => setSavedMeta(false), 2000);
    },
  });

  const addExerciseMutation = useMutation({
    mutationFn: (exercise: Exercise) =>
      addPlanExercise(supabase, {
        plan_id: planId,
        exercise_id: exercise.id,
        position: data?.lines.length ?? 0,
      }),
    onSuccess: (planExercise, exercise) => {
      patchPlan((prev) => ({
        ...prev,
        lines: [
          ...prev.lines,
          { ...planExercise, exercise: { id: exercise.id, name: exercise.name, category: exercise.category }, sets: [] },
        ],
      }));
      markPlanListStale();
    },
  });

  const removeExerciseMutation = useMutation({
    mutationFn: (lineId: string) => deletePlanExercise(supabase, lineId),
    onSuccess: (_d, lineId) => {
      patchPlan((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== lineId) }));
      markPlanListStale();
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderPlanExercises(supabase, orderedIds),
    onSuccess: (_d, orderedIds) =>
      patchPlan((prev) => {
        const byId = new Map(prev.lines.map((l) => [l.id, l]));
        return {
          ...prev,
          lines: orderedIds.flatMap((id, i) => {
            const l = byId.get(id);
            return l ? [{ ...l, position: i }] : [];
          }),
        };
      }),
  });

  const addSetMutation = useMutation({
    mutationFn: (input: { plan_exercise_id: string; position: number } & PlanSetTargets) =>
      addPlanSet(supabase, input),
    onSuccess: (set) => mapLine(set.plan_exercise_id, (l) => ({ ...l, sets: [...l.sets, set] })),
  });

  const updateSetMutation = useMutation({
    mutationFn: ({ setId, patch }: { setId: string; patch: PlanSetTargets }) =>
      updatePlanSet(supabase, setId, patch),
    onSuccess: (set) =>
      mapLine(set.plan_exercise_id, (l) => ({
        ...l,
        sets: l.sets.map((s) => (s.id === set.id ? set : s)),
      })),
  });

  const removeSetMutation = useMutation({
    mutationFn: (setId: string) => deletePlanSet(supabase, setId),
    onSuccess: (_d, setId) =>
      patchPlan((prev) => ({
        ...prev,
        lines: prev.lines.map((l) => ({ ...l, sets: l.sets.filter((s) => s.id !== setId) })),
      })),
  });

  function move(index: number, direction: -1 | 1) {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.lines.length) return;
    const ids = data.lines.map((l) => l.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderMutation.mutate(ids);
  }

  function addSet(line: PlanExerciseLine) {
    const last = line.sets.at(-1);
    addSetMutation.mutate({
      plan_exercise_id: line.id,
      position: line.sets.length,
      target_reps: last?.target_reps ?? null,
      target_weight: last?.target_weight ?? null,
    });
  }

  if (isPending) {
    return <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Loading plan…</div>;
  }
  if (isError) {
    return (
      <div>
        <BackLink />
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
      </div>
    );
  }

  const { plan, lines } = data;
  const setBusy = addSetMutation.isPending || updateSetMutation.isPending || removeSetMutation.isPending;
  const exerciseBusy = reorderMutation.isPending || removeExerciseMutation.isPending;

  return (
    <div className="space-y-5">
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{plan.name}</h1>
      </div>

      <Card>
        <CardTitle className="mb-4">Details</CardTitle>
        <PlanForm
          key={plan.id}
          defaultValues={{ name: plan.name, category: plan.category, notes: plan.notes }}
          submitLabel={savedMeta ? 'Saved' : 'Save details'}
          pending={metaMutation.isPending}
          onSubmit={(values) => metaMutation.mutate(values)}
        />
      </Card>

      <Card>
        <CardTitle className="mb-4">Exercises</CardTitle>
        {lines.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No exercises yet"
            description="Search below to add an exercise, then add its sets one at a time."
            className="mb-4"
          />
        ) : (
          <ul className="mb-4 space-y-3">
            {lines.map((line, index) => (
              <ExerciseCard
                key={line.id}
                line={line}
                isFirst={index === 0}
                isLast={index === lines.length - 1}
                exerciseBusy={exerciseBusy}
                setBusy={setBusy}
                onMoveUp={() => move(index, -1)}
                onMoveDown={() => move(index, 1)}
                onRemove={() => removeExerciseMutation.mutate(line.id)}
                onAddSet={() => addSet(line)}
                onUpdateSet={(setId, patch) => updateSetMutation.mutate({ setId, patch })}
                onRemoveSet={(setId) => removeSetMutation.mutate(setId)}
              />
            ))}
          </ul>
        )}
        <ExercisePicker onSelect={(exercise) => addExerciseMutation.mutate(exercise)} />
        {addExerciseMutation.isPending ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Spinner /> Adding…</p>
        ) : null}
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/fitness/plans" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      All plans
    </Link>
  );
}
