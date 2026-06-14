'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Pin, PinOff, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  fitnessKeys,
  listExercises,
  renameExercise,
  setExercisePinned,
} from '@/lib/queries/fitness';
import type { Exercise } from '@/lib/db/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';

export function ExerciseManager() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const { data: exercises = [], isPending } = useQuery({
    queryKey: fitnessKeys.exercisesList(),
    queryFn: () => listExercises(supabase),
  });

  // Renames and pins both touch the exercise dictionary; refresh anything keyed
  // under it (search results, this list). The Fitness hub is RSC and refreshes
  // on navigation, so no extra work needed there.
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: fitnessKeys.exercisesAll() });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameExercise(supabase, id, name),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      setDraft('');
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      setExercisePinned(supabase, id, pinned),
    onSuccess: invalidate,
  });

  function startEdit(exercise: Exercise) {
    setEditingId(exercise.id);
    setDraft(exercise.name);
  }

  function saveEdit(id: string) {
    const name = draft.trim();
    if (name.length === 0) return;
    renameMutation.mutate({ id, name });
  }

  return (
    <div>
      <PageHeader
        title="Manage exercises"
        description="Rename any exercise or pin your most important lifts to the Fitness hub."
      />

      {isPending ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <Spinner /> Loading exercises…
        </div>
      ) : exercises.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No exercises yet. They appear here once you log or create one.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {exercises.map((exercise) => {
            const isEditing = editingId === exercise.id;
            return (
              <li
                key={exercise.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5"
              >
                {/* Pin toggle */}
                <button
                  type="button"
                  onClick={() =>
                    pinMutation.mutate({ id: exercise.id, pinned: !exercise.pinned })
                  }
                  disabled={pinMutation.isPending}
                  aria-label={exercise.pinned ? 'Unpin exercise' : 'Pin exercise'}
                  className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                    exercise.pinned
                      ? 'text-accent'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {exercise.pinned ? (
                    <Pin className="h-4 w-4 fill-current" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </button>

                {/* Name / inline editor */}
                {isEditing ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(exercise.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-sm outline-none focus:border-accent"
                  />
                ) : (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {exercise.name}
                    </span>
                    {exercise.category ? (
                      <span className="text-xs text-muted">{exercise.category}</span>
                    ) : null}
                  </span>
                )}

                {/* Actions */}
                {isEditing ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => saveEdit(exercise.id)}
                      disabled={renameMutation.isPending || draft.trim().length === 0}
                      aria-label="Save name"
                      className="rounded-lg p-1.5 text-accent hover:bg-border/40 disabled:opacity-50"
                    >
                      {renameMutation.isPending ? <Spinner /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel"
                      className="rounded-lg p-1.5 text-muted hover:bg-border/40 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(exercise)}
                    aria-label="Rename exercise"
                    className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-border/40 hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}

                {/* Unpin affordance when pinned (clearer than re-tapping the pin) */}
                {exercise.pinned && !isEditing ? (
                  <button
                    type="button"
                    onClick={() =>
                      pinMutation.mutate({ id: exercise.id, pinned: false })
                    }
                    disabled={pinMutation.isPending}
                    aria-label="Unpin exercise"
                    className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-border/40 hover:text-foreground"
                  >
                    <PinOff className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
