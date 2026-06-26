'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronUp, ChevronDown, Pencil, Trash2, Pin, Plus, Check, X } from 'lucide-react';
import {
  todoKeys,
  tomorrowUTC,
  listTodosByDate,
  materializePinsForDate,
  addTodo,
  updateTodoPositions,
  updateTodoTitle,
  deleteTodo,
  pinTodo,
  unpinTodo,
} from '@/lib/queries/todos';
import type { Todo } from '@/lib/db/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export function TodoPlanner() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  // Stable for the lifetime of this component mount — plan date is always tomorrow.
  const [planDate] = useState(() => tomorrowUTC());

  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const newInputRef = useRef<HTMLInputElement>(null);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: todoKeys.byDate(planDate),
    queryFn: async () => {
      try {
        await materializePinsForDate(supabase, planDate);
      } catch {
        // Table may not exist yet; skip materialization gracefully.
      }
      return listTodosByDate(supabase, planDate).catch(() => []);
    },
  });

  const invalidateDate = () =>
    queryClient.invalidateQueries({ queryKey: todoKeys.byDate(planDate) });
  const invalidatePins = () =>
    queryClient.invalidateQueries({ queryKey: todoKeys.pins() });

  const addMutation = useMutation({
    mutationFn: (title: string) =>
      addTodo(supabase, { title, due_date: planDate, position: todos.length }),
    onSuccess: () => {
      setNewTitle('');
      invalidateDate();
      newInputRef.current?.focus();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTodo(supabase, id),
    onSuccess: invalidateDate,
  });

  const reorderMutation = useMutation({
    mutationFn: (updates: { id: string; position: number }[]) =>
      updateTodoPositions(supabase, updates),
    onSuccess: invalidateDate,
  });

  const editMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateTodoTitle(supabase, id, title),
    onSuccess: () => {
      setEditingId(null);
      invalidateDate();
    },
  });

  const pinMutation = useMutation({
    mutationFn: (todo: Todo) => pinTodo(supabase, todo),
    onSuccess: () => {
      invalidateDate();
      invalidatePins();
    },
  });

  const unpinMutation = useMutation({
    mutationFn: (todo: Todo) => unpinTodo(supabase, todo),
    onSuccess: () => {
      invalidateDate();
      invalidatePins();
    },
  });

  function handleReorder(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= todos.length) return;
    const reordered = [...todos];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    const updates = reordered.map((t, i) => ({ id: t.id, position: i }));
    reorderMutation.mutate(updates);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ordered list */}
      <div className="space-y-2">
        {todos.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">
            No items yet — add your first to-do below.
          </p>
        )}

        {todos.map((todo, index) => (
          <div
            key={todo.id}
            className="flex items-start gap-2 rounded-2xl border border-border bg-[var(--surface)] p-3 transition-colors"
          >
            {/* Up / down arrows */}
            <div className="flex flex-col gap-0.5 pt-0.5">
              <button
                onClick={() => handleReorder(index, 'up')}
                disabled={index === 0 || reorderMutation.isPending}
                className="rounded p-0.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleReorder(index, 'down')}
                disabled={index === todos.length - 1 || reorderMutation.isPending}
                className="rounded p-0.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Title / inline edit */}
            <div className="min-w-0 flex-1">
              {editingId === todo.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = editTitle.trim();
                    if (trimmed && !editMutation.isPending) {
                      editMutation.mutate({ id: todo.id, title: trimmed });
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 rounded-lg border border-accent/40 bg-card px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={!editTitle.trim() || editMutation.isPending}
                    aria-label="Save"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm">{todo.title}</span>
                  {todo.pin_id && (
                    <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                      non-negotiable
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {editingId !== todo.id && (
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => {
                    setEditingId(todo.id);
                    setEditTitle(todo.title);
                  }}
                  className="rounded p-1 text-muted transition-colors hover:text-foreground"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() =>
                    todo.pin_id
                      ? unpinMutation.mutate(todo)
                      : pinMutation.mutate(todo)
                  }
                  className={`rounded p-1 transition-colors ${
                    todo.pin_id
                      ? 'text-accent'
                      : 'text-muted hover:text-foreground'
                  }`}
                  aria-label={todo.pin_id ? 'Remove non-negotiable' : 'Mark as non-negotiable'}
                  title={todo.pin_id ? 'Remove non-negotiable' : 'Mark as non-negotiable'}
                >
                  <Pin
                    className="h-3.5 w-3.5"
                    fill={todo.pin_id ? 'currentColor' : 'none'}
                  />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(todo.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded p-1 text-muted transition-colors hover:text-red-400 disabled:opacity-50"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = newTitle.trim();
          if (trimmed && !addMutation.isPending) addMutation.mutate(trimmed);
        }}
        className="flex gap-2"
      >
        <input
          ref={newInputRef}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a to-do…"
          className="flex-1 rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!newTitle.trim() || addMutation.isPending}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </form>

      <div className="pt-1">
        <Link
          href="/todos"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          Review performance →
        </Link>
      </div>
    </div>
  );
}
