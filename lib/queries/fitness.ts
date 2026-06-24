// Shared foundation: types, query-key factory, exercise dictionary, and the
// fetchExercisesById helper used by both plans.ts and sessions.ts.
// Heavy query logic lives in: plans.ts · sessions.ts · analytics.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  Exercise,
  WorkoutPlan,
  PlanExercise,
  PlanSet,
  WorkoutSession,
  SessionSet,
  BodyMetric,
} from '@/lib/db/types';

export type Client = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Shared type aliases
// ---------------------------------------------------------------------------

export type ExerciseLite = Pick<Exercise, 'id' | 'name' | 'category'>;

export type PlanExerciseLine = PlanExercise & {
  exercise: ExerciseLite | null;
  sets: PlanSet[];
};

export type PlanWithExercises = {
  plan: WorkoutPlan;
  lines: PlanExerciseLine[];
};

export type PlanListItem = WorkoutPlan & { exerciseCount: number };

export type SessionSetGroup = {
  exercise_id: string;
  exercise: ExerciseLite | null;
  sets: SessionSet[];
};

export type SessionWithSets = {
  session: WorkoutSession;
  groups: SessionSetGroup[];
};

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const fitnessKeys = {
  all: ['fitness'] as const,
  exercisesAll: () => [...fitnessKeys.all, 'exercises'] as const,
  exercises: (search: string) => [...fitnessKeys.exercisesAll(), search] as const,
  exercisesList: () => [...fitnessKeys.exercisesAll(), 'list'] as const,
  plans: () => [...fitnessKeys.all, 'plans'] as const,
  plan: (id: string) => [...fitnessKeys.all, 'plan', id] as const,
  sessions: () => [...fitnessKeys.all, 'sessions'] as const,
  session: (id: string) => [...fitnessKeys.all, 'session', id] as const,
  sessionsRange: (from: string) => [...fitnessKeys.all, 'sessions-range', from] as const,
  exerciseHistory: (exerciseId: string) =>
    [...fitnessKeys.all, 'exercise-history', exerciseId] as const,
  bodyMetrics: () => [...fitnessKeys.all, 'body-metrics'] as const,
  exerciseLibrary: () => [...fitnessKeys.all, 'exercise-library'] as const,
};

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

export async function fetchExercisesById(
  client: Client,
  ids: string[],
): Promise<Map<string, Exercise>> {
  const map = new Map<string, Exercise>();
  if (ids.length === 0) return map;
  const { data, error } = await client.from('exercises').select('*').in('id', ids);
  if (error) throw error;
  for (const exercise of data ?? []) map.set(exercise.id, exercise);
  return map;
}

// ---------------------------------------------------------------------------
// Exercises (autocomplete dictionary)
// ---------------------------------------------------------------------------

export async function searchExercises(client: Client, search: string): Promise<Exercise[]> {
  const term = search.trim();
  let query = client.from('exercises').select('*').order('name').limit(20);
  if (term) query = query.ilike('name', `%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Body metrics
// ---------------------------------------------------------------------------

export async function getBodyMetrics(
  client: Client,
  limit = 60,
): Promise<BodyMetric[]> {
  const { data, error } = await client
    .from('body_metrics')
    .select('*')
    .order('recorded_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function logBodyMetric(
  client: Client,
  weight_kg: number,
  bodyfat_pct?: number | null,
): Promise<void> {
  const { error } = await client
    .from('body_metrics')
    .insert({ weight_kg, bodyfat_pct: bodyfat_pct ?? null });
  if (error) throw error;
}

export async function createExercise(
  client: Client,
  input: { name: string; category?: string | null },
): Promise<Exercise> {
  const { data, error } = await client
    .from('exercises')
    .insert({ name: input.name.trim(), category: input.category ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Full exercise dictionary for the Manage exercises screen. Pinned first, then
// alphabetical — so the "important" lifts sit at the top.
export async function listExercises(client: Client): Promise<Exercise[]> {
  const { data, error } = await client
    .from('exercises')
    .select('*')
    .order('pinned', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Renaming is a single UPDATE: every set/plan/history row references
// exercise_id, so the new name propagates everywhere automatically.
export async function renameExercise(
  client: Client,
  id: string,
  name: string,
): Promise<Exercise> {
  const { data, error } = await client
    .from('exercises')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function setExercisePinned(
  client: Client,
  id: string,
  pinned: boolean,
): Promise<Exercise> {
  const { data, error } = await client
    .from('exercises')
    .update({ pinned })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateExerciseNotes(
  client: Client,
  id: string,
  notes: string,
): Promise<Exercise> {
  const { data, error } = await client
    .from('exercises')
    .update({ notes: notes.trim() === '' ? null : notes })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
