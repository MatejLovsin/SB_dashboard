import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, WorkoutPlan, PlanExercise, PlanSet } from '@/lib/db/types';
import {
  fetchExercisesById,
  type ExerciseLite,
  type PlanWithExercises,
  type PlanListItem,
} from './fitness';
import { estimatedOneRepMax, progressedTarget } from '@/lib/utils/stats';

type Client = SupabaseClient<Database>;

export type PlanInput = { name: string; category?: string | null; notes?: string | null };
export type PlanSetTargets = { target_reps?: number | null; target_weight?: number | null };

async function fetchSetsByLine(
  client: Client,
  lineIds: string[],
): Promise<Map<string, PlanSet[]>> {
  const map = new Map<string, PlanSet[]>();
  if (lineIds.length === 0) return map;
  const { data, error } = await client
    .from('plan_sets')
    .select('*')
    .in('plan_exercise_id', lineIds)
    .order('position')
    .order('created_at');
  if (error) throw error;
  for (const set of data ?? []) {
    const existing = map.get(set.plan_exercise_id);
    if (existing) existing.push(set);
    else map.set(set.plan_exercise_id, [set]);
  }
  return map;
}

export async function listPlans(client: Client): Promise<PlanListItem[]> {
  const [{ data: plans, error: plansError }, { data: lines, error: linesError }] =
    await Promise.all([
      client.from('workout_plans').select('*').order('updated_at', { ascending: false }),
      client.from('plan_exercises').select('plan_id'),
    ]);
  if (plansError) throw plansError;
  if (linesError) throw linesError;

  const counts = new Map<string, number>();
  for (const { plan_id } of lines ?? []) {
    counts.set(plan_id, (counts.get(plan_id) ?? 0) + 1);
  }
  return (plans ?? []).map((plan) => ({ ...plan, exerciseCount: counts.get(plan.id) ?? 0 }));
}

export async function getPlanWithExercises(
  client: Client,
  planId: string,
): Promise<PlanWithExercises> {
  const [{ data: plan, error: planError }, { data: lines, error: linesError }] =
    await Promise.all([
      client.from('workout_plans').select('*').eq('id', planId).single(),
      client
        .from('plan_exercises')
        .select('*')
        .eq('plan_id', planId)
        .order('position')
        .order('created_at'),
    ]);
  if (planError) throw planError;
  if (linesError) throw linesError;

  const lineRows = lines ?? [];
  const exerciseIds = [...new Set(lineRows.map((l) => l.exercise_id))];
  const lineIds = lineRows.map((l) => l.id);

  const [exerciseById, setsByLine] = await Promise.all([
    fetchExercisesById(client, exerciseIds),
    fetchSetsByLine(client, lineIds),
  ]);

  return {
    plan,
    lines: lineRows.map((line) => ({
      ...line,
      exercise: (exerciseById.get(line.exercise_id) as ExerciseLite | undefined) ?? null,
      sets: setsByLine.get(line.id) ?? [],
    })),
  };
}

