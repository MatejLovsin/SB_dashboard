'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fitnessKeys } from '@/lib/queries/fitness';
import { getExerciseHistory } from '@/lib/queries/analytics';
import type { Exercise } from '@/lib/db/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';
import dynamic from 'next/dynamic';
import { ExercisePicker } from './ExercisePicker';
import { ConsistencyHeatmap } from './charts/ConsistencyHeatmap';

const StrengthTrendChart = dynamic(
  () => import('./charts/StrengthTrendChart').then((m) => m.StrengthTrendChart),
  { ssr: false, loading: () => <div className="flex h-44 items-center justify-center"><Spinner /></div> },
);
const VolumeBarChart = dynamic(
  () => import('./charts/VolumeBarChart').then((m) => m.VolumeBarChart),
  { ssr: false, loading: () => <div className="flex h-44 items-center justify-center"><Spinner /></div> },
);
import { BarChart2, X } from 'lucide-react';

export function ExerciseHistory() {
  const supabase = createClient();
  const [selected, setSelected] = useState<Pick<Exercise, 'id' | 'name'> | null>(null);
  const [picking, setPicking] = useState(true);

  const { data: history, isPending, isError, error } = useQuery({
    queryKey: fitnessKeys.exerciseHistory(selected?.id ?? ''),
    queryFn: () => getExerciseHistory(supabase, selected!.id),
    enabled: selected !== null,
    staleTime: 60_000,
  });

  const activeDays = history?.map((p) => p.session.performed_at.slice(0, 10)) ?? [];

  function handleSelect(exercise: Exercise) {
    setSelected({ id: exercise.id, name: exercise.name });
    setPicking(false);
  }

  return (
    <div>
      <PageHeader
        title="Exercise history"
        description="Strength trend, volume, and consistency for any exercise."
      />

      {/* Exercise selector */}
      {picking ? (
        <div className="mb-5 space-y-2">
          <ExercisePicker onSelect={handleSelect} placeholder="Search exercise…" autoFocus />
          {selected !== null ? (
            <Button variant="ghost" size="sm" onClick={() => setPicking(false)}>
              Cancel
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{selected?.name}</span>
          <button
            type="button"
            className="shrink-0 text-muted hover:text-foreground"
            onClick={() => setPicking(true)}
            aria-label="Change exercise"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* History content */}
      {selected === null ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted">
          <BarChart2 className="h-10 w-10 opacity-30" />
          <p className="text-sm">Pick an exercise above to see its history.</p>
        </div>
      ) : isPending ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <Spinner /> Loading history…
        </div>
      ) : isError ? (
        <p className="py-4 text-sm text-red-600 dark:text-red-400">
          {(error as Error).message}
        </p>
      ) : history.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No logged sets for <strong>{selected.name}</strong> yet.
        </p>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardTitle className="mb-4">Estimated 1RM trend</CardTitle>
            <StrengthTrendChart data={history} />
          </Card>

          <Card>
            <CardTitle className="mb-4">Volume per session (kg)</CardTitle>
            <VolumeBarChart data={history} />
          </Card>

          <Card>
            <CardTitle className="mb-4">Consistency — last 12 weeks</CardTitle>
            <ConsistencyHeatmap activeDays={activeDays} weeks={12} />
          </Card>
        </div>
      )}
    </div>
  );
}
