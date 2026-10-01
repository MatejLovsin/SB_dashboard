import type { Client } from '@/lib/queries/fitness';
import type { BoardContents } from '@/lib/queries/boards';
import type { ResolvedGoal } from '@/lib/queries/goals';
import { resolveGoalsById } from '@/lib/queries/boardGoals';
import type { BoardGoals, GoalOption, GoalState } from './boardContext';

// Shared by the server page (first load) and useBoardGoals (a goal linked
// after the page loaded). No React and no 'use client': it runs on either side.

/** Before the goals arrive: no glow, empty picker. */
export const NO_GOALS: BoardGoals = { states: {}, options: [] };

/** Every goal a node or phase on the board links to, once each. */
export function linkedGoalIds(contents: BoardContents): string[] {
  const ids = [...contents.nodes, ...contents.phases].map((r) => r.goal_id);
  return [...new Set(ids.filter((id): id is string => id != null))];
}

export function toGoalStates(resolved: ResolvedGoal[]): Record<string, GoalState> {
  return Object.fromEntries(
    resolved.map((r) => [
      r.goal.id,
      { title: r.goal.title, percent: r.percent, achieved: r.achieved },
    ]),
  );
}

export async function loadBoardGoals(
  client: Client,
  contents: BoardContents,
  options: Promise<GoalOption[]>,
): Promise<BoardGoals> {
  const [resolved, opts] = await Promise.all([
    resolveGoalsById(client, linkedGoalIds(contents)),
    options,
  ]);
  return { states: toGoalStates(resolved), options: opts };
}
