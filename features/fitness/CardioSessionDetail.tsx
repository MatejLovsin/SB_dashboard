'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cardioKeys, getCardioSessionWithEntries, type CardioSessionWithEntries } from '@/lib/queries/cardio';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Read-only expanded view of a single cardio session — activities and metadata.
 * Mirrors FitnessSessionDetail/SessionDetailBody for the weightlifting side.
 */
export function CardioSessionDetail({ sessionId }: { sessionId: string }) {
  const supabase = createClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: cardioKeys.session(sessionId),
    queryFn: () => getCardioSessionWithEntries(supabase, sessionId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {(error as Error).message ?? 'Failed to load session.'}
      </p>
    );
  }

  if (!data) return null;

  return <CardioSessionDetailBody data={data} />;
}

export function CardioSessionDetailBody({ data }: { data: CardioSessionWithEntries }) {
  const { session, entries } = data;

  const totalDuration = Math.round(entries.reduce((s, e) => s + Number(e.duration_minutes), 0));
  const avgIntensity =
    entries.length > 0
      ? Math.round((entries.reduce((s, e) => s + e.intensity, 0) / entries.length) * 10) / 10
      : 0;

  const stats: { label: string; value: string }[] = [
    { label: 'Activities', value: String(entries.length) },
    { label: 'Duration', value: `${totalDuration} min` },
    { label: 'Avg RPE', value: entries.length > 0 ? String(avgIntensity) : '—' },
  ];

  const date = new Date(session.performed_at.slice(0, 10) + 'T00:00:00Z').toLocaleDateString(
    undefined,
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
  );

  return (
    <article className="space-y-5">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
        <CalendarDays className="h-3.5 w-3.5" />
        {date}
      </div>

      {session.notes && (
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
          {session.notes}
        </p>
      )}

      {entries.length > 0 ? (
        <div className="space-y-4 pt-1">
          {entries.map((entry) => (
            <section key={entry.id} className="space-y-1.5 border-t border-border pt-3 first:border-t-0 first:pt-0">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">
                {entry.activity}
              </h3>
              <p className="text-sm text-foreground/90">
                {Math.round(Number(entry.duration_minutes))} min · RPE {entry.intensity}/10
                {entry.distance_km != null ? ` · ${entry.distance_km} km` : ''}
              </p>
              {entry.notes && (
                <p className="whitespace-pre-line text-sm text-muted">{entry.notes}</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-muted">No activities logged.</p>
      )}

      {entries.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center rounded-xl border border-border bg-[var(--surface)] px-2 py-3 text-center"
              >
                <p className="truncate text-base font-semibold leading-none tabular-nums">
                  {s.value}
                </p>
                <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
