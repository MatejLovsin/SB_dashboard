'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createExercise, fitnessKeys, searchExercises } from '@/lib/queries/fitness';
import type { Exercise } from '@/lib/db/types';
import { Spinner } from '@/components/ui/Spinner';

interface ExercisePickerProps {
  // Called when an existing exercise is chosen or a new one is created.
  onSelect: (exercise: Exercise) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// Autocomplete over the exercise dictionary: type to search, create on miss.
// Clears itself after a selection so it can drive repeated "add a line" flows.
export function ExercisePicker({
  onSelect,
  placeholder = 'Search or add an exercise…',
  autoFocus = false,
}: ExercisePickerProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the search term so we don't query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(input), 200);
    return () => clearTimeout(id);
  }, [input]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const { data: results = [], isFetching } = useQuery({
    queryKey: fitnessKeys.exercises(debounced),
    queryFn: () => searchExercises(supabase, debounced),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createExercise(supabase, { name }),
    onSuccess: (exercise) => {
      // Only refresh the exercise dictionary — not the whole `fitness` tree,
      // which would force the active plan query to refetch.
      queryClient.invalidateQueries({ queryKey: fitnessKeys.exercisesAll() });
      select(exercise);
    },
  });

  function select(exercise: Exercise) {
    onSelect(exercise);
    setInput('');
    setDebounced('');
    setOpen(false);
  }

  const trimmed = input.trim();
  const hasExactMatch = results.some(
    (exercise) => exercise.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const canCreate = trimmed.length > 0 && !hasExactMatch && !isFetching;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={input}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(event) => {
            setInput(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent"
        />
        {isFetching ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            <Spinner />
          </span>
        ) : null}
      </div>

      {open && (trimmed.length > 0 || results.length > 0) ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg">
          {results.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => select(exercise)}
                className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm hover:bg-border/40"
              >
                <span>{exercise.name}</span>
                {exercise.category ? (
                  <span className="text-xs text-muted">{exercise.category}</span>
                ) : null}
              </button>
            </li>
          ))}

          {canCreate ? (
            <li>
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(trimmed)}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-accent hover:bg-border/40 disabled:opacity-60"
              >
                {createMutation.isPending ? <Spinner /> : <Plus className="h-4 w-4" />}
                Create “{trimmed}”
              </button>
            </li>
          ) : null}

          {results.length === 0 && !canCreate && !isFetching ? (
            <li className="px-3.5 py-2 text-sm text-muted">No exercises found.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
