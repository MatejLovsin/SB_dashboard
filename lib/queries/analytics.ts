import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, WorkoutSession, SessionSet } from '@/lib/db/types';
import {
  bestSetE1RM,
  sessionsPerWeek,
  currentStreakWeeks,
  volumeForSessionIds,
  deltaPercent,
  mondayOf,
} from '@/lib/utils/stats';

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

export type FitnessHubMetrics = {
  volume30d: number;
  volumeDelta: number | null;
  weeklyVolumeSparkline: number[];
  sessionsThisWeek: number;
  streakWeeks: number;
};

export async function getFitnessHubMetrics(client: Client): Promise<FitnessHubMetrics> {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

  const { data: sessions } = await client
    .from('workout_sessions')
    .select('id, performed_at')
    .gte('performed_at', sixtyDaysAgo)
    .order('performed_at', { ascending: true });

  const sessionRows = sessions ?? [];

  const setRows: Array<{ session_id: string; reps: number | null; weight: number | null; completed: boolean }> =
    sessionRows.length > 0
      ? ((await client
          .from('session_sets')
          .select('session_id, reps, weight, completed')
          .in('session_id', sessionRows.map((s) => s.id))).data ?? [])
      : [];

  const current30dIds = new Set(sessionRows.filter((s) => s.performed_at >= thirtyDaysAgo).map((s) => s.id));
  const prev30dIds = new Set(sessionRows.filter((s) => s.performed_at < thirtyDaysAgo).map((s) => s.id));
  const volume30d = volumeForSessionIds(current30dIds, setRows);
  const volumePrev = volumeForSessionIds(prev30dIds, setRows);

  const thisMonday = mondayOf(now);
  const sessionsThisWeek = sessionRows.filter((s) => mondayOf(new Date(s.performed_at)) === thisMonday).length;
  const streakWeeks = currentStreakWeeks(sessionRows);

  const buckets = sessionsPerWeek(sessionRows, 8);
  const weeklyVolumeSparkline: number[] = buckets.map(({ weekStart }) => {
    const weekIds = new Set(
      sessionRows.filter((s) => mondayOf(new Date(s.performed_at)) === weekStart).map((s) => s.id),
    );
    return volumeForSessionIds(weekIds, setRows);
  });

  return {
    volume30d,
    volumeDelta: deltaPercent(volume30d, volumePrev),
    weeklyVolumeSparkline,
    sessionsThisWeek,
    streakWeeks,
  };
}

export type PinnedLiftPoint = { date: string; e1rm: number };
export type PinnedLiftTrend = {
  exercise: { id: string; name: string };
  points: PinnedLiftPoint[];
  current: number | null;
  delta: number | null;
};

// Pinned lifts + their est-1RM trend, for the Fitness hub mini charts. The
// e1rm series is computed here so the client payload stays a few numbers.
export async function getPinnedLiftTrends(
  client: Client,
  limit = 8,
): Promise<PinnedLiftTrend[]> {
  const { data: pinned, error } = await client
    .from('exercises')
    .select('id, name')
    .eq('pinned', true)
    .order('name');
  if (error) throw error;
  if (!pinned || pinned.length === 0) return [];

  return Promise.all(
    pinned.map(async (exercise) => {
      const history = await getExerciseHistory(client, exercise.id, limit);
      const points: PinnedLiftPoint[] = history.map((p) => ({
        date: p.session.performed_at,
        e1rm: Math.round(bestSetE1RM(p.sets)),
      }));
      const current = points.length > 0 ? points[points.length - 1].e1rm : null;
      const delta =
        points.length > 1 ? current! - points[0].e1rm : null;
      return { exercise, points, current, delta };
    }),
  );
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
