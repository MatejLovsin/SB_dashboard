'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import type { RoadmapCard, RoadmapStatus, Priority } from '@/lib/db/types';
import {
  workKeys,
  listCards,
  createCard,
  updateCard,
  deleteCard,
  reorderCards,
  type CardInput,
} from '@/lib/queries/work';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CardForm } from './CardForm';

const COLUMNS: { status: RoadmapStatus; label: string; color: string }[] = [
  { status: 'idea', label: 'Idea', color: 'bg-[var(--accent-soft)] text-[var(--muted)]' },
  { status: 'planned', label: 'Planned', color: 'bg-[var(--accent-soft)] text-[var(--accent)]' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-[var(--chart-4)]/20 text-[var(--chart-4)]' },
  { status: 'done', label: 'Done', color: 'bg-[var(--up)]/15 text-[var(--up)]' },
];

const PRIORITY_CHIP: Record<Priority, string> = {
  low: 'bg-[var(--border)] text-[var(--muted)]',
  medium: 'bg-[var(--chart-3)]/20 text-[var(--chart-3)]',
  high: 'bg-[var(--down)]/15 text-[var(--down)]',
};

function PriorityChip({ priority }: { priority: Priority | null }) {
  if (!priority) return null;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_CHIP[priority]}`}>
      {priority}
    </span>
  );
}

interface KanbanColumnProps {
  status: RoadmapStatus;
  label: string;
  color: string;
  cards: RoadmapCard[];
  onCreateCard: (input: CardInput) => void;
  onUpdateCard: (id: string, patch: Partial<CardInput>) => void;
  onDeleteCard: (id: string) => void;
  onReorder: (status: RoadmapStatus, orderedIds: string[]) => void;
  isCreating: boolean;
}

function KanbanColumn({
  status,
  label,
  color,
  cards,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onReorder,
  isCreating,
}: KanbanColumnProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const draggedId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleDragStart(id: string) {
    draggedId.current = id;
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (draggedId.current !== id) setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = draggedId.current;
    draggedId.current = null;
    if (!sourceId || sourceId === targetId) return;

    const ids = cards.map((c) => c.id);
    const fromIdx = ids.indexOf(sourceId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...ids];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, sourceId);
    onReorder(status, reordered);
  }

  function handleColumnDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = draggedId.current;
    draggedId.current = null;
    if (!sourceId) return;
    // dropped at the end of an empty column or below all cards
    const ids = cards.map((c) => c.id);
    if (!ids.includes(sourceId)) return;
    const reordered = ids.filter((id) => id !== sourceId).concat(sourceId);
    onReorder(status, reordered);
  }

  return (
    <div className="flex min-w-[220px] flex-1 flex-col rounded-2xl border border-border bg-card p-3">
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${color}`}>{label}</span>
        <span className="text-xs text-muted">{cards.length}</span>
      </div>

      {/* Cards */}
      <div
        className="flex flex-1 flex-col gap-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleColumnDrop}
      >
        {cards.map((card) => (
          <div key={card.id}>
            {editingId === card.id ? (
              <div className="rounded-xl border border-accent/40 bg-card p-3">
                <CardForm
                  initial={{ title: card.title, description: card.description, status: card.status, priority: card.priority }}
                  defaultStatus={status}
                  onSubmit={(input) => {
                    onUpdateCard(card.id, input);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div
                draggable
                onDragStart={() => handleDragStart(card.id)}
                onDragOver={(e) => handleDragOver(e, card.id)}
                onDrop={(e) => handleDrop(e, card.id)}
                onDragEnd={() => setDragOverId(null)}
                className={`group cursor-grab rounded-xl border p-3 transition-all active:cursor-grabbing ${
                  dragOverId === card.id
                    ? 'border-accent/60 bg-[var(--card-2)] ring-1 ring-accent/30'
                    : 'border-border bg-[var(--surface)] hover:border-accent/30'
                }`}
              >
                <div className="flex items-start gap-1.5">
                  <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{card.title}</p>
                    {card.description && (
                      <p className="mt-1 text-xs text-muted line-clamp-2">{card.description}</p>
                    )}
                    {card.priority && (
                      <div className="mt-2">
                        <PriorityChip priority={card.priority} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditingId(card.id)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="danger"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onDeleteCard(card.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add card */}
      <div className="mt-3">
        {adding ? (
          <div className="rounded-xl border border-accent/40 bg-card p-3">
            <CardForm
              defaultStatus={status}
              onSubmit={(input) => {
                onCreateCard(input);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
              isPending={isCreating}
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-muted transition-colors hover:bg-border/40 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Add card
          </button>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: workKeys.cards(),
    queryFn: () => listCards(supabase),
  });

  const createMutation = useMutation({
    mutationFn: (input: CardInput) => createCard(supabase, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workKeys.cards() }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CardInput> }) =>
      updateCard(supabase, id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData<RoadmapCard[]>(workKeys.cards(), (prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : [updated],
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCard(supabase, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workKeys.cards() });
      const prev = queryClient.getQueryData<RoadmapCard[]>(workKeys.cards());
      queryClient.setQueryData<RoadmapCard[]>(workKeys.cards(), (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(workKeys.cards(), ctx.prev);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; position: number }>) =>
      reorderCards(supabase, updates),
  });

  function handleReorder(status: RoadmapStatus, orderedIds: string[]) {
    const updates = orderedIds.map((id, position) => ({ id, position }));

    // Optimistic update
    queryClient.setQueryData<RoadmapCard[]>(workKeys.cards(), (prev) => {
      if (!prev) return prev;
      const posMap = new Map(updates.map(({ id, position }) => [id, position]));
      return prev.map((c) => (posMap.has(c.id) ? { ...c, position: posMap.get(c.id)! } : c));
    });

    reorderMutation.mutate(updates, {
      onError: () => queryClient.invalidateQueries({ queryKey: workKeys.cards() }),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map(({ status, label, color }) => {
        const columnCards = cards
          .filter((c) => c.status === status)
          .sort((a, b) => a.position - b.position);

        return (
          <KanbanColumn
            key={status}
            status={status}
            label={label}
            color={color}
            cards={columnCards}
            onCreateCard={(input) => createMutation.mutate({ ...input, status })}
            onUpdateCard={(id, patch) => updateMutation.mutate({ id, patch })}
            onDeleteCard={(id) => deleteMutation.mutate(id)}
            onReorder={handleReorder}
            isCreating={createMutation.isPending}
          />
        );
      })}
    </div>
  );
}
