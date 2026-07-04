'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ChevronRight, HeartPulse, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cardioKeys, listCardioSessions, deleteCardioSession } from '@/lib/queries/cardio';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { CardioSessionDetail } from './CardioSessionDetail';

function formatDate(iso: string): string {
  return new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function CardioSessionList() {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [focusSessionId, setFocusSessionId] = useState<string | null>(null);
  const lastFocusSessionId = useRef<string | null>(null);
  if (focusSessionId) lastFocusSessionId.current = focusSessionId;
  const displayId = focusSessionId ?? lastFocusSessionId.current;

  const { data, isPending, isError, error } = useQuery({
    queryKey: cardioKeys.sessions(),
    queryFn: () => listCardioSessions(supabase, 60),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteCardioSession(supabase, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardioKeys.sessions() });
      queryClient.invalidateQueries({ queryKey: cardioKeys.activityLibrary() });
    },
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="secondary" onClick={() => router.push('/fitness/cardio')}>
          + Log cardio
        </Button>
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Loading sessions…
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="No cardio sessions yet"
          description="Log a cardio session to see it here."
        />
      ) : (
        <ul className="space-y-2">
          {data.map(({ session, entries }) => {
            const activityNames = [...new Set(entries.map((e) => e.activity))];
            const totalDuration = Math.round(entries.reduce((s, e) => s + Number(e.duration_minutes), 0));
            const isDeleting = deleteMutation.isPending && deleteMutation.variables === session.id;

            return (
              <li key={session.id}>
                <Card className="flex items-center gap-3 p-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setFocusSessionId(session.id)}
                  >
                    <p className="truncate font-medium">
                      {activityNames.length > 0 ? activityNames.join(', ') : 'Cardio'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(session.performed_at)}
                      {totalDuration > 0 ? ` · ${totalDuration} min` : ''}
                    </p>
                  </button>

                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:text-red-500 disabled:opacity-40"
                    disabled={isDeleting}
                    aria-label="Delete session"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this cardio session? All activities will be lost.')) {
                        deleteMutation.mutate(session.id);
                      }
                    }}
                  >
                    {isDeleting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                  </button>

                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted"
                    onClick={() => setFocusSessionId(session.id)}
                  />
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <FocusOverlay
        open={!!focusSessionId}
        onClose={() => setFocusSessionId(null)}
        title="Cardio session"
        label="Cardio session"
        action={
          displayId ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Edit session"
              onClick={() => {
                const id = displayId;
                setFocusSessionId(null);
                router.push(`/fitness/cardio/sessions/${id}`);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null
        }
      >
        {displayId && <CardioSessionDetail sessionId={displayId} />}
      </FocusOverlay>
    </div>
  );
}
