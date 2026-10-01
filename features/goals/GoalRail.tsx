import Link from 'next/link';
import { Target } from 'lucide-react';

/** The hub rail caps here so it can't swallow the page. */
export const MAX_ON_HUB = 6;

/**
 * The frame both the live strip and its loading ghost draw into — the header
 * row and the snap-scrolling rail. Shared so the two are the same height to the
 * pixel: the ghost exists only to keep the KPI tiles below from jumping.
 */
export function GoalRail({ overflow, children }: { overflow: number; children: React.ReactNode }) {
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
        {children}
      </div>
    </section>
  );
}

/** One slot in the rail — the width rules a card takes on each breakpoint. */
export const RAIL_ITEM = 'w-[72%] shrink-0 snap-start sm:w-[46%] lg:w-auto';
