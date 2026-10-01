import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resolveGoalsById } from '@/lib/queries/boardGoals';
import type { BoardGoals } from './boardContext';
import type { BoardFlowNode } from './boardFlow';
import { NO_GOALS, toGoalStates } from './boardGoals';

/**
 * Goal progress for the board. The page streams it in rather than holding the
 * canvas back for it, so the board draws first and the glow follows. A goal
 * linked after load isn't in that payload; it is resolved here on its own.
 */
export function useBoardGoals(pending: Promise<BoardGoals>, nodes: BoardFlowNode[]): BoardGoals {
  const [goals, setGoals] = useState<BoardGoals>(NO_GOALS);

  useEffect(() => {
    let live = true;
    void pending.then((g) => {
      if (live) setGoals(g);
    });
    return () => {
      live = false;
    };
  }, [pending]);

  // A string, so dragging nodes around doesn't re-run the effect below.
  const missing = useMemo(() => {
    if (goals === NO_GOALS) return '';
    const ids = nodes.flatMap((n) => (n.data.goalId ? [n.data.goalId] : []));
    return [...new Set(ids)].filter((id) => !(id in goals.states)).join(',');
  }, [nodes, goals]);

  useEffect(() => {
    if (!missing) return;
    let live = true;
    resolveGoalsById(createClient(), missing.split(','))
      .then((resolved) => {
        if (!live || !resolved.length) return;
        setGoals((g) => ({ ...g, states: { ...g.states, ...toGoalStates(resolved) } }));
      })
      .catch((e: unknown) => console.error(e));
    return () => {
      live = false;
    };
  }, [missing]);

  return goals;
}
