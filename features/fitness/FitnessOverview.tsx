import { createClient } from '@/lib/supabase/server';
import { listSessions, getSessionSetsBySessionIds } from '@/lib/queries/analytics';
import {
  sessionsPerWeek,
  currentStreakWeeks,
  findStalledExercises,
} from '@/lib/utils/stats';
import type { SessionSet } from '@/lib/db/types';
import dynamic from 'next/dynamic';
import { Card, CardTitle } from '@/components/ui/Card';
import { AlertTriangle, Flame, TrendingUp } from 'lucide-react';

const SessionsPerWeekChart = dynamic(() =>
  import('./charts/SessionsPerWeekChart').then((m) => m.SessionsPerWeekChart),
);

// 90-day lookback for all overview metrics.
function ninetyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString();
}

export async function FitnessOverview() {
  const supabase = await createClient();

  const sessions = await listSessions(supabase, { from: ninetyDaysAgo() });
  const sets = await getSessionSetsBySessionIds(
    supabase,
    sessions.map((s) => s.id),
  );

  const weekBuckets = sessionsPerWeek(sessions, 12);
  const streak = currentStreakWeeks(sessions);

  // Build per-exercise session history for the stall check.
  const byExercise = new Map<string, Array<{ performed_at: string; sets: SessionSet[] }>>();
  const sessionDateById = new Map(sessions.map((s) => [s.id, s.performed_at]));

  for (const set of sets) {
    const performed_at = sessionDateById.get(set.session_id);
    if (!performed_at) continue;
    let history = byExercise.get(set.exercise_id);
    if (!history) {
      history = [];
      byExercise.set(set.exercise_id, history);
    }
    let entry = history.find((h) => h.performed_at === performed_at);
    if (!entry) {
      entry = { performed_at, sets: [] };
      history.push(entry);
    }
    entry.sets.push(set);
  }

  // Resolve exercise names.
  const exerciseIds = [...byExercise.keys()];
  const exerciseNames = new Map<string, string>();
  if (exerciseIds.length > 0) {
    const { data } = await supabase
      .from('exercises')
      .select('id, name')
      .in('id', exerciseIds);
    for (const row of data ?? []) exerciseNames.set(row.id, row.name);
  }

  const stalled = findStalledExercises(byExercise, exerciseNames);

  return (
    <div className="space-y-5">
      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide">
            <Flame className="h-3.5 w-3.5" />
            Streak
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {streak}
            <span className="ml-1 text-base font-normal text-muted">wk</span>
          </p>
        </Card>

        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide">
            <TrendingUp className="h-3.5 w-3.5" />
            Sessions
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {sessions.length}
            <span className="ml-1 text-base font-normal text-muted">/ 90d</span>
          </p>
        </Card>
      </div>

      {/* Sessions per week bar chart */}
      <Card>
        <CardTitle className="mb-4">Sessions / week</CardTitle>
        <SessionsPerWeekChart data={weekBuckets} />
      </Card>

      {/* Stalled exercises */}
      <Card>
        <CardTitle className="mb-4">Stalled exercises</CardTitle>
        {stalled.length === 0 ? (
          <p className="text-sm text-muted">
            No stalled exercises — keep it up, or log more sessions to track progress.
          </p>
        ) : (
          <ul className="space-y-2">
            {stalled.map((ex) => (
              <li
                key={ex.exercise_id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="truncate font-medium">{ex.name}</span>
                </span>
                <span className="shrink-0 text-muted">{ex.lastWeight} kg</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
