export type SetLike = { reps: number | null; weight: number | null; completed: boolean };

export function estimatedOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function bestSetE1RM(sets: SetLike[]): number {
  let best = 0;
  for (const s of sets) {
    if (!s.completed || s.reps == null || s.weight == null) continue;
    const e = estimatedOneRepMax(s.weight, s.reps);
    if (e > best) best = e;
  }
  return best;
}

export function bestWeight(sets: SetLike[]): number {
  let best = 0;
  for (const s of sets) {
    if (!s.completed || s.weight == null || s.weight <= 0) continue;
    if (s.weight > best) best = s.weight;
  }
  return best;
}

export function totalVolume(sets: SetLike[]): number {
  let vol = 0;
  for (const s of sets) {
    if (!s.completed || s.reps == null || s.weight == null) continue;
    vol += s.reps * s.weight;
  }
  return Math.round(vol);
}

// Monday of the week containing `d`, as YYYY-MM-DD (UTC).
function mondayOf(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = date.getUTCDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export type WeekBucket = { weekStart: string; count: number };

export function sessionsPerWeek(
  sessions: Array<{ performed_at: string }>,
  weeks = 12,
): WeekBucket[] {
  const today = new Date();
  const thisMonday = mondayOf(today);
  const buckets = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of sessions) {
    const w = mondayOf(new Date(s.performed_at));
    if (buckets.has(w)) buckets.set(w, (buckets.get(w) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([weekStart, count]) => ({ weekStart, count }));
}

// Consecutive weeks (ending on/before today) with at least one session.
// If the current week has no session, we look back from last week (grace for mid-week).
export function currentStreakWeeks(sessions: Array<{ performed_at: string }>): number {
  const today = new Date();
  const weekSet = new Set(sessions.map((s) => mondayOf(new Date(s.performed_at))));
  let cursor = mondayOf(today);
  if (!weekSet.has(cursor)) {
    const d = new Date(cursor);
    d.setUTCDate(d.getUTCDate() - 7);
    cursor = d.toISOString().slice(0, 10);
  }
  let streak = 0;
  while (weekSet.has(cursor)) {
    streak++;
    const d = new Date(cursor);
    d.setUTCDate(d.getUTCDate() - 7);
    cursor = d.toISOString().slice(0, 10);
  }
  return streak;
}

// history must be ordered oldest → newest.
// Returns true if max weight has not increased across the last `minSessions` sessions.
export function isStalled(history: Array<{ sets: SetLike[] }>, minSessions = 3): boolean {
  if (history.length < minSessions) return false;
  const last = history.slice(-minSessions);
  const weights = last.map((h) => bestWeight(h.sets));
  if (weights[0] === 0) return false;
  return weights[weights.length - 1] <= weights[0];
}

export type StalledExercise = { exercise_id: string; name: string; lastWeight: number };

export function findStalledExercises(
  exerciseSessions: Map<string, Array<{ performed_at: string; sets: SetLike[] }>>,
  exerciseNames: Map<string, string>,
): StalledExercise[] {
  const result: StalledExercise[] = [];
  for (const [exerciseId, history] of exerciseSessions) {
    const sorted = [...history].sort(
      (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime(),
    );
    if (isStalled(sorted)) {
      const last = sorted[sorted.length - 1];
      result.push({
        exercise_id: exerciseId,
        name: exerciseNames.get(exerciseId) ?? 'Unknown',
        lastWeight: bestWeight(last.sets),
      });
    }
  }
  return result;
}
