import { CalendarDays } from 'lucide-react';
import type { Note } from '@/lib/db/types';

/**
 * Read-only expanded view of a single note — full untruncated body and metadata.
 * Rendered inside a {@link FocusOverlay}; visually distinct from the compact row
 * and the edit form (larger type, generous spacing, eyebrow date chip).
 */
export function NoteDetail({ note }: { note: Note }) {
  const date = new Date(note.entry_date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="space-y-4">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
        <CalendarDays className="h-3.5 w-3.5" />
        {date}
      </div>

      {note.body ? (
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
          {note.body}
        </p>
      ) : (
        <p className="text-sm italic text-muted">No additional details.</p>
      )}
    </article>
  );
}
