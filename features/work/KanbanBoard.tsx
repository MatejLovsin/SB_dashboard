'use client';
import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, GripVertical, ArrowRight, Check, X } from 'lucide-react';
import type { RoadmapCard, RoadmapStatus, Priority, WorkBoard } from '@/lib/db/types';
import {
  workKeys,
  listBoards,
  createBoard,
  renameBoard,
  deleteBoard,
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
import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { CardForm } from './CardForm';
import { CardDetail } from './CardDetail';

const SELECTED_BOARD_KEY = 'work-selected-board';

const COLUMNS: { status: RoadmapStatus; label: string; color: string }[] = [
  { status: 'idea', label: 'Idea', color: 'bg-[var(--accent-soft)] text-[var(--muted)]' },
  { status: 'planned', label: 'Planned', color: 'bg-[var(--accent-soft)] text-[var(--accent)]' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-[var(--chart-4)]/20 text-[var(--chart-4)]' },
  { status: 'done', label: 'Done', color: 'bg-[var(--up)]/15 text-[var(--up)]' },
];

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function comparePriority(a: RoadmapCard, b: RoadmapCard): number {
  const rankA = a.priority ? PRIORITY_RANK[a.priority] : PRIORITY_RANK.low + 1;
  const rankB = b.priority ? PRIORITY_RANK[b.priority] : PRIORITY_RANK.low + 1;
  if (rankA !== rankB) return rankA - rankB;
  return a.position - b.position;
}

const NEXT_STATUS: Partial<Record<RoadmapStatus, RoadmapStatus>> = {
  idea: 'planned',
  planned: 'in_progress',
  in_progress: 'done',
};

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
  onAdvanceCard: (id: string, nextStatus: RoadmapStatus) => void;
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
  onAdvanceCard,
  isCreating,
}: KanbanColumnProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusCard, setFocusCard] = useState<RoadmapCard | null>(null);
  // Retain the last focused card so its content stays visible during the exit animation.
  const lastFocusCard = useRef<RoadmapCard | null>(null);
  if (focusCard) lastFocusCard.current = focusCard;
  const displayCard = focusCard ?? lastFocusCard.current;
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
        className="no-scrollbar flex flex-col gap-2 overflow-y-auto"
        style={{ maxHeight: '300px' }}
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
                onClick={() => setFocusCard(card)}
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
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <PriorityChip priority={card.priority} />
                      <div className="flex items-center gap-1">
                        <div className="flex gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); setEditingId(card.id); }}
                            aria-label="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="danger"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); onDeleteCard(card.id); }}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {NEXT_STATUS[status] && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onAdvanceCard(card.id, NEXT_STATUS[status]!); }}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] transition-all hover:bg-[var(--accent)]/20 active:scale-95"
                            aria-label={`Move to ${COLUMNS.find((c) => c.status === NEXT_STATUS[status])?.label}`}
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Focus overlay */}
      <FocusOverlay
        open={!!focusCard}
        onClose={() => setFocusCard(null)}
        title={displayCard?.title}
        label={displayCard ? `Card: ${displayCard.title}` : 'Card'}
        action={
          displayCard ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Edit card"
              onClick={() => {
                const c = displayCard;
                setFocusCard(null);
                setEditingId(c.id);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null
        }
      >
        {displayCard && <CardDetail card={displayCard} />}
      </FocusOverlay>

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

interface BoardTabsProps {
  boards: WorkBoard[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isCreating: boolean;
}

function BoardTabs({ boards, selectedId, onSelect, onCreate, onRename, onDelete, isCreating }: BoardTabsProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
    setAdding(false);
  }

  function submitRename(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (!editName.trim()) return;
    onRename(id, editName.trim());
    setEditingId(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {boards.map((board) => {
        if (editingId === board.id) {
          return (
            <form key={board.id} onSubmit={(e) => submitRename(e, board.id)} className="flex items-center gap-1">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-32 rounded-xl border border-accent/40 bg-card px-2.5 py-1.5 text-sm outline-none"
              />
              <button type="submit" aria-label="Save name" className="text-accent">
                <Check className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Cancel rename" onClick={() => setEditingId(null)} className="text-muted">
                <X className="h-4 w-4" />
              </button>
            </form>
          );
        }

        const active = board.id === selectedId;
        return (
          <div
            key={board.id}
            className={`group flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-[var(--accent)] text-white'
                : 'border border-border bg-card text-muted hover:border-accent/30 hover:text-foreground'
            }`}
          >
            <button onClick={() => onSelect(board.id)}>{board.name}</button>
            {active && (
              <span className="ml-1 flex items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                <button
                  aria-label="Rename board"
                  onClick={() => { setEditingId(board.id); setEditName(board.name); }}
                  className="rounded p-0.5 hover:bg-white/20"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                {boards.length > 1 && (
                  <button
                    aria-label="Delete board"
                    onClick={() => {
                      if (window.confirm(`Delete "${board.name}" and all its cards? This can't be undone.`)) {
                        onDelete(board.id);
                      }
                    }}
                    className="rounded p-0.5 hover:bg-white/20"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </span>
            )}
          </div>
        );
      })}

      {adding ? (
        <form onSubmit={submitNew} className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Board name"
            className="w-32 rounded-xl border border-accent/40 bg-card px-2.5 py-1.5 text-sm outline-none"
          />
          <button type="submit" aria-label="Create board" disabled={isCreating} className="text-accent">
            <Check className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Cancel new board" onClick={() => setAdding(false)} className="text-muted">
            <X className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Board
        </button>
      )}
    </div>
  );
}

export function KanbanBoard() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: boards = [], isLoading: boardsLoading } = useQuery({
    queryKey: workKeys.boards(),
    queryFn: () => listBoards(supabase),
  });

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  // Restore the last-selected board once boards have loaded; fall back to the first one.
  useEffect(() => {
    if (boards.length === 0) return;
    setSelectedBoardId((current) => {
      if (current && boards.some((b) => b.id === current)) return current;
      const stored = localStorage.getItem(SELECTED_BOARD_KEY);
      return stored && boards.some((b) => b.id === stored) ? stored : boards[0].id;
    });
  }, [boards]);

  function selectBoard(id: string) {
    setSelectedBoardId(id);
    localStorage.setItem(SELECTED_BOARD_KEY, id);
  }

  const createBoardMutation = useMutation({
    mutationFn: (name: string) => createBoard(supabase, name),
    onSuccess: (board) => {
      queryClient.setQueryData<WorkBoard[]>(workKeys.boards(), (prev) => (prev ? [...prev, board] : [board]));
      selectBoard(board.id);
    },
  });

  const renameBoardMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameBoard(supabase, id, name),
    onSuccess: (updated) => {
      queryClient.setQueryData<WorkBoard[]>(workKeys.boards(), (prev) =>
        prev ? prev.map((b) => (b.id === updated.id ? updated : b)) : [updated],
      );
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: (id: string) => deleteBoard(supabase, id),
    onSuccess: (_void, id) => {
      const remaining = (queryClient.getQueryData<WorkBoard[]>(workKeys.boards()) ?? []).filter((b) => b.id !== id);
      queryClient.setQueryData<WorkBoard[]>(workKeys.boards(), remaining);
      queryClient.removeQueries({ queryKey: workKeys.cards(id) });
      if (selectedBoardId === id && remaining[0]) selectBoard(remaining[0].id);
    },
  });

  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: workKeys.cards(selectedBoardId ?? ''),
    queryFn: () => listCards(supabase, selectedBoardId!),
    enabled: !!selectedBoardId,
  });

  const createMutation = useMutation({
    mutationFn: (input: CardInput) => createCard(supabase, selectedBoardId!, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workKeys.cards(selectedBoardId!) }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CardInput> }) =>
      updateCard(supabase, id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData<RoadmapCard[]>(workKeys.cards(selectedBoardId!), (prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : [updated],
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCard(supabase, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workKeys.cards(selectedBoardId!) });
      const prev = queryClient.getQueryData<RoadmapCard[]>(workKeys.cards(selectedBoardId!));
      queryClient.setQueryData<RoadmapCard[]>(workKeys.cards(selectedBoardId!), (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(workKeys.cards(selectedBoardId!), ctx.prev);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; position: number }>) =>
      reorderCards(supabase, updates),
  });

  function handleReorder(status: RoadmapStatus, orderedIds: string[]) {
    const boardId = selectedBoardId!;
    const updates = orderedIds.map((id, position) => ({ id, position }));

    // Optimistic update
    queryClient.setQueryData<RoadmapCard[]>(workKeys.cards(boardId), (prev) => {
      if (!prev) return prev;
      const posMap = new Map(updates.map(({ id, position }) => [id, position]));
      return prev.map((c) => (posMap.has(c.id) ? { ...c, position: posMap.get(c.id)! } : c));
    });

    reorderMutation.mutate(updates, {
      onError: () => queryClient.invalidateQueries({ queryKey: workKeys.cards(boardId) }),
    });
  }

  if (boardsLoading || !selectedBoardId) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BoardTabs
        boards={boards}
        selectedId={selectedBoardId}
        onSelect={selectBoard}
        onCreate={(name) => createBoardMutation.mutate(name)}
        onRename={(id, name) => renameBoardMutation.mutate({ id, name })}
        onDelete={(id) => deleteBoardMutation.mutate(id)}
        isCreating={createBoardMutation.isPending}
      />

      {cardsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="stagger-fade flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(({ status, label, color }) => {
            const columnCards = cards
              .filter((c) => c.status === status)
              .sort(comparePriority);

            return (
              <KanbanColumn
                key={`${selectedBoardId}-${status}`}
                status={status}
                label={label}
                color={color}
                cards={columnCards}
                onCreateCard={(input) => createMutation.mutate({ ...input, status })}
                onUpdateCard={(id, patch) => updateMutation.mutate({ id, patch })}
                onDeleteCard={(id) => deleteMutation.mutate(id)}
                onReorder={handleReorder}
                onAdvanceCard={(id, nextStatus) => updateMutation.mutate({ id, patch: { status: nextStatus } })}
                isCreating={createMutation.isPending}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
