import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  WorkoutPlan,
  PlanExercise,
  PlanSet,
  PlanTargetChange,
} from '@/lib/db/types';
import {
  fetchExercisesById,
  type ExerciseLite,
  type PlanWithExercises,
  type PlanListItem,
} from './fitness';
import { bestTargetFromHistory, type PerformedSet, type Target } from '@/lib/utils/stats';

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
  const reps = input.target_reps ?? null;
  const weight = input.target_weight ?? null;
  const { data, error } = await client
    .from('plan_sets')
    .insert({
      plan_exercise_id: input.plan_exercise_id,
      position: input.position,
      target_reps: reps,
      target_weight: weight,
      // A newly authored set's target IS its baseline (the floor progression respects).
      base_reps: reps,
      base_weight: weight,
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
  // A manual target edit is a new intentional baseline — mirror it into base_* so
  // progression floors at the value you just typed (and can walk back down to it).
  const update: Database['public']['Tables']['plan_sets']['Update'] = { ...patch };
  if ('target_reps' in patch) update.base_reps = patch.target_reps ?? null;
  if ('target_weight' in patch) update.base_weight = patch.target_weight ?? null;
  const { data, error } = await client
    .from('plan_sets')
    .update(update)
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

export type PlanAutoUpdate = PlanTargetChange;

// Persist (or clear) the plan changes a session caused, for the "Plan updated" banner.
async function storePlanUpdates(
  client: Client,
  sessionId: string,
  updates: PlanAutoUpdate[],
): Promise<void> {
  const { error } = await client
    .from('workout_sessions')
    .update({ plan_updates: updates.length > 0 ? updates : null })
    .eq('id', sessionId);
  if (error) throw error;
}

// Re-derive the source plan's per-set targets from the full logged history and record
// what moved. Runs on Finish and whenever a session's sets are edited, so it self-heals:
// beating your plan raises a target (higher est-1RM, weight never below baseline), while
// correcting or deleting the set that caused a bump walks the target back down. Only sets
// seeded from the plan (plan_set_id set) count; ad-hoc sets never touch the plan. Returns —
// and stores on the session — the changes this recompute produced (empty if none / not a plan).
export async function recomputePlanTargets(
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

  // Plan sets this session is tied to — the only targets it can move.
  const { data: ownSets, error: ownError } = await client
    .from('session_sets')
    .select('plan_set_id')
    .eq('session_id', sessionId)
    .not('plan_set_id', 'is', null);
  if (ownError) throw ownError;
  const planSetIds = [...new Set((ownSets ?? []).map((s) => s.plan_set_id as string))];
  if (planSetIds.length === 0) {
    await storePlanUpdates(client, sessionId, []);
    return [];
  }

  // Baselines + current targets, and the full completed history across ALL sessions.
  const [{ data: planSets, error: planSetsError }, { data: history, error: historyError }] =
    await Promise.all([
      client.from('plan_sets').select('*').in('id', planSetIds),
      client
        .from('session_sets')
        .select('plan_set_id, exercise_id, reps, weight')
        .in('plan_set_id', planSetIds)
        .eq('completed', true),
    ]);
  if (planSetsError) throw planSetsError;
  if (historyError) throw historyError;

  const historyByPlanSet = new Map<string, PerformedSet[]>();
  const exerciseByPlanSet = new Map<string, string>();
  for (const h of history ?? []) {
    const id = h.plan_set_id as string;
    const list = historyByPlanSet.get(id);
    if (list) list.push({ weight: h.weight, reps: h.reps });
    else historyByPlanSet.set(id, [{ weight: h.weight, reps: h.reps }]);
    if (!exerciseByPlanSet.has(id)) exerciseByPlanSet.set(id, h.exercise_id);
  }

  const exById = await fetchExercisesById(client, [...new Set([...exerciseByPlanSet.values()])]);

  const updates: PlanAutoUpdate[] = [];
  const writes: PromiseLike<unknown>[] = [];
  for (const ps of planSets ?? []) {
    const baseline: Target = {
      target_weight: ps.base_weight ?? ps.target_weight,
      target_reps: ps.base_reps ?? ps.target_reps,
    };
    const next = bestTargetFromHistory(baseline, historyByPlanSet.get(ps.id) ?? []);
    if (next.target_weight === ps.target_weight && next.target_reps === ps.target_reps) continue;
    updates.push({
      exerciseName: exById.get(exerciseByPlanSet.get(ps.id) ?? '')?.name ?? 'Exercise',
      from: { weight: ps.target_weight, reps: ps.target_reps },
      to: { weight: next.target_weight, reps: next.target_reps },
    });
    writes.push(
      client
        .from('plan_sets')
        .update({ target_weight: next.target_weight, target_reps: next.target_reps })
        .eq('id', ps.id)
        .then(({ error }) => {
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
  await storePlanUpdates(client, sessionId, updates);
  return updates;
}
