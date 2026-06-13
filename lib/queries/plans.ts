import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, WorkoutPlan, PlanExercise, PlanSet } from '@/lib/db/types';
import {
  fetchExercisesById,
  type ExerciseLite,
  type PlanWithExercises,
  type PlanListItem,
} from './fitness';

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
