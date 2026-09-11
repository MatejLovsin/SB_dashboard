import { CalendarDays } from 'lucide-react';
import type { Note } from '@/lib/db/types';
import { Markdown } from '@/components/ui/Markdown';

/**
 * Read-only expanded view of a single note — full untruncated body and metadata.
 * Rendered inside a `reading`-size {@link FocusOverlay}; the body is markdown,
 * set in the long-form reading face by {@link Markdown}.
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

      {note.body?.trim() ? (
        <Markdown>{note.body}</Markdown>
      ) : (
        <p className="text-sm italic text-muted">No additional details.</p>
      )}
    </article>
  );
}