export async function createPlan(client: Client, input: PlanInput): Promise<WorkoutPlan> {
  const { data, error } = await client
    .from('workout_plans')
    .insert({ name: input.name.trim(), category: input.category ?? null, notes: input.notes ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlan(
  client: Client,
  planId: string,
  patch: Partial<PlanInput>,
): Promise<WorkoutPlan> {
  const { data, error } = await client
    .from('workout_plans')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    })
    .eq('id', planId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlan(client: Client, planId: string): Promise<void> {
  const { error } = await client.from('workout_plans').delete().eq('id', planId);
  if (error) throw error;
}

export async function addPlanExercise(
  client: Client,
  input: { plan_id: string; exercise_id: string; position: number },
): Promise<PlanExercise> {
  const { data, error } = await client
    .from('plan_exercises')
    .insert({ plan_id: input.plan_id, exercise_id: input.exercise_id, position: input.position })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlanExercise(client: Client, lineId: string): Promise<void> {
  const { error } = await client.from('plan_exercises').delete().eq('id', lineId);
  if (error) throw error;
}

export async function reorderPlanExercises(
  client: Client,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      client
        .from('plan_exercises')
        .update({ position: index })
        .eq('id', id)
        .then(({ error }) => { if (error) throw error; }),
    ),
  );
}

export async function addPlanSet(
  client: Client,
  input: { plan_exercise_id: string; position: number } & PlanSetTargets,
): Promise<PlanSet> {
  const { data, error } = await client
    .from('plan_sets')
    .insert({
      plan_exercise_id: input.plan_exercise_id,
      position: input.position,
      target_reps: input.target_reps ?? null,
      target_weight: input.target_weight ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlanSet(
  client: Client,
  setId: string,
  patch: PlanSetTargets,
): Promise<PlanSet> {
  const { data, error } = await client
    .from('plan_sets')
    .update(patch)
    .eq('id', setId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlanSet(client: Client, setId: string): Promise<void> {
  const { error } = await client.from('plan_sets').delete().eq('id', setId);
  if (error) throw error;
}

export type PlanAutoUpdate = {
  exerciseName: string;
  from: { weight: number | null; reps: number | null };
  to: { weight: number | null; reps: number };
};

// Called when a workout is finished. Ratchets the source plan's per-set targets up to
// match any set the user overperformed (see `progressedTarget`). Only sets seeded from
// the plan (plan_set_id set) are considered; ad-hoc sets never touch the plan. Returns a
// summary of what changed — empty if the session wasn't from a plan or nothing improved.
export async function applyPlanProgress(
  client: Client,
  sessionId: string,
): Promise<PlanAutoUpdate[]> {
  const { data: session, error: sessionError } = await client
    .from('workout_sessions')
    .select('id, plan_id')
    .eq('id', sessionId)
    .single();
  if (sessionError) throw sessionError;
  if (!session.plan_id) return [];

  const { data: sets, error: setsError } = await client
    .from('session_sets')
    .select('exercise_id, plan_set_id, reps, weight')
    .eq('session_id', sessionId)
    .eq('completed', true)
    .not('plan_set_id', 'is', null);
  if (setsError) throw setsError;
  const performed = sets ?? [];
  if (performed.length === 0) return [];

  // Best performed set per plan set (normally 1:1, but stay safe if it isn't).
  type Best = { exercise_id: string; weight: number | null; reps: number | null; e: number };
  const bestByPlanSet = new Map<string, Best>();
  for (const s of performed) {
    const id = s.plan_set_id as string;
    const e =
      s.weight != null && s.weight > 0 && s.reps != null
        ? estimatedOneRepMax(s.weight, s.reps)
        : (s.reps ?? 0);
    const prev = bestByPlanSet.get(id);
    if (!prev || e > prev.e) bestByPlanSet.set(id, { exercise_id: s.exercise_id, weight: s.weight, reps: s.reps, e });
  }

  const { data: planSets, error: planSetsError } = await client
    .from('plan_sets')
    .select('*')
    .in('id', [...bestByPlanSet.keys()]);
  if (planSetsError) throw planSetsError;
  const planSetById = new Map((planSets ?? []).map((ps) => [ps.id, ps]));

  const exById = await fetchExercisesById(
    client,
    [...new Set([...bestByPlanSet.values()].map((b) => b.exercise_id))],
  );

  const updates: PlanAutoUpdate[] = [];
  const writes: PromiseLike<unknown>[] = [];
  for (const [planSetId, achieved] of bestByPlanSet) {
    const planSet = planSetById.get(planSetId);
    if (!planSet) continue;
    const next = progressedTarget(
      { target_weight: planSet.target_weight, target_reps: planSet.target_reps },
      { weight: achieved.weight, reps: achieved.reps },
    );
    if (!next) continue;
    updates.push({
      exerciseName: exById.get(achieved.exercise_id)?.name ?? 'Exercise',
      from: { weight: planSet.target_weight, reps: planSet.target_reps },
      to: { weight: next.target_weight, reps: next.target_reps },
    });
    writes.push(
      client.from('plan_sets').update(next).eq('id', planSetId).then(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  if (updates.length > 0) {
    writes.push(
      client
        .from('workout_plans')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.plan_id)
        .then(({ error }) => {
          if (error) throw error;
        }),
    );
  }
  await Promise.all(writes);
  return updates;
}
