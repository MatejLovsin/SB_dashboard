import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SessionEmphasis } from '@/lib/db/types';
import { bestSetE1RM } from '@/lib/utils/stats';
import { emphasisFor, type Emphasis } from '@/lib/utils/emphasis';
import type { PinnedLiftPoint } from './analytics';

type Client = SupabaseClient<Database>;

type SessionPoint = { sessionId: string; performedAt: string; e1rm: number; emphasis: Emphasis };

// Split out of analytics.ts: one query family per file, and that file was over
// the 300-line cap.

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
    .select('id, performed_at, emphasis');
  if (sessionsError) throw sessionsError;

  const performedAt = new Map<string, string>();
  const emphasisBySession = new Map<string, SessionEmphasis>();
  for (const session of sessions ?? []) {
    performedAt.set(session.id, session.performed_at);
    emphasisBySession.set(session.id, session.emphasis ?? {});
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

    const sessionPoints: SessionPoint[] = [];
    for (const [sessionId, sessionSets] of bySession.entries()) {
      const iso = performedAt.get(sessionId);
      if (!iso) continue;
      const e1rm = bestSetE1RM(sessionSets);
      const emphasis = emphasisFor(emphasisBySession.get(sessionId), exercise.id);
      sessionPoints.push({ sessionId, performedAt: iso, e1rm, emphasis });
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
      .map((p) => ({ date: p.performedAt, e1rm: Math.round(p.e1rm), emphasis: p.emphasis }));

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
