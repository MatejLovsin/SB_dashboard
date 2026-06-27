import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, WorkoutSession, SessionSet } from '@/lib/db/types';
import {
  fetchExercisesById,
  type ExerciseLite,
  type SessionSetGroup,
  type SessionWithSets,
} from './fitness';
import { getPlanWithExercises } from './plans';

type Client = SupabaseClient<Database>;

export type SessionSetInput = {
  session_id: string;
  exercise_id: string;
  set_number: number;
  position: number;
  reps?: number | null;
  weight?: number | null;
  completed?: boolean;
};

export type SessionSetPatch = {
  reps?: number | null;
  weight?: number | null;
  completed?: boolean;
};

function groupSessionSets(
  sets: SessionSet[],
  exerciseById: Map<string, ExerciseLite>,
): SessionSetGroup[] {
  const groups: SessionSetGroup[] = [];
  const indexByExercise = new Map<string, number>();
  for (const set of sets) {
    let index = indexByExercise.get(set.exercise_id);
    if (index === undefined) {
      index = groups.length;
      indexByExercise.set(set.exercise_id, index);
      groups.push({ exercise_id: set.exercise_id, exercise: exerciseById.get(set.exercise_id) ?? null, sets: [] });
    }
    groups[index].sets.push(set);
  }
  return groups;
}

export async function startSession(
  client: Client,
  input: { plan_id?: string | null; title?: string | null; performed_at?: string } = {},
): Promise<SessionWithSets> {
  const { data, error } = await client
    .from('workout_sessions')
    .insert({
      plan_id: input.plan_id ?? null,
      title: input.title ?? null,
      ...(input.performed_at ? { performed_at: input.performed_at } : {}),
    })
    .select('*')
    .single();
  if (error) throw error;
  return { session: data, groups: [] };
}

export async function startSessionFromPlan(
  client: Client,
  planId: string,
  opts: { performed_at?: string } = {},
): Promise<SessionWithSets> {
  const { plan, lines } = await getPlanWithExercises(client, planId);

  const { data: session, error: sessionError } = await client
    .from('workout_sessions')
    .insert({
      plan_id: planId,
      title: plan.name,
      ...(opts.performed_at ? { performed_at: opts.performed_at } : {}),
    })
    .select('*')
    .single();
  if (sessionError) throw sessionError;

  const rows: Database['public']['Tables']['session_sets']['Insert'][] = [];
  let position = 0;
  for (const line of lines) {
    const templateSets = line.sets.length > 0 ? line.sets : [null];
    templateSets.forEach((set, index) => {
      rows.push({
        session_id: session.id,
        exercise_id: line.exercise_id,
        plan_set_id: set?.id ?? null,
        set_number: index + 1,
        position: position++,
        reps: set?.target_reps ?? null,
        weight: set?.target_weight ?? null,
      });
    });
  }

  let inserted: SessionSet[] = [];
  if (rows.length > 0) {
    const { data, error: setsError } = await client.from('session_sets').insert(rows).select('*');
    if (setsError) throw setsError;
    inserted = data ?? [];
  }
  inserted.sort((a, b) => a.position - b.position);

  const exerciseById = new Map<string, ExerciseLite>();
  for (const line of lines) {
    if (line.exercise) exerciseById.set(line.exercise.id, line.exercise);
  }

  return { session, groups: groupSessionSets(inserted, exerciseById) };
}

export async function getSessionWithSets(
  client: Client,
  sessionId: string,
): Promise<SessionWithSets> {
  const [{ data: session, error: sessionError }, { data: sets, error: setsError }] =
    await Promise.all([
      client.from('workout_sessions').select('*').eq('id', sessionId).single(),
      client
        .from('session_sets')
        .select('*')
        .eq('session_id', sessionId)
        .order('position')
        .order('set_number'),
    ]);
  if (sessionError) throw sessionError;
  if (setsError) throw setsError;

  const setRows = sets ?? [];
  const exerciseIds = [...new Set(setRows.map((s) => s.exercise_id))];
  const exerciseById = await fetchExercisesById(client, exerciseIds);
  const liteById = new Map<string, ExerciseLite>();
  for (const [id, ex] of exerciseById) {
    liteById.set(id, { id: ex.id, name: ex.name, category: ex.category });
  }

  return { session, groups: groupSessionSets(setRows, liteById) };
}

export async function addSessionSet(client: Client, input: SessionSetInput): Promise<SessionSet> {
  const { data, error } = await client
    .from('session_sets')
    .insert({
      session_id: input.session_id,
      exercise_id: input.exercise_id,
      set_number: input.set_number,
      position: input.position,
      reps: input.reps ?? null,
      weight: input.weight ?? null,
      completed: input.completed ?? false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateSessionSet(
  client: Client,
  setId: string,
  patch: SessionSetPatch,
): Promise<SessionSet> {
  const { data, error } = await client
    .from('session_sets')
    .update(patch)
    .eq('id', setId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSessionSet(client: Client, setId: string): Promise<void> {
  const { error } = await client.from('session_sets').delete().eq('id', setId);
  if (error) throw error;
}

export async function updateSession(
  client: Client,
  sessionId: string,
  patch: { notes?: string | null; title?: string | null; performed_at?: string },
): Promise<WorkoutSession> {
  const { data, error } = await client
    .from('workout_sessions')
    .update(patch)
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(client: Client, sessionId: string): Promise<void> {
  const { error } = await client.from('workout_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}
