'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Check, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getSessionWithSets } from '@/lib/queries/sessions';
import { type SessionWithSets } from '@/lib/queries/fitness';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Read-only expanded view of a single fitness session — exercises, sets, and metadata.
 * Rendered inside a {@link FocusOverlay}; visually distinct from the compact list row
 * and from the editable SessionEditor.
 */
export function FitnessSessionDetail({ sessionId }: { sessionId: string }) {
  const supabase = createClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: () => getSessionWithSets(supabase, sessionId),
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

  return <SessionDetailBody data={data} />;
}

function fmtTarget(v: { weight: number | null; reps: number | null }): string {
  const reps = v.reps ?? '—';
  return v.weight != null && v.weight > 0 ? `${v.weight} kg × ${reps}` : `${reps} reps`;
}

// Banner shown at the top of a session that auto-progressed its source plan.
function PlanUpdatedBanner({ data }: { data: SessionWithSets }) {
  const updates = data.session.plan_updates;
  if (!updates || updates.length === 0) return null;
  return (
    <div className="rounded-xl border border-accent/30 bg-accent-soft/60 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
        <TrendingUp className="h-3.5 w-3.5" />
        Plan updated
      </div>
      <ul className="mt-2 space-y-1">
        {updates.map((u, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium text-foreground/90">{u.exerciseName}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {fmtTarget(u.from)} →{' '}
              <span className="font-semibold text-foreground">{fmtTarget(u.to)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SessionDetailBody({ data }: { data: SessionWithSets }) {
  const { session, groups } = data;

  // Summary stats — prefer completed sets, but fall back to all logged sets so a
  // session that was logged without ticking "completed" still shows real numbers.
  const allSets = groups.flatMap((g) => g.sets);
  const doneSets = allSets.filter((s) => s.completed);
  const statSets = doneSets.length > 0 ? doneSets : allSets;
  const totalReps = statSets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  const totalVolume = statSets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight ?? 0), 0);

  const stats: { label: string; value: string }[] = [
    { label: 'Exercises', value: String(groups.length) },
    { label: 'Sets', value: String(statSets.length) },
    { label: 'Reps', value: totalReps.toLocaleString() },
    { label: 'Volume', value: `${Math.round(totalVolume).toLocaleString()} kg` },
  ];

  const date = new Date(session.performed_at.slice(0, 10) + 'T00:00:00Z').toLocaleDateString(
    undefined,
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    },
  );

  return (
    <article className="space-y-5">
      {/* Eyebrow date chip */}
      <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
        <CalendarDays className="h-3.5 w-3.5" />
        {date}
      </div>

      {/* Plan auto-progression banner */}
      <PlanUpdatedBanner data={data} />

      {/* Session notes */}
      {session.notes && (
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
          {session.notes}
        </p>
      )}

      {/* Exercise groups */}
      {groups.length > 0 ? (
        <div className="space-y-5 pt-1">
          {groups.map((group) => (
            <section key={group.exercise_id} className="space-y-2">
              {/* Exercise name heading */}
              <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">
                {group.exercise?.name ?? 'Unknown exercise'}
              </h3>

              {/* Sets */}
              <ul className="space-y-1">
                {group.sets.map((set) => {
                  const repsStr = set.reps != null ? String(set.reps) : '—';
                  const weightStr = set.weight != null ? `${set.weight} kg` : '—';
                  return (
                    <li
                      key={set.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-6 text-right text-xs text-muted">{set.set_number}</span>
                      <span
                        className={
                          set.completed
                            ? 'text-foreground/90'
                            : 'text-foreground/50 line-through'
                        }
                      >
                        {repsStr} × {weightStr}
                      </span>
                      {set.completed && (
                        <Check className="h-3.5 w-3.5 text-accent" aria-label="completed" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-muted">No exercises logged.</p>
      )}

      {/* Summary stats footer — equal-width grid so a long value (e.g. Volume)
          can't widen its tile and throw the row out of alignment. */}
      {allSets.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
