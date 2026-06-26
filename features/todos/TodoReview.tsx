'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare } from 'lucide-react';
import {
  todoKeys,
  todayUTC,
  addDaysUTC,
  listTodosInRange,
  computeDayStats,
  positionStats,
  weeklyRollup,
  buildComparisons,
  type ComparisonItem,
} from '@/lib/queries/todos';
import { mondayOf } from '@/lib/utils/stats';
import { createClient } from '@/lib/supabase/client';
import { StatTile } from '@/components/ui/StatTile';
import { CountUp } from '@/components/ui/CountUp';
import { AreaTrend } from '@/components/charts/AreaTrend';
import { BarCluster } from '@/components/charts/BarCluster';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { CompletionBars } from './charts/CompletionBars';

export function TodoReview() {
  const supabase = createClient();
  const today = useMemo(() => todayUTC(), []);
  const from = useMemo(() => addDaysUTC(today, -30), [today]);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: todoKeys.range(from, today),
    queryFn: () => listTodosInRange(supabase, from, today).catch(() => []),
  });

  const derived = useMemo(() => {
    const dayStats = computeDayStats(todos, today);
    const totalCompleted = dayStats.reduce((a, d) => a + d.completed, 0);
    const totalItems = dayStats.reduce((a, d) => a + d.total, 0);
    const overallRate = totalItems > 0 ? totalCompleted / totalItems : 0;

    // Position stats for the whole window
    const pastTodos = todos.filter((t) => t.due_date < today);
    const allPosStat = positionStats(pastTodos);

    // Position stats split by this week vs last week
    const thisWeekStart = mondayOf(new Date(today + 'T00:00:00Z'));
    const lastWeekStart = addDaysUTC(thisWeekStart, -7);
    const thisWeekPast = pastTodos.filter(
      (t) => mondayOf(new Date(t.due_date + 'T00:00:00Z')) === thisWeekStart,
    );
    const lastWeekPast = pastTodos.filter(
      (t) => mondayOf(new Date(t.due_date + 'T00:00:00Z')) === lastWeekStart,
    );
    const posStatsByPeriod = {
      thisWeek: positionStats(thisWeekPast),
      lastWeek: positionStats(lastWeekPast),
    };

    // Last 14 days stacked bar
    const last14Days = dayStats.slice(-14).map((d) => {
      const dt = new Date(d.date + 'T00:00:00Z');
      const label = dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      return { label, completed: d.completed, failed: d.failed };
    });

    // Rate trend (AreaTrend — % per day)
    const rateTrend = dayStats.slice(-14).map((d) => {
      const dt = new Date(d.date + 'T00:00:00Z');
      const label = dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      return { label, value: Math.round(d.rate * 100) };
    });

    // Weekly completed counts (BarCluster)
    const weekly = weeklyRollup(dayStats);
    const weeklyData = weekly.map((w) => ({ label: w.label, value: w.completed }));

    const comparisons = buildComparisons(dayStats, posStatsByPeriod);

    return {
      dayStats,
      overallRate,
      avgRankDone: allPosStat.completedAvgPos,
      avgRankMissed: allPosStat.failedAvgPos,
      last14Days,
      rateTrend,
      weeklyData,
      comparisons,
    };
  }, [todos, today]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (derived.dayStats.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No data yet"
        description="Complete a few days of to-dos to see your performance here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Completion rate · 30d"
          value={<CountUp value={Math.round(derived.overallRate * 100)} />}
          unit="%"
        />
        <StatTile
          label="Avg rank done"
          value={
            derived.avgRankDone > 0 ? (
              <CountUp value={derived.avgRankDone} decimals={1} />
            ) : (
              <span>—</span>
            )
          }
        />
        <StatTile
          label="Avg rank missed"
          value={
            derived.avgRankMissed > 0 ? (
              <CountUp value={derived.avgRankMissed} decimals={1} />
            ) : (
              <span>—</span>
            )
          }
        />
      </div>

      {/* Stacked bar: completed vs failed per day (last 14 days) */}
      <div className="space-y-2 rounded-2xl border border-border bg-[var(--surface)] p-4">
        <p className="text-sm font-semibold">Daily completion · last 14 days</p>
        <CompletionBars data={derived.last14Days} height={180} />
      </div>

      {/* Completion rate % trend */}
      <div className="space-y-2 rounded-2xl border border-border bg-[var(--surface)] p-4">
        <p className="text-sm font-semibold">Completion rate % · trend</p>
        <AreaTrend data={derived.rateTrend} height={160} unit="%" name="Rate" />
      </div>

      {/* Weekly completed count */}
      <div className="space-y-2 rounded-2xl border border-border bg-[var(--surface)] p-4">
        <p className="text-sm font-semibold">Completed per week</p>
        <BarCluster
          data={derived.weeklyData}
          height={160}
          integer
          name="Completed"
        />
      </div>

      {/* Comparisons feed */}
      {derived.comparisons.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">vs previous</p>
          <div className="space-y-2">
            {derived.comparisons.map((c) => (
              <ComparisonCard key={c.key} item={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison card
// ---------------------------------------------------------------------------

function ComparisonCard({ item }: { item: ComparisonItem }) {
  const { label, text, deltaPct } = item;
  const isPositive = deltaPct !== null && deltaPct > 0;
  const isNegative = deltaPct !== null && deltaPct < 0;

  return (
    <div className="rounded-2xl border border-border bg-[var(--surface)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            {label}
          </p>
          <p className="mt-0.5 text-sm">{text}</p>
        </div>
        {deltaPct !== null && (
          <span
            className={`shrink-0 text-sm font-semibold tabular-nums ${
              isPositive
                ? 'text-emerald-400'
                : isNegative
                  ? 'text-red-400'
                  : 'text-muted'
            }`}
          >
            {isPositive ? '+' : ''}
            {deltaPct}%
          </span>
        )}
      </div>
    </div>
  );
}
