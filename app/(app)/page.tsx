import Link from 'next/link';
import { Dumbbell, GraduationCap, Briefcase, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSummary } from '@/lib/queries/ai';
import { getHomeMetrics } from '@/lib/queries/home';
import { StatTile } from '@/components/ui/StatTile';
import { CountUp } from '@/components/ui/CountUp';
import { Sparkline } from '@/components/charts/Sparkline';
import { Card } from '@/components/ui/Card';

function fmtVol(kg: number): number {
  return kg;
}

export default async function HomePage() {
  const supabase = await createClient();
  const [metrics, fitnessSummary, schoolSummary, workSummary] = await Promise.all([
    getHomeMetrics(supabase).catch(() => null),
    getSummary(supabase, 'fitness').catch(() => null),
    getSummary(supabase, 'school').catch(() => null),
    getSummary(supabase, 'work').catch(() => null),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Morning briefing</h1>
        <p className="mt-0.5 text-sm text-muted">A quick read on each area of your life.</p>
      </div>

      {/* KPI strip */}
      <div className="stagger-fade grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Fitness volume · 30d"
          value={<CountUp value={fmtVol(metrics?.fitness.volume30d ?? 0)} format="compact" />}
          unit="kg"
          delta={metrics?.fitness.volumeDelta ?? undefined}
        >
          <Sparkline data={metrics?.fitness.weeklyVolumeSparkline ?? []} />
        </StatTile>

        <StatTile
          label="Study · this week"
          value={<CountUp value={metrics?.school.hoursThisWeek ?? 0} decimals={1} />}
          unit="h"
          delta={metrics?.school.hoursDelta ?? undefined}
        >
          <Sparkline data={metrics?.school.weeklyHoursSparkline ?? []} />
        </StatTile>

        <StatTile
          label="Work · in progress"
          value={<CountUp value={metrics?.work.inProgressCount ?? 0} />}
          unit="cards"
        >
          <Sparkline data={metrics?.work.notesPerWeekSparkline ?? []} />
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
    </div>
  );
}
