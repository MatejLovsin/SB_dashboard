import { Suspense } from 'react';
import type { GoalSection } from '@/lib/db/types';
import { createClient } from '@/lib/supabase/server';
import { listResolvedGoals } from '@/lib/queries/goals';
import { GoalStrip } from './GoalStrip';
import { GoalStripGhost } from './GoalStripGhost';

/**
 * A hub's goal strip, streamed. Goal resolution is the slowest read on a hub,
 * so it no longer sits in the page's `Promise.all`: the page renders without
 * it and the strip arrives into a ghost of itself (GoalStripGhost).
 */
export function GoalStripLoader({ section }: { section: GoalSection }) {
  return (
    <Suspense fallback={<GoalStripGhost section={section} />}>
      <ResolvedGoalStrip section={section} />
    </Suspense>
  );
}

async function ResolvedGoalStrip({ section }: { section: GoalSection }) {
  const supabase = await createClient();
  const goals = await listResolvedGoals(supabase, { section, status: 'active' }).catch(() => []);
  return <GoalStrip goals={goals} section={section} />;
}
