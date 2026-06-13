import Link from 'next/link';
import { BarChart2, ChevronRight, ClipboardList, Play, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';
import { getSummary } from '@/lib/queries/ai';
import { SummaryCard } from '@/components/ai/SummaryCard';
import { FitnessOverviewPreview } from '@/features/fitness/FitnessOverviewPreview';
import { PlanListPreview } from '@/features/fitness/PlanListPreview';

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
  const [summary, recentExercises] = await Promise.all([
    getSummary(supabase, 'fitness').catch(() => null),
    getRecentExerciseNames(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Fitness" description="Push / Pull / Legs — strength focus." />

      <SummaryCard section="fitness" initial={summary} />

      {/* Start workout CTA */}
      <Link href="/fitness/log" className="block">
        <Card className="flex items-center gap-3 bg-accent p-4 text-white">
          <span className="rounded-xl bg-white/20 p-2.5">
            <Play className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Start workout</span>
            <span className="mt-0.5 block text-sm text-white/80">
              Pick a plan and log your sets.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-white/80" />
        </Card>
      </Link>

      {/* Overview preview */}
      <Card>
        <Link
          href="/fitness/overview"
          className="mb-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="font-semibold">Overview</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted" />
        </Link>
        <FitnessOverviewPreview />
      </Card>

      {/* Plans preview */}
      <Card>
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
      <Card>
        <Link
          href="/fitness/history"
          className="mb-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-accent" />
            <span className="font-semibold">Exercise history</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted" />
        </Link>
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
              Tap above to explore strength trends, volume, and consistency per exercise.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No exercises logged yet. Start a workout to begin tracking your history.
          </p>
        )}
      </Card>
    </div>
  );
}
