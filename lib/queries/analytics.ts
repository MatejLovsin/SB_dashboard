import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, WorkoutSession, SessionSet } from '@/lib/db/types';

type Client = SupabaseClient<Database>;

export type ExerciseSessionPoint = {
  session: Pick<WorkoutSession, 'id' | 'performed_at' | 'title'>;
  sets: SessionSet[];
};

export async function listSessions(
  client: Client,
  opts?: { from?: string; limit?: number },
): Promise<WorkoutSession[]> {
  let query = client
    .from('workout_sessions')
    .select('*')
    .order('performed_at', { ascending: false });
  if (opts?.from) query = query.gte('performed_at', opts.from);
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSessionSetsBySessionIds(
  client: Client,
  sessionIds: string[],
): Promise<SessionSet[]> {
  if (sessionIds.length === 0) return [];
  const { data, error } = await client
    .from('session_sets')
    .select('*')
    .in('session_id', sessionIds);
  if (error) throw error;
  return data ?? [];
}

export async function getExerciseHistory(
  client: Client,
  exerciseId: string,
  limit = 20,
): Promise<ExerciseSessionPoint[]> {
  const { data: sets, error: setsError } = await client
    .from('session_sets')
    .select('*')
    .eq('exercise_id', exerciseId);
  if (setsError) throw setsError;

  const setRows = sets ?? [];
  if (setRows.length === 0) return [];

  const sessionIds = [...new Set(setRows.map((s) => s.session_id))];
  const { data: sessions, error: sessionsError } = await client
    .from('workout_sessions')
    .select('id, performed_at, title')
    .in('id', sessionIds)
    .order('performed_at', { ascending: true });
  if (sessionsError) throw sessionsError;

  const sessionRows = (sessions ?? []).slice(-limit);
  const sessionSet = new Set(sessionRows.map((s) => s.id));
  const sessionMap = new Map(sessionRows.map((s) => [s.id, s]));

  const pointMap = new Map<string, ExerciseSessionPoint>();
  for (const set of setRows) {
    if (!sessionSet.has(set.session_id)) continue;
    const session = sessionMap.get(set.session_id)!;
    let point = pointMap.get(set.session_id);
    if (!point) {
      point = { session, sets: [] };
      pointMap.set(set.session_id, point);
    }
    point.sets.push(set);
  }

  return sessionRows
    .map((s) => pointMap.get(s.id))
    .filter((p): p is ExerciseSessionPoint => p !== undefined);
}
