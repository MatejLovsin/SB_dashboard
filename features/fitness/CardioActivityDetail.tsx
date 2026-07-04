'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cardioKeys, getCardioActivityHistory, type CardioActivityEntry } from '@/lib/queries/cardio';
import { Card, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { StatTile } from '@/components/ui/StatTile';
import { ConsistencyHeatmap } from './charts/ConsistencyHeatmap';

const IntensityTrendChart = dynamic(
  () => import('./charts/CardioTrendChart').then((m) => m.IntensityTrendChart),
  { ssr: false, loading: () => <div className="flex h-40 items-center justify-center"><Spinner /></div> },
);
const DurationTrendChart = dynamic(
  () => import('./charts/CardioTrendChart').then((m) => m.DurationTrendChart),
  { ssr: false, loading: () => <div className="flex h-40 items-center justify-center"><Spinner /></div> },
);

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Props {
  entry: CardioActivityEntry;
  onBack: () => void;
}

export function CardioActivityDetail({ entry, onBack }: Props) {
  const supabase = createClient();

  const { data: history, isPending } = useQuery({
    queryKey: cardioKeys.activityHistory(entry.name),
    queryFn: () => getCardioActivityHistory(supabase, entry.name),
    staleTime: 60_000,
  });

  const activeDays = history?.map((p) => p.performedAt.slice(0, 10)) ?? [];
  const recent = history ? [...history].reverse().slice(0, 8) : [];

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Activities
      </button>

      <h1 className="text-xl font-semibold">{entry.name}</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Avg RPE" value={entry.avgIntensity} unit="/10" />
        <StatTile
          label="Sessions"
          value={entry.entryCount}
          caption={entry.lastPerformed ? `Last: ${shortDate(entry.lastPerformed)}` : undefined}
        />
        <StatTile label="Total time" value={entry.totalDurationMinutes} unit="min" />
        <StatTile
          label="Avg duration"
          value={entry.entryCount > 0 ? Math.round(entry.totalDurationMinutes / entry.entryCount) : 0}
          unit="min"
        />
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted">
          <Spinner /> Loading history…
        </div>
      ) : !history || history.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No logged sessions yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardTitle className="mb-4">Intensity (RPE) trend</CardTitle>
              <IntensityTrendChart data={history} />
            </Card>
            <Card>
              <CardTitle className="mb-4">Duration trend</CardTitle>
              <DurationTrendChart data={history} />
            </Card>
          </div>

          <Card>
            <CardTitle className="mb-4">Consistency — last 12 weeks</CardTitle>
            <ConsistencyHeatmap activeDays={activeDays} weeks={12} />
          </Card>

          <Card>
            <CardTitle className="mb-3">Recent sessions</CardTitle>
            <ul className="space-y-1.5">
              {recent.map((p) => (
                <li
                  key={p.entry.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{shortDate(p.performedAt)}</span>
                  <span className="shrink-0 text-xs text-muted nums">
                    {Math.round(Number(p.entry.duration_minutes))} min
                  </span>
                  <span className="shrink-0 text-xs text-muted nums">RPE {p.entry.intensity}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
