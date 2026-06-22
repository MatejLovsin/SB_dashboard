import type { RoadmapCard, RoadmapStatus, Priority } from '@/lib/db/types';

/** Colour map mirrored from KanbanBoard — status eyebrow chip colours. */
const STATUS_CHIP: Record<RoadmapStatus, { color: string; label: string }> = {
  idea:        { color: 'bg-[var(--accent-soft)] text-[var(--muted)]',        label: 'Idea' },
  planned:     { color: 'bg-[var(--accent-soft)] text-[var(--accent)]',       label: 'Planned' },
  in_progress: { color: 'bg-[var(--chart-4)]/20 text-[var(--chart-4)]',      label: 'In Progress' },
  done:        { color: 'bg-[var(--up)]/15 text-[var(--up)]',                label: 'Done' },
};

const PRIORITY_CHIP: Record<Priority, string> = {
  low:    'bg-[var(--border)] text-[var(--muted)]',
  medium: 'bg-[var(--chart-3)]/20 text-[var(--chart-3)]',
  high:   'bg-[var(--down)]/15 text-[var(--down)]',
};

function PriorityChip({ priority }: { priority: Priority | null }) {
  if (!priority) return null;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_CHIP[priority]}`}
    >
      {priority}
    </span>
  );
}

/**
 * Read-only expanded view of a single roadmap card — full untruncated content
 * and metadata. Rendered inside a {@link FocusOverlay}; visually distinct from
 * the compact kanban card (larger type, generous spacing, eyebrow status chip).
 */
export function CardDetail({ card }: { card: RoadmapCard }) {
  const { color, label } = STATUS_CHIP[card.status];

  return (
    <article className="space-y-4">
      {/* Eyebrow: status chip + optional priority */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
        >
          {label}
        </span>
        <PriorityChip priority={card.priority} />
      </div>

      {card.description ? (
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
          {card.description}
        </p>
      ) : (
        <p className="text-sm italic text-muted">No description.</p>
      )}
    </article>
  );
}
