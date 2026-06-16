'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  schoolKeys,
  listDiscardedSessions,
  deleteDiscardedSession,
  recoverDiscardedSession,
  type DiscardedSessionWithSubject,
} from '@/lib/queries/school';
import type { DiscardedStudySession } from '@/lib/db/types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDatetime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function DiscardedSessions() {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: schoolKeys.discarded(),
    queryFn: () => listDiscardedSessions(supabase),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDiscardedSession(supabase, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: schoolKeys.discarded() });
      const prev = qc.getQueryData<DiscardedSessionWithSubject[]>(schoolKeys.discarded());
      qc.setQueryData<DiscardedSessionWithSubject[]>(schoolKeys.discarded(), (old) =>
        (old ?? []).filter((s) => s.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(schoolKeys.discarded(), ctx.prev);
    },
  });

  const recoverMut = useMutation({
    mutationFn: (session: DiscardedStudySession) => recoverDiscardedSession(supabase, session),
    onMutate: async (session) => {
      await qc.cancelQueries({ queryKey: schoolKeys.discarded() });
      const prev = qc.getQueryData<DiscardedSessionWithSubject[]>(schoolKeys.discarded());
      qc.setQueryData<DiscardedSessionWithSubject[]>(schoolKeys.discarded(), (old) =>
        (old ?? []).filter((s) => s.id !== session.id),
      );
      return { prev };
    },
    onError: (_err, _session, ctx) => {
      if (ctx?.prev) qc.setQueryData(schoolKeys.discarded(), ctx.prev);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolKeys.allSessions() });
      qc.invalidateQueries({ queryKey: schoolKeys.all });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
        <p className="text-sm text-muted">No discarded sessions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const busy = deleteMut.isPending || recoverMut.isPending;
        return (
          <div
            key={session.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {session.subject_name ?? 'Unknown subject'}
                  </span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-sm font-medium tabular-nums text-accent">
                    {fmtDuration(session.duration_seconds)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Discarded {fmtDatetime(session.discarded_at)}
                </p>
                {session.note && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted">{session.note}</p>
                )}
              </div>

              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  aria-label="Recover session"
                  disabled={busy}
                  onClick={() => recoverMut.mutate(session)}
                >
                  {recoverMut.isPending ? (
                    <Spinner />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="danger"
                  className="h-8 w-8"
                  aria-label="Delete session"
                  disabled={busy}
                  onClick={() => deleteMut.mutate(session.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
