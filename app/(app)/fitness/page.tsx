import Link from 'next/link';
import { BarChart2, ChevronRight, ClipboardList, History, Play, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';
import { getSummary } from '@/lib/queries/ai';
import { SummaryCard } from '@/components/ai/SummaryCard';
import { FitnessOverviewPreview } from '@/features/fitness/FitnessOverviewPreview';
import { PlanListPreview } from '@/features/fitness/PlanListPreview';
import { PinnedLifts } from '@/features/fitness/PinnedLifts';
import { getPinnedLiftTrends } from '@/lib/queries/analytics';

async function getRecentExerciseNames(count = 5): Promise<string[]> {
  const supabase = await createClient();
  const { data: sets } = await supabase
    .from('session_sets')
    .select('exercise_id')
    .order('created_at', { ascending: false })
    .limit(60);

  if (!sets || sets.length === 0) return [];

  const seen = new Set<string>();
  const uniqueIds: string[] = [];
  for (const s of sets) {
    if (!seen.has(s.exercise_id)) {
      seen.add(s.exercise_id);
      uniqueIds.push(s.exercise_id);
      if (uniqueIds.length === count) break;
    }
  }

  if (uniqueIds.length === 0) return [];
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name')
    .in('id', uniqueIds);

  const nameById = new Map((exercises ?? []).map((e) => [e.id, e.name]));
  return uniqueIds.map((id) => nameById.get(id) ?? '').filter(Boolean);
}

export default async function FitnessPage() {
  const supabase = await createClient();
  const [summary, recentExercises, pinnedLifts] = await Promise.all([
    getSummary(supabase, 'fitness').catch(() => null),
    getRecentExerciseNames(),
    getPinnedLiftTrends(supabase).catch(() => []),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Fitness" description="Push / Pull / Legs — strength focus." />

      <SummaryCard section="fitness" initial={summary} />

      {/* Primary actions — side-by-side, whole tile clickable */}
      <div className="grid grid-cols-2 gap-4">
        {/* Start workout */}
        <Link href="/fitness/log" className="block">
          <Card className="panel-hover flex h-full flex-col gap-4 bg-accent p-4 text-white">
            <span className="w-fit rounded-xl bg-white/20 p-2.5">
              <Play className="h-5 w-5" />
            </span>
            <span className="block">
              <span className="flex items-center gap-1 font-semibold">
                Start workout
                <ChevronRight className="h-4 w-4 text-white/80" />
              </span>
              <span className="mt-0.5 block text-sm text-white/80">
                Pick a plan and log your sets.
              </span>
            </span>
          </Card>
        </Link>

        {/* Session log */}
        <Link href="/fitness/sessions" className="block">
          <Card className="panel-hover flex h-full flex-col gap-4 p-4">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent-soft)' }}
            >
              <History className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            </span>
            <span className="block">
              <span className="flex items-center gap-1 font-semibold">
                Session log
                <ChevronRight className="h-4 w-4 text-muted" />
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                View, edit, or delete past workouts.
              </span>
            </span>
          </Card>
        </Link>
      </div>

      {/* Overview preview */}
      <Link href="/fitness/overview" className="block">
        <Card className="panel-hover">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="font-semibold">Overview</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted" />
          </div>
          <FitnessOverviewPreview />
        </Card>
      </Link>

      {/* Plans preview */}
      <Card className="panel-hover cursor-pointer">
        <Link
          href="/fitness/plans"
          className="mb-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent" />
            <span className="font-semibold">Plans</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted" />
        </Link>
        <PlanListPreview />
      </Card>

      {/* Exercise history preview */}
      <Link href="/fitness/history" className="block">
        <Card className="panel-hover">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-accent" />
              <span className="font-semibold">Exercise history</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted" />
          </div>

          {/* Pinned lifts — squat & bench progress, side by side */}
          <PinnedLifts lifts={pinnedLifts} />

          {recentExercises.length > 0 ? (
            <div>
              <p className="mb-2.5 text-xs font-medium text-muted uppercase tracking-wide">
                Recently logged
              </p>
              <div className="flex flex-wrap gap-2">
                {recentExercises.map((name) => (
                  <span
                    key={name}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">
                Tap to explore strength trends, volume, and consistency per exercise.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">
              No exercises logged yet. Start a workout to begin tracking your history.
            </p>
          )}
        </Card>
      </Link>
    </div>
  );
}
