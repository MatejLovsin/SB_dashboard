'use client';

import { useSyncExternalStore } from 'react';
import { Card } from '@/components/ui/Card';
import type { GoalSection } from '@/lib/db/types';
import {
  readGoalSnapshot,
  serverGoalSnapshot,
  subscribeGoalSnapshot,
} from '@/lib/utils/goalSnapshot';
import { GoalRail, MAX_ON_HUB, RAIL_ITEM } from './GoalRail';

/**
 * The goal strip while its goals are still resolving — the Suspense fallback
 * for `GoalStripLoader`. It draws last visit's goals (the snapshot GoalStrip
 * leaves behind) unlit: same titles, same count, bars where they stood. So the
 * rail holds its exact height and the KPI tiles below never jump, and when the
 * live strip lands each bar picks up from this width (GoalBar `drawFrom`).
 *
 * No snapshot for the section — none yet, or no active goals last time —
 * reserves nothing, which is also what the live strip renders for no goals.
 */
export function GoalStripGhost({ section }: { section: GoalSection }) {
  const stored = useSyncExternalStore(subscribeGoalSnapshot, readGoalSnapshot, serverGoalSnapshot);
  const ordered = stored.filter((g) => g.section === section).sort((a, b) => b.percent - a.percent);
  if (ordered.length === 0) return null;
  const shown = ordered.slice(0, MAX_ON_HUB);

  return (
    <div aria-busy="true" className="pointer-events-none opacity-50">
      <GoalRail overflow={ordered.length - shown.length}>
        {shown.map((g) => (
          <div key={g.id} className={RAIL_ITEM}>
            <Card className="h-full">
              <div className="mb-2.5 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-muted">{g.title}</span>
                <span className="nums shrink-0 text-sm font-bold text-muted">{g.percent}%</span>
              </div>
              <GhostBar percent={g.percent} />
              <p className="mt-1.5 text-xs">{' '}</p>
            </Card>
          </div>
        ))}
      </GoalRail>
    </div>
  );
}

/** GoalBar's strip variant with the light off: the rail, the cleared portion,
 *  and an empty endcap row so the height matches line for line. */
function GhostBar({ percent }: { percent: number }) {
  const pct = Math.min(100, Math.max(0, percent));
  return (
    <div>
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <div
          className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-muted"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="nums text-[10px]">{' '}</span>
      </div>
    </div>
  );
}
