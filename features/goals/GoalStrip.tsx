'use client';

import Link from 'next/link';
import { Target } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { GoalBar, fmtGoalValue } from '@/components/ui/GoalBar';
import type { ResolvedGoal } from '@/lib/queries/goals';

const MAX_ON_HUB = 6;

interface GoalStripProps {
  goals: ResolvedGoal[];
}

/**
 * The section's active goals, pinned to its hub. Built like `WeekProgramme`:
 * snap-scrolling row on a phone, grid on `lg`. Read-only — ticking and editing
 * happen on /goals, so the hub stays a glance surface.
 *
 * Shows every active goal rather than only pinned ones (no bookkeeping to keep
 * up with), ordered nearest-to-done, capped so the rail can't swallow the hub.
 */
export function GoalStrip({ goals }: GoalStripProps) {
  if (goals.length === 0) return null;

  const ordered = [...goals].sort((a, b) => b.percent - a.percent);
  const shown = ordered.slice(0, MAX_ON_HUB);
  const overflow = ordered.length - shown.length;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="label flex items-center gap-1.5 text-[11px] text-muted">
          <Target className="h-3 w-3" />
          Goals
        </span>
        <Link href="/goals" className="label text-[10px] text-muted transition-colors hover:text-accent">
          {overflow > 0 ? `+${overflow} more` : 'All goals'}
        </Link>
      </div>

      <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {shown.map(({ goal, milestones, current, best, percent, achieved }) => (
          <Link
            key={goal.id}
            href="/goals"
            className="w-[72%] shrink-0 snap-start sm:w-[46%] lg:w-auto"
          >
            <Card className="panel-hover press-flash h-full cursor-pointer">
              <div className="mb-2.5 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{goal.title}</span>
                <span className="nums shrink-0 text-sm font-bold text-accent">{percent}%</span>
              </div>
              <GoalBar
                milestones={milestones}
                start={goal.start_value}
                target={goal.target_value}
                current={current}
                best={best}
                unit={goal.unit}
                direction={goal.direction}
                size="strip"
              />
              <p className="mt-1.5 truncate text-xs text-muted">
                {achieved ? 'Done' : current != null ? `Now ${fmtGoalValue(current)} ${goal.unit ?? ''}`.trim() : ''}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
