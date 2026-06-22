'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  schoolKeys,
  listAllStudySessions,
  deleteStudySession,
  type StudySessionWithSubject,
} from '@/lib/queries/school';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { StudySessionDetail } from './StudySessionDetail';

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

export function SessionHistory() {
  const supabase = createClient();
  const qc = useQueryClient();
  const [focusSession, setFocusSession] = useState<StudySessionWithSubject | null>(null);
  // Retain the last focused session so its content stays put during the exit animation.
  const lastFocusSession = useRef<StudySessionWithSubject | null>(null);
  if (focusSession) lastFocusSession.current = focusSession;
  const displaySession = focusSession ?? lastFocusSession.current;

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: schoolKeys.allSessions(),
    queryFn: () => listAllStudySessions(supabase),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteStudySession(supabase, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: schoolKeys.allSessions() });
      const prev = qc.getQueryData<StudySessionWithSubject[]>(schoolKeys.allSessions());
      qc.setQueryData<StudySessionWithSubject[]>(schoolKeys.allSessions(), (old) =>
        (old ?? []).filter((s) => s.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(schoolKeys.allSessions(), ctx.prev);
    },
    onSuccess: () => {
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
        <p className="text-sm text-muted">No sessions logged yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          role="button"
          tabIndex={0}
          onClick={() => setFocusSession(session)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFocusSession(session);
            }
          }}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent/30"
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
                {fmtDatetime(session.started_at)}
              </p>
              {session.note && (
                <p className="mt-2 line-clamp-2 text-xs text-muted">{session.note}</p>
              )}
            </div>

            <Button
              size="icon"
              variant="danger"
              className="h-8 w-8 shrink-0"
              aria-label="Delete session"
              disabled={deleteMut.isPending}
              onClick={(e) => {
                e.stopPropagation();
                deleteMut.mutate(session.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <FocusOverlay
        open={!!focusSession}
        onClose={() => setFocusSession(null)}
        title={displaySession ? (displaySession.subject_name ?? 'Unknown subject') : undefined}
        label={displaySession ? `Study Session: ${displaySession.subject_name ?? 'Unknown'}` : 'Study Session'}
      >
        {displaySession && <StudySessionDetail session={displaySession} />}
      </FocusOverlay>
    </div>
  );
}
