'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { GoalBar, fmtGoalValue } from '@/components/ui/GoalBar';
import type { GoalSection } from '@/lib/db/types';
import type { ResolvedGoal } from '@/lib/queries/goals';
import {
  readGoalSnapshot,
  serverGoalSnapshot,
  subscribeGoalSnapshot,
  toGoalSnapshot,
  writeGoalSnapshot,
} from '@/lib/utils/goalSnapshot';
import { GoalRail, MAX_ON_HUB, RAIL_ITEM } from './GoalRail';

interface GoalStripProps {
  goals: ResolvedGoal[];
  /** Which section these belong to — the rail leaves a snapshot behind for the
   *  loading screens, and it may only replace its own section's entry. */
  section: GoalSection;
}

/**
 * The section's active goals, pinned to its hub. Built like `WeekProgramme`:
 * snap-scrolling row on a phone, grid on `lg`. Read-only — ticking and editing
 * happen on /goals, so the hub stays a glance surface.
 *
 * Shows every active goal rather than only pinned ones (no bookkeeping to keep
 * up with), ordered nearest-to-done, capped so the rail can't swallow the hub.
 */
export function GoalStrip({ goals, section }: GoalStripProps) {
  // Where each bar stood last visit. The ghost (GoalStripGhost) drew it there,
  // so the live bar starts from the same width and eases to today's value
  // rather than redrawing from zero. GoalBar keeps only its first-render value,
  // so the write below doesn't move the start point — and on a hard refresh the
  // server snapshot is empty, which keeps hydration clean and draws from zero.
  const stored = useSyncExternalStore(subscribeGoalSnapshot, readGoalSnapshot, serverGoalSnapshot);
  const from = useMemo(() => new Map(stored.map((g) => [g.id, g.percent / 100])), [stored]);

  // Before the early return: a section that has just lost its last goal still
  // needs to clear the stale snapshot. See lib/utils/goalSnapshot.ts.
  useEffect(() => {
    writeGoalSnapshot(section, goals.map((g) => toGoalSnapshot(g)));
  }, [section, goals]);

  if (goals.length === 0) return null;

  const ordered = [...goals].sort((a, b) => b.percent - a.percent);
  const shown = ordered.slice(0, MAX_ON_HUB);

  return (
    <GoalRail overflow={ordered.length - shown.length}>
      {shown.map(({ goal, milestones, current, best, percent, achieved }) => (
        <Link key={goal.id} href="/goals" className={RAIL_ITEM}>
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
              drawFrom={from.get(goal.id)}
            />
            <p className="mt-1.5 truncate text-xs text-muted">
              {/* Always a line tall, so the ghost (which can't know) matches. */}
              {achieved ? 'Done' : current != null ? `Now ${fmtGoalValue(current)} ${goal.unit ?? ''}`.trim() : ' '}
            </p>
          </Card>
        </Link>
      ))}
    </GoalRail>
  );
}
