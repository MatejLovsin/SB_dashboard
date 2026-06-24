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
import type { SessionWithSets } from './fitness';
import { getSessionWithSets } from './sessions';

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

export type ExerciseLibraryEntry = {
  id: string;
  name: string;
  category: string | null;
  notes: string | null;
  pinned: boolean;
  sessionCount: number;       // distinct sessions this exercise appears in
  bestE1RM: number;           // rounded kg, 0 if never logged
  lastPerformed: string | null; // ISO of latest session, null if never
  sparkline: PinnedLiftPoint[]; // est-1RM per session, oldest→newest, last 8 points
};

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

export type SessionCategory = { key: string; label: string; count: number };

/**
 * Distinct workout categories that have at least one logged session, derived from
 * the *plan's* `category` (Push/Pull/Legs…) — not the session title. A category can
 * span several plans (e.g. "Push A" + "Push B"), and every session of those plans
 * rolls up under it. Sessions with no plan, or whose plan has no category, are skipped.
 */
export async function listSessionCategories(client: Client): Promise<SessionCategory[]> {
  const [{ data: plans, error: plansError }, { data: sessions, error: sessionsError }] =
    await Promise.all([
      client.from('workout_plans').select('id, category'),
      client
        .from('workout_sessions')
        .select('plan_id, performed_at')
        .not('plan_id', 'is', null)
        .order('performed_at', { ascending: false }),
    ]);
  if (plansError) throw plansError;
  if (sessionsError) throw sessionsError;

  // plan id → raw category (skip plans with no category)
  const categoryByPlan = new Map<string, string>();
  for (const plan of plans ?? []) {
    if (plan.category != null && plan.category.trim() !== '') {
      categoryByPlan.set(plan.id, plan.category.trim());
    }
  }

  const categoryMap = new Map<string, { label: string; count: number }>();
  for (const session of sessions ?? []) {
    if (!session.plan_id) continue;
    const raw = categoryByPlan.get(session.plan_id);
    if (!raw) continue;
    const key = raw.toLowerCase();
    const existing = categoryMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      // Sessions arrive newest-first, so the first casing seen is the most recent.
      categoryMap.set(key, { label: raw, count: 1 });
    }
  }

  return Array.from(categoryMap.entries())
    .map(([key, { label, count }]) => ({ key, label, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
}

/**
 * The most recent `limit` sessions belonging to any plan in the given category
 * (case-insensitive match on the plan's `category`), newest-first, with full sets.
 */
export async function getRecentSessionsByCategory(
  client: Client,
  categoryLabel: string,
  limit = 3,
): Promise<SessionWithSets[]> {
  // Plans in this category (ilike with no wildcards = case-insensitive exact match).
  const { data: plans, error: plansError } = await client
    .from('workout_plans')
    .select('id')
    .ilike('category', categoryLabel);
  if (plansError) throw plansError;

  const planIds = (plans ?? []).map((p) => p.id);
  if (planIds.length === 0) return [];

  const { data, error } = await client
    .from('workout_sessions')
    .select('id')
    .in('plan_id', planIds)
    .order('performed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) return [];

  return Promise.all(rows.map((row) => getSessionWithSets(client, row.id)));
}

export async function getExerciseLibrary(client: Client): Promise<ExerciseLibraryEntry[]> {
  const { data: exercises, error: exercisesError } = await client
    .from('exercises')
    .select('id, name, category, notes, pinned');
  if (exercisesError) throw exercisesError;

  const { data: sets, error: setsError } = await client
    .from('session_sets')
    .select('exercise_id, session_id, reps, weight, completed');
  if (setsError) throw setsError;

  const { data: sessions, error: sessionsError } = await client
    .from('workout_sessions')
    .select('id, performed_at');
  if (sessionsError) throw sessionsError;

  const performedAt = new Map<string, string>();
  for (const session of sessions ?? []) {
    performedAt.set(session.id, session.performed_at);
  }

  // Group sets by exercise_id then by session_id
  type SetRow = { exercise_id: string; session_id: string; reps: number | null; weight: number | null; completed: boolean };
  const byExercise = new Map<string, Map<string, SetRow[]>>();
  for (const set of (sets ?? []) as SetRow[]) {
    let bySession = byExercise.get(set.exercise_id);
    if (!bySession) {
      bySession = new Map();
      byExercise.set(set.exercise_id, bySession);
    }
    let sessionSets = bySession.get(set.session_id);
    if (!sessionSets) {
      sessionSets = [];
      bySession.set(set.session_id, sessionSets);
    }
    sessionSets.push(set);
  }

  const entries: ExerciseLibraryEntry[] = (exercises ?? []).map((exercise) => {
    const bySession = byExercise.get(exercise.id);
    if (!bySession || bySession.size === 0) {
      return {
        ...exercise,
        sessionCount: 0,
        bestE1RM: 0,
        lastPerformed: null,
        sparkline: [],
      };
    }

    const sessionPoints: { sessionId: string; performedAt: string; e1rm: number }[] = [];
    for (const [sessionId, sessionSets] of bySession.entries()) {
      const iso = performedAt.get(sessionId);
      if (!iso) continue;
      const e1rm = bestSetE1RM(sessionSets);
      sessionPoints.push({ sessionId, performedAt: iso, e1rm });
    }

    sessionPoints.sort((a, b) => a.performedAt.localeCompare(b.performedAt));

    const sessionCount = sessionPoints.length;
    const bestE1RM = sessionCount > 0
      ? Math.round(Math.max(...sessionPoints.map((p) => p.e1rm)))
      : 0;
    const lastPerformed = sessionCount > 0
      ? sessionPoints[sessionPoints.length - 1].performedAt
      : null;
    const sparkline: PinnedLiftPoint[] = sessionPoints
      .slice(-8)
      .map((p) => ({ date: p.performedAt, e1rm: Math.round(p.e1rm) }));

    return {
      ...exercise,
      sessionCount,
      bestE1RM,
      lastPerformed,
      sparkline,
    };
  });

  return entries.sort((a, b) => {
    if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount;
    return a.name.localeCompare(b.name);
  });
}
