import { createClient } from '@/lib/supabase/server';
import { listMetricOptions, listResolvedGoals } from '@/lib/queries/goals';
import { GoalsBoard } from '@/features/goals/GoalsBoard';

// Resolution happens here, on the server: an auto goal's progress is derived from
// the tables it reads (see lib/queries/goals.ts), which would mean shipping the
// whole resolver — and a lot of rows — to the client otherwise. Mutations write
// straight to Supabase and call router.refresh(), so this recomputes.
export default async function GoalsPage() {
  const supabase = await createClient();

  const [active, achieved, options] = await Promise.all([
    listResolvedGoals(supabase, { status: 'active' }).catch(() => []),
    listResolvedGoals(supabase, { status: 'achieved' }).catch(() => []),
    listMetricOptions(supabase),
  ]);

  return (
    <div className="space-y-4">
      <GoalsBoard active={active} achieved={achieved} options={options} />
    </div>
  );
}
