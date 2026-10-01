import { createClient } from '@/lib/supabase/server';
import { listMetricOptions, listResolvedGoals } from '@/lib/queries/goals';
import { GoalsBoard } from '@/features/goals/GoalsBoard';
import { Suspense } from 'react';
import { BoardsFooter } from '@/features/boards/BoardsFooter';

// Resolution happens here, on the server: an auto goal's progress is derived from
// the tables it reads (see lib/queries/goals.ts), which would mean shipping the
// whole resolver — and a lot of rows — to the client otherwise. Mutations write
// straight to Supabase and call router.refresh(), so this recomputes.
interface Props {
  searchParams: Promise<{ goal?: string }>;
}

export default async function GoalsPage({ searchParams }: Props) {
  const { goal } = await searchParams;
  const supabase = await createClient();

  // One pass for both lists, so they share a cache: two goals reading the same
  // exercise or table fetch it once, whichever list each sits in.
  const [resolved, options] = await Promise.all([
    listResolvedGoals(supabase, { status: ['active', 'achieved'] }).catch(() => []),
    listMetricOptions(supabase),
  ]);
  const active = resolved.filter((r) => r.goal.status === 'active');
  const achieved = resolved.filter((r) => r.goal.status === 'achieved');

  return (
    <div className="space-y-4">
      <GoalsBoard active={active} achieved={achieved} options={options} initialGoalId={goal} />
      <Suspense fallback={null}>
        <BoardsFooter page="goals" />
      </Suspense>
    </div>
  );
}
