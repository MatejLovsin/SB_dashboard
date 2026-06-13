import Link from 'next/link';
import { Dumbbell, GraduationCap, Briefcase, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSummary } from '@/lib/queries/ai';
import { getHomeMetrics } from '@/lib/queries/home';
import { SummaryCard } from '@/components/ai/SummaryCard';
import { StatTile } from '@/components/ui/StatTile';
import { Sparkline } from '@/components/charts/Sparkline';

function fmtVol(kg: number): string {
  if (kg === 0) return '0';
  if (kg >= 10_000) return `${Math.round(kg / 1000)}k`;
  if (kg >= 1_000) return `${(kg / 1000).toFixed(1)}k`;
  return `${kg}`;
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Morning briefing</h1>
        <p className="mt-1 text-sm text-muted">A quick read on each area of your life.</p>
      </div>

      {/* KPI strip */}
      <div className="stagger-fade grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Fitness volume · 30d"
          value={fmtVol(metrics?.fitness.volume30d ?? 0)}
          unit="kg"
          delta={metrics?.fitness.volumeDelta ?? undefined}
        >
          <Sparkline data={metrics?.fitness.weeklyVolumeSparkline ?? []} />
        </StatTile>

        <StatTile
          label="Study · this week"
          value={String(metrics?.school.hoursThisWeek ?? 0)}
          unit="h"
          delta={metrics?.school.hoursDelta ?? undefined}
        >
          <Sparkline data={metrics?.school.weeklyHoursSparkline ?? []} />
        </StatTile>

        <StatTile
          label="Work · in progress"
          value={String(metrics?.work.inProgressCount ?? 0)}
          unit="cards"
        >
          <Sparkline data={metrics?.work.notesPerWeekSparkline ?? []} />
        </StatTile>
      </div>

      {/* AI Summaries */}
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-accent" />
              <span className="font-semibold">Fitness</span>
            </div>
            <Link
              href="/fitness"
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              Open <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <SummaryCard section="fitness" initial={fitnessSummary} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-accent" />
              <span className="font-semibold">School</span>
            </div>
            <Link
              href="/school"
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              Open <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <SummaryCard section="school" initial={schoolSummary} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-accent" />
              <span className="font-semibold">Work</span>
            </div>
            <Link
              href="/work"
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              Open <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <SummaryCard section="work" initial={workSummary} />
        </div>
      </div>
    </div>
  );
}
