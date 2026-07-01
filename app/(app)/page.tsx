import Link from 'next/link';
import { Dumbbell, GraduationCap, Briefcase, ChevronRight, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSummary } from '@/lib/queries/ai';
import { getHomeMetrics } from '@/lib/queries/home';
import { getJournalHomeState, weekRangeLabel } from '@/lib/queries/journal';
import { StatTile } from '@/components/ui/StatTile';
import { CountUp } from '@/components/ui/CountUp';
import { Sparkline } from '@/components/charts/Sparkline';
import { Card } from '@/components/ui/Card';
import { TodoDashboard } from '@/features/todos/TodoDashboard';

function fmtVol(kg: number): number {
  return kg;
}

export default async function HomePage() {
  const supabase = await createClient();
  const [metrics, fitnessSummary, schoolSummary, workSummary, journalState] = await Promise.all([
    getHomeMetrics(supabase).catch(() => null),
    getSummary(supabase, 'fitness').catch(() => null),
    getSummary(supabase, 'school').catch(() => null),
    getSummary(supabase, 'work').catch(() => null),
    getJournalHomeState(supabase).catch(() => null),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Morning briefing</h1>
        <p className="mt-0.5 text-sm text-muted">A quick read on each area of your life.</p>
      </div>

      {/* Daily to-do widget — primary daily action */}
      <TodoDashboard />

      {/* KPI strip — the long view: last 90 days, a wider lens than the link
          cards below (which stay on 30d / this-week / current snapshot). */}
      <div className="stagger-fade grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Fitness volume · 90d"
          value={<CountUp value={fmtVol(metrics?.longTerm.fitnessVolume90d ?? 0)} format="compact" />}
          unit="kg"
          delta={metrics?.longTerm.fitnessVolumeDelta ?? undefined}
        >
          <Sparkline data={metrics?.longTerm.fitnessVolumeSparkline ?? []} />
        </StatTile>

        <StatTile
          label="Study hours · 90d"
          value={<CountUp value={metrics?.longTerm.schoolHours90d ?? 0} decimals={1} />}
          unit="h"
          delta={metrics?.longTerm.schoolHoursDelta ?? undefined}
        >
          <Sparkline data={metrics?.longTerm.schoolHoursSparkline ?? []} />
        </StatTile>

        <StatTile
          label="Work shipped · 90d"
          value={<CountUp value={metrics?.longTerm.workShipped90d ?? 0} />}
          unit="cards"
          delta={metrics?.longTerm.workShippedDelta ?? undefined}
        >
          <Sparkline data={metrics?.longTerm.workShippedSparkline ?? []} />
        </StatTile>
      </div>

      {/* 3-area bento: each hub is a clickable panel with number + chart + summary */}
      <div className="stagger-fade grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Fitness */}
        <Link href="/fitness" className="block">
          <Card className="panel panel-hover press-flash flex h-full flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-muted" />
                <span className="text-sm font-semibold">Fitness</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold nums">
                  <CountUp value={metrics?.fitness.volume30d ?? 0} format="compact" />
                </span>
                <span className="text-sm text-muted">kg · 30d</span>
              </div>
            </div>
            <div className="h-14">
              <Sparkline data={metrics?.fitness.weeklyVolumeSparkline ?? []} height={56} />
            </div>
            {fitnessSummary?.content && (
              <p className="line-clamp-2 text-xs text-muted">{fitnessSummary.content}</p>
            )}
          </Card>
        </Link>

        {/* School */}
        <Link href="/school" className="block">
          <Card className="panel panel-hover press-flash flex h-full flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted" />
                <span className="text-sm font-semibold">School</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold nums">
                  <CountUp value={metrics?.school.hoursThisWeek ?? 0} decimals={1} />
                </span>
                <span className="text-sm text-muted">h this week</span>
              </div>
            </div>
            <div className="h-14">
              <Sparkline data={metrics?.school.weeklyHoursSparkline ?? []} height={56} />
            </div>
            {schoolSummary?.content && (
              <p className="line-clamp-2 text-xs text-muted">{schoolSummary.content}</p>
            )}
          </Card>
        </Link>

        {/* Work */}
        <Link href="/work" className="block">
          <Card className="panel panel-hover press-flash flex h-full flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted" />
                <span className="text-sm font-semibold">Work</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold nums">
                  <CountUp value={metrics?.work.inProgressCount ?? 0} />
                </span>
                <span className="text-sm text-muted">in progress</span>
              </div>
            </div>
            <div className="h-14">
              <Sparkline data={metrics?.work.notesPerWeekSparkline ?? []} height={56} />
            </div>
            {workSummary?.content && (
              <p className="line-clamp-2 text-xs text-muted">{workSummary.content}</p>
            )}
          </Card>
        </Link>
      </div>

      {/* Journal widget — full width below the bento grid */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted" />
            <span className="text-sm font-semibold">Weekly journal</span>
          </div>
          {journalState?.entryOpen ? (
            <div className="space-y-2">
              <Link
                href="/journal/new"
                className="block rounded-xl border border-border bg-[var(--surface)] p-3 transition-colors hover:border-accent/30"
              >
                <p className="text-sm font-semibold">Write last week&apos;s summary</p>
                <p className="mt-0.5 text-xs text-muted">
                  {weekRangeLabel(journalState.targetWeekStart)}
                </p>
              </Link>
              <Link
                href="/journal"
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                Review journal →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">
                {journalState
                  ? `Caught up — next summary opens ${new Date(
                      journalState.nextOpenMonday + 'T00:00:00Z',
                    ).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    })}`
                  : 'Caught up for now.'}
              </p>
              <Link
                href="/journal"
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                Review journal →
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
