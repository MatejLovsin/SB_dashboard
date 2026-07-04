'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HeartPulse } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cardioKeys, getCardioActivityLibrary } from '@/lib/queries/cardio';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkline } from '@/components/charts/Sparkline';
import { CardioActivityDetail } from './CardioActivityDetail';

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CardioActivityLibrary() {
  const supabase = createClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { data: activities, isPending } = useQuery({
    queryKey: cardioKeys.activityLibrary(),
    queryFn: () => getCardioActivityLibrary(supabase),
    staleTime: 60_000,
  });

  if (selectedKey !== null) {
    const entry = activities?.find((a) => a.key === selectedKey);
    if (entry) return <CardioActivityDetail entry={entry} onBack={() => setSelectedKey(null)} />;
    if (isPending) {
      return (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <Spinner /> Loading…
        </div>
      );
    }
    setSelectedKey(null);
  }

  if (isPending) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted">
        <Spinner /> Loading activities…
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="No cardio activities yet"
        description="Log a cardio session to see activity breakdowns here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {activities.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => setSelectedKey(entry.key)}
          className="panel panel-hover press-flash w-full rounded-2xl p-4 text-left transition"
        >
          <p className="truncate text-sm font-medium">{entry.name}</p>

          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-bold nums">{entry.avgIntensity}</span>
            <span className="text-xs text-muted">avg RPE</span>
            <span className="ml-auto text-xs text-muted nums">
              {entry.entryCount} session{entry.entryCount === 1 ? '' : 's'}
            </span>
            {entry.lastPerformed ? (
              <span className="text-xs text-muted nums">{shortDate(entry.lastPerformed)}</span>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-muted">{entry.totalDurationMinutes} min total</p>

          {entry.sparkline.length >= 2 ? (
            <div className="mt-2">
              <Sparkline data={entry.sparkline} height={36} />
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}
