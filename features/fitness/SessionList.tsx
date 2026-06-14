'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronRight, Dumbbell, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fitnessKeys } from '@/lib/queries/fitness';
import { listSessions, getSessionSetsBySessionIds } from '@/lib/queries/analytics';
import { deleteSession } from '@/lib/queries/sessions';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

function formatDate(iso: string): string {
  return new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function SessionList() {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: [...fitnessKeys.sessions(), 'with-counts'],
    queryFn: async () => {
      const sessions = await listSessions(supabase, { limit: 60 });
      if (sessions.length === 0) return { sessions, exerciseCounts: new Map<string, number>() };
      const allSets = await getSessionSetsBySessionIds(supabase, sessions.map((s) => s.id));
      const bySession = new Map<string, Set<string>>();
      for (const set of allSets) {
        if (!bySession.has(set.session_id)) bySession.set(set.session_id, new Set());
        bySession.get(set.session_id)!.add(set.exercise_id);
      }
      const exerciseCounts = new Map<string, number>();
      for (const [sid, exSet] of bySession) exerciseCounts.set(sid, exSet.size);
      return { sessions, exerciseCounts };
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteSession(supabase, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fitnessKeys.sessions() });
    },
  });

  return (
    <div>
      <PageHeader title="Session log" description="All past workouts. Tap to view or edit." />

      <div className="mb-4 flex justify-end">
        <Button variant="secondary" onClick={() => router.push('/fitness/log')}>
          + Log workout
        </Button>
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Loading sessions…
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
      ) : !data || data.sessions.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No sessions yet"
          description="Complete a workout to see it here."
        />
      ) : (
        <ul className="space-y-2">
          {data.sessions.map((session) => {
            const exCount = data.exerciseCounts.get(session.id) ?? 0;
            const isDeleting =
              deleteMutation.isPending && deleteMutation.variables === session.id;

            return (
              <li key={session.id}>
                <Card className="flex items-center gap-3 p-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => router.push(`/fitness/sessions/${session.id}`)}
                  >
                    <p className="truncate font-medium">{session.title ?? 'Workout'}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(session.performed_at)}
                      {exCount > 0
                        ? ` · ${exCount} exercise${exCount === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  </button>

                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:text-red-500 disabled:opacity-40"
                    disabled={isDeleting}
                    aria-label="Delete session"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete "${session.title ?? 'Workout'}"? All sets will be lost.`,
                        )
                      ) {
                        deleteMutation.mutate(session.id);
                      }
                    }}
                  >
                    {isDeleting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                  </button>

                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted"
                    onClick={() => router.push(`/fitness/sessions/${session.id}`)}
                  />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
