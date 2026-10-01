import type { GoalMilestone, GoalSection } from '@/lib/db/types';
import type { Client } from './fitness';
import { resolveGoalProgress, seriesForGoal, type ResolvedGoal } from './goals';

// A board needs two things from goals, and neither is "every goal, resolved":
// the progress of the few goals its ideas and phases link to, and a plain list
// of active goals for the link picker. Resolving every goal walks the whole
// training and grade history, which is what made a board slow to open.

/** Resolves only the goals with these ids, whatever their status. */
export async function resolveGoalsById(client: Client, ids: string[]): Promise<ResolvedGoal[]> {
  if (!ids.length) return [];
  const [goals, milestones] = await Promise.all([
    client.from('goals').select('*').in('id', ids),
    client.from('goal_milestones').select('*').in('goal_id', ids).order('position'),
  ]);
  if (goals.error) throw goals.error;
  if (milestones.error) throw milestones.error;

  const byGoal = new Map<string, GoalMilestone[]>();
  for (const m of milestones.data ?? []) {
    const list = byGoal.get(m.goal_id);
    if (list) list.push(m);
    else byGoal.set(m.goal_id, [m]);
  }

  const cache = new Map<string, Promise<unknown>>();
  return Promise.all(
    (goals.data ?? []).map(async (goal) =>
      resolveGoalProgress(goal, byGoal.get(goal.id) ?? [], await seriesForGoal(client, goal, cache)),
    ),
  );
}

/** Active goals for the link picker, in /goals order. Titles only, nothing resolved. */
export async function listGoalOptions(
  client: Client,
): Promise<Array<{ id: string; title: string; section: GoalSection }>> {
  const { data, error } = await client
    .from('goals')
    .select('id, title, section')
    .eq('status', 'active')
    .order('pinned', { ascending: false })
    .order('position')
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}
