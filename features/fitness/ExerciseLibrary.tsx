'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Settings2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fitnessKeys } from '@/lib/queries/fitness';
import { getExerciseLibrary } from '@/lib/queries/analytics';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { ExerciseLibraryCard } from './ExerciseLibraryCard';
import { ExerciseDetail } from './ExerciseDetail';

export function ExerciseLibrary() {
  const supabase = createClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: exercises, isPending } = useQuery({
    queryKey: fitnessKeys.exerciseLibrary(),
    queryFn: () => getExerciseLibrary(supabase),
    staleTime: 60_000,
  });

  // If detail view is requested, find the entry and render it
  if (selectedId !== null) {
    const entry = exercises?.find((e) => e.id === selectedId);
    if (!entry) {
      // Entry not found (loading or gone) — fall through to browse
      if (isPending) {
        return (
          <div className="flex items-center gap-2 py-8 text-sm text-muted">
            <Spinner /> Loading…
          </div>
        );
      }
      // Clear bad selection
      setSelectedId(null);
    } else {
      return <ExerciseDetail entry={entry} onBack={() => setSelectedId(null)} />;
    }
  }

  // Browse mode
  const filtered = exercises
    ? exercises.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Exercises"
          description="Every exercise you've logged — search, review progress, and keep notes."
        />
        <Link
          href="/fitness/exercises"
          className="mt-1 flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
          Manage
        </Link>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent"
        />
      </div>

      {/* Content */}
      {isPending ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <Spinner /> Loading exercises…
        </div>
      ) : exercises && exercises.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No exercises yet. Log a workout to see them here.
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No exercises match &quot;{search}&quot;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((entry) => (
            <ExerciseLibraryCard
              key={entry.id}
              entry={entry}
              onSelect={() => setSelectedId(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
