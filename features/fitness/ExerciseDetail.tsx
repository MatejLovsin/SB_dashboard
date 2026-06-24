'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Pin } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { fitnessKeys, setExercisePinned, updateExerciseNotes } from '@/lib/queries/fitness';
import { getExerciseHistory } from '@/lib/queries/analytics';
import type { ExerciseLibraryEntry } from '@/lib/queries/analytics';
import { Card, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { StatTile } from '@/components/ui/StatTile';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { ConsistencyHeatmap } from './charts/ConsistencyHeatmap';

const StrengthTrendChart = dynamic(
  () => import('./charts/StrengthTrendChart').then((m) => m.StrengthTrendChart),
  { ssr: false, loading: () => <div className="flex h-44 items-center justify-center"><Spinner /></div> },
);
const VolumeBarChart = dynamic(
  () => import('./charts/VolumeBarChart').then((m) => m.VolumeBarChart),
  { ssr: false, loading: () => <div className="flex h-44 items-center justify-center"><Spinner /></div> },
);

interface ExerciseDetailProps {
  entry: ExerciseLibraryEntry;
  onBack: () => void;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ExerciseDetail({ entry, onBack }: ExerciseDetailProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Notes state
  const [notesDraft, setNotesDraft] = useState(entry.notes ?? '');
  const isDirty = notesDraft !== (entry.notes ?? '');

  const notesMutation = useMutation({
    mutationFn: () => updateExerciseNotes(supabase, entry.id, notesDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fitnessKeys.exerciseLibrary() });
    },
  });

  // Pin toggle
  const pinMutation = useMutation({
    mutationFn: () => setExercisePinned(supabase, entry.id, !entry.pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fitnessKeys.exercisesAll() });
      queryClient.invalidateQueries({ queryKey: fitnessKeys.exerciseLibrary() });
    },
  });

  // History
  const { data: history, isPending: historyPending } = useQuery({
    queryKey: fitnessKeys.exerciseHistory(entry.id),
    queryFn: () => getExerciseHistory(supabase, entry.id),
    staleTime: 60_000,
  });

  const activeDays = history?.map((p) => p.session.performed_at.slice(0, 10)) ?? [];

  // "Most used in" — top 5 sessions by set count
  const topSessions = history
    ? [...history]
        .map((p) => ({ ...p, setCount: p.sets.length }))
        .sort((a, b) => {
          if (b.setCount !== a.setCount) return b.setCount - a.setCount;
          return b.session.performed_at.localeCompare(a.session.performed_at);
        })
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Exercises
      </button>

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{entry.name}</h1>
          {entry.category ? (
            <p className="text-sm text-muted">{entry.category}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => pinMutation.mutate()}
          disabled={pinMutation.isPending}
          aria-label={entry.pinned ? 'Unpin exercise' : 'Pin exercise'}
          className={`mt-0.5 shrink-0 rounded-xl p-2 transition-colors ${
            entry.pinned
              ? 'text-accent'
              : 'text-muted hover:text-foreground'
          }`}
        >
          {pinMutation.isPending ? (
            <Spinner />
          ) : (
            <Pin className={`h-5 w-5 ${entry.pinned ? 'fill-current' : ''}`} />
          )}
        </button>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Best est. 1RM"
          value={entry.bestE1RM > 0 ? entry.bestE1RM : '—'}
          unit={entry.bestE1RM > 0 ? 'kg' : undefined}
        />
        <StatTile
          label="Sessions"
          value={entry.sessionCount}
          caption={entry.lastPerformed ? `Last: ${shortDate(entry.lastPerformed)}` : undefined}
        />
      </div>

      {/* Notes card */}
      <Card>
        <CardTitle className="mb-3">Notes</CardTitle>
        <TextArea
          maxRows={8}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Cues, form notes, PR history…"
        />
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => notesMutation.mutate()}
            disabled={!isDirty || notesMutation.isPending}
          >
            {notesMutation.isPending ? (
              <span className="flex items-center gap-1.5">
                <Spinner /> Saving…
              </span>
            ) : 'Save'}
          </Button>
          {!isDirty && !notesMutation.isPending && notesMutation.isSuccess ? (
            <span className="text-xs text-muted">Saved</span>
          ) : null}
        </div>
      </Card>

      {/* History section */}
      {historyPending ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted">
          <Spinner /> Loading history…
        </div>
      ) : !history || history.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No logged sets yet.</p>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardTitle className="mb-4">Est. 1RM trend</CardTitle>
              <StrengthTrendChart data={history} />
            </Card>
            <Card>
              <CardTitle className="mb-4">Volume / session</CardTitle>
              <VolumeBarChart data={history} />
            </Card>
          </div>

          <Card>
            <CardTitle className="mb-4">Consistency — last 12 weeks</CardTitle>
            <ConsistencyHeatmap activeDays={activeDays} weeks={12} />
          </Card>

          {/* Most used in */}
          {topSessions.length > 0 ? (
            <Card>
              <CardTitle className="mb-3">Most used in</CardTitle>
              <ul className="space-y-1.5">
                {topSessions.map((p) => (
                  <li key={p.session.id}>
                    <Link
                      href={`/fitness/sessions/${p.session.id}`}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-card-2"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {p.session.title ?? 'Untitled session'}
                      </span>
                      <span className="shrink-0 text-xs text-muted nums">
                        {shortDate(p.session.performed_at)}
                      </span>
                      <span className="shrink-0 text-xs text-muted nums">
                        {p.setCount} set{p.setCount === 1 ? '' : 's'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
