'use client';

import dynamic from 'next/dynamic';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { PinnedLiftTrend } from '@/lib/queries/analytics';

const MiniTrendChart = dynamic(
  () => import('./charts/MiniTrendChart').then((m) => m.MiniTrendChart),
  { ssr: false, loading: () => <div className="h-12" /> },
);

// Side-by-side pinned-lift tiles for the Fitness hub Exercise-history card.
// Display-only (no nested links/buttons) so the whole card stays one <Link>.
export function PinnedLifts({ lifts }: { lifts: PinnedLiftTrend[] }) {
  if (lifts.length === 0) return null;

  return (
    <div className="mb-4 grid grid-cols-2 gap-3">
      {lifts.map(({ exercise, points, current, delta }) => (
        <div
          key={exercise.id}
          className="rounded-xl border border-border bg-background p-3"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold">{exercise.name}</span>
            {delta !== null && delta !== 0 ? (
              <span
                className={`flex shrink-0 items-center gap-0.5 text-xs font-medium ${
                  delta > 0 ? 'text-emerald-500' : 'text-red-400'
                }`}
              >
                {delta > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {delta > 0 ? '+' : ''}
                {delta}
              </span>
            ) : null}
          </div>

          {points.length > 0 ? (
            <>
              <div className="mt-1">
                <MiniTrendChart points={points} />
              </div>
              <p className="mt-1 text-xs text-muted">
                <span className="font-medium text-foreground">{current}</span> kg est. 1RM
              </p>
            </>
          ) : (
            <p className="mt-3 text-xs text-muted">No sets logged yet.</p>
          )}
        </div>
      ))}
    </div>
  );
}
