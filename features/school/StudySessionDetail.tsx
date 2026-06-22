import { CalendarDays } from 'lucide-react';
import type { StudySessionWithSubject } from '@/lib/queries/school';

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Read-only expanded view of a single study session — full untruncated content and metadata.
 * Rendered inside a {@link FocusOverlay}; visually distinct from the compact row
 * (larger type, generous spacing, eyebrow date chip).
 */
export function StudySessionDetail({ session }: { session: StudySessionWithSubject }) {
  const date = new Date(session.started_at).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const time = new Date(session.started_at).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <article className="space-y-4">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
        <CalendarDays className="h-3.5 w-3.5" />
        {date} at {time}
      </div>

      <div className="flex items-center gap-2 text-sm font-medium text-foreground/85">
        <span>Duration:</span>
        <span className="tabular-nums text-accent">{fmtDuration(session.duration_seconds)}</span>
      </div>

      {session.note ? (
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
          {session.note}
        </p>
      ) : (
        <p className="text-sm italic text-muted">No notes.</p>
      )}
    </article>
  );
}
