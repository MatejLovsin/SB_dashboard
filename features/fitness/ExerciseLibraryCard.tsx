'use client';

import dynamic from 'next/dynamic';
import { Pin } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import type { ExerciseLibraryEntry, PinnedLiftPoint } from '@/lib/queries/analytics';

const MiniTrendChart = dynamic(
  () => import('./charts/MiniTrendChart').then((m) => m.MiniTrendChart),
  { ssr: false, loading: () => <div className="flex h-9 items-center justify-center"><Spinner /></div> },
);

interface ExerciseLibraryCardProps {
  entry: ExerciseLibraryEntry;
  onSelect: () => void;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ExerciseLibraryCard({ entry, onSelect }: ExerciseLibraryCardProps) {
  const hasSparkline = entry.sparkline.length >= 2;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="panel panel-hover press-flash w-full rounded-2xl p-4 text-left transition"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{entry.name}</p>
          {entry.category ? (
            <p className="text-xs text-muted">{entry.category}</p>
          ) : null}
        </div>
        {entry.pinned ? (
          <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-current text-accent" />
        ) : null}
      </div>

      {/* Stats row */}
      <div className="mt-2 flex items-baseline gap-3">
        {entry.bestE1RM > 0 ? (
          <>
            <span className="text-2xl font-bold nums">{entry.bestE1RM}</span>
            <span className="text-xs text-muted">kg best e1RM</span>
          </>
        ) : (
          <span className="text-xs text-muted">Not logged yet</span>
        )}
        <span className="ml-auto text-xs text-muted nums">
          {entry.sessionCount} session{entry.sessionCount === 1 ? '' : 's'}
        </span>
        {entry.lastPerformed ? (
          <span className="text-xs text-muted nums">{shortDate(entry.lastPerformed)}</span>
        ) : null}
      </div>

      {/* Sparkline */}
      {hasSparkline ? (
        <div className="mt-2">
          <MiniTrendChart points={entry.sparkline as PinnedLiftPoint[]} height={36} />
        </div>
      ) : null}
    </button>
  );
}
