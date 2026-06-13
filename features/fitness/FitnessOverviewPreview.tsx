import { createClient } from '@/lib/supabase/server';
import { listSessions, getSessionSetsBySessionIds } from '@/lib/queries/analytics';
import { sessionsPerWeek, currentStreakWeeks, findStalledExercises } from '@/lib/utils/stats';
import type { SessionSet } from '@/lib/db/types';
import dynamic from 'next/dynamic';
import { AlertTriangle, Flame, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const SessionsPerWeekChart = dynamic(() =>
  import('./charts/SessionsPerWeekChart').then((m) => m.SessionsPerWeekChart),
);

function ninetyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString();
}

export async function FitnessOverviewPreview() {
  const supabase = await createClient();

  const sessions = await listSessions(supabase, { from: ninetyDaysAgo() });
  const sets = await getSessionSetsBySessionIds(
    supabase,
    sessions.map((s) => s.id),
  );

  const weekBuckets = sessionsPerWeek(sessions, 12);
  const streak = currentStreakWeeks(sessions);

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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide">
            <Flame className="h-3 w-3" />
            Streak
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {streak}
            <span className="ml-1 text-sm font-normal text-muted">wk</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wide">
            <TrendingUp className="h-3 w-3" />
            Sessions
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {sessions.length}
            <span className="ml-1 text-sm font-normal text-muted">/ 90d</span>
          </p>
        </div>
      </div>

      <SessionsPerWeekChart data={weekBuckets} />

      {stalled.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">
            Stalled
          </p>
          <ul className="space-y-1.5">
            {stalled.slice(0, 3).map((ex) => (
              <li
                key={ex.exercise_id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="truncate">{ex.name}</span>
                </span>
                <span className="shrink-0 text-muted">{ex.lastWeight} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
