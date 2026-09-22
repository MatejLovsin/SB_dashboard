import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  ProgrammeEmphasis,
  SessionEmphasis,
  WorkoutSession,
} from '@/lib/db/types';

type Client = SupabaseClient<Database>;

// Writing the heavy/light label, in its two places. Reading it is pure and lives
// in lib/utils/emphasis.ts; migration 0019 explains why there are two columns.

/**
 * Set the intent on a plan line: "incline press is a light one in this plan."
 * Takes effect for sessions started from the plan after this point — sessions
 * already logged keep the label they were logged with.
 */
export async function setPlanExerciseEmphasis(
  client: Client,
  lineId: string,
  emphasis: ProgrammeEmphasis | null,
): Promise<void> {
  const { error } = await client
    .from('plan_exercises')
    .update({ emphasis })
    .eq('id', lineId);
  if (error) throw error;
}

/**
 * Re-label one exercise within one session, from the session detail view. The
 * only way to classify a workout the plan could not — an ad-hoc session, or one
 * logged before its plan carried an emphasis. Passing null clears the label,
 * which folds the session back into the main series.
 */
export async function setSessionEmphasis(
  client: Client,
  sessionId: string,
  exerciseId: string,
  emphasis: ProgrammeEmphasis | null,
): Promise<WorkoutSession> {
  const { data: current, error: readError } = await client
    .from('workout_sessions')
    .select('emphasis')
    .eq('id', sessionId)
    .single();
  if (readError) throw readError;

  const next: SessionEmphasis = { ...(current.emphasis ?? {}) };
  if (emphasis) next[exerciseId] = emphasis;
  else delete next[exerciseId];

  const { data, error } = await client
    .from('workout_sessions')
    .update({ emphasis: next })
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
