'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fitnessKeys, type SessionSetGroup, type SessionWithSets } from '@/lib/queries/fitness';
import {
  addSessionSet,
  deleteSession,
  deleteSessionSet,
  getSessionWithSets,
  updateSession,
  updateSessionSet,
  type SessionSetPatch,
} from '@/lib/queries/sessions';
import type { Exercise, SessionSet } from '@/lib/db/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseBlock } from './SessionExerciseBlock';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextPosition(data: SessionWithSets): number {
  let max = -1;
  for (const group of data.groups)
    for (const set of group.sets) max = Math.max(max, set.position);
  return max + 1;
}

interface SessionEditorProps {
  sessionId: string;
}

export function SessionEditor({ sessionId }: SessionEditorProps) {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: fitnessKeys.session(sessionId),
    queryFn: () => getSessionWithSets(supabase, sessionId),
    staleTime: Infinity,
  });

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (data) {
      setTitle(data.session.title ?? '');
      setDate(data.session.performed_at.slice(0, 10));
      setNotes(data.session.notes ?? '');
    }
  }, [data?.session.id]);

  const patch = (updater: (prev: SessionWithSets) => SessionWithSets) =>
    queryClient.setQueryData<SessionWithSets>(fitnessKeys.session(sessionId), (prev) =>
      prev ? updater(prev) : prev,
    );

  const replaceSet = (set: SessionSet) =>
    patch((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => ({
        ...g,
        sets: g.sets.map((s) => (s.id === set.id ? set : s)),
      })),
    }));

  const mergeSet = (setId: string, fields: SessionSetPatch) =>
    patch((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => ({
        ...g,
        sets: g.sets.map((s) => (s.id === setId ? { ...s, ...fields } : s)),
      })),
    }));

  const updateSetMutation = useMutation({
    mutationFn: ({ setId, fields }: { setId: string; fields: SessionSetPatch }) =>
      updateSessionSet(supabase, setId, fields),
    onMutate: ({ setId, fields }) => mergeSet(setId, fields),
    onSuccess: (set) => replaceSet(set),
    onError: () => queryClient.invalidateQueries({ queryKey: fitnessKeys.session(sessionId) }),
  });

  const addSetMutation = useMutation({
    mutationFn: (group: SessionSetGroup) => {
      const last = group.sets.at(-1);
      return addSessionSet(supabase, {
        session_id: sessionId,
        exercise_id: group.exercise_id,
        set_number: group.sets.length + 1,
        position: data ? nextPosition(data) : group.sets.length,
        reps: last?.reps ?? null,
        weight: last?.weight ?? null,
      });
    },
    onSuccess: (set) =>
      patch((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.exercise_id === set.exercise_id ? { ...g, sets: [...g.sets, set] } : g,
        ),
      })),
  });

  const addExerciseMutation = useMutation({
    mutationFn: (exercise: Exercise) =>
      addSessionSet(supabase, {
        session_id: sessionId,
        exercise_id: exercise.id,
        set_number: 1,
        position: data ? nextPosition(data) : 0,
      }),
    onSuccess: (set, exercise) =>
      patch((prev) => ({
        ...prev,
        groups: [
          ...prev.groups,
          {
            exercise_id: exercise.id,
            exercise: { id: exercise.id, name: exercise.name, category: exercise.category },
            sets: [set],
          },
        ],
      })),
  });

  const removeSetMutation = useMutation({
    mutationFn: (setId: string) => deleteSessionSet(supabase, setId),
    onSuccess: (_d, setId) =>
      patch((prev) => ({
        ...prev,
        groups: prev.groups
          .map((g) => ({ ...g, sets: g.sets.filter((s) => s.id !== setId) }))
          .filter((g) => g.sets.length > 0),
      })),
  });

  const updateMetaMutation = useMutation({
    mutationFn: (p: { title?: string | null; notes?: string | null; performed_at?: string }) =>
      updateSession(supabase, sessionId, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fitnessKeys.sessions() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSession(supabase, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fitnessKeys.sessions() });
      queryClient.removeQueries({ queryKey: fitnessKeys.session(sessionId) });
      router.push('/fitness/sessions');
    },
  });

  if (isPending)
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Spinner /> Loading session…
      </div>
    );
  if (isError)
    return (
      <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
    );

  const { groups } = data;
  const setBusy =
    updateSetMutation.isPending || addSetMutation.isPending || removeSetMutation.isPending;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader title="Edit session" />

      {/* Title + Date */}
      <Card className="space-y-3">
        <Input
          label="Title"
          value={title}
          placeholder="Workout"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => updateMetaMutation.mutate({ title: title.trim() || null })}
        />
        <Input
          label="Date"
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          onBlur={() => {
            if (date) updateMetaMutation.mutate({ performed_at: date + 'T12:00:00.000Z' });
          }}
        />
      </Card>

      {/* Exercises */}
      {groups.map((group) => (
        <ExerciseBlock
          key={group.exercise_id}
          group={group}
          setBusy={setBusy}
          onToggle={(set) =>
            updateSetMutation.mutate({ setId: set.id, fields: { completed: !set.completed } })
          }
          onCommit={(setId, fields) => updateSetMutation.mutate({ setId, fields })}
          onAddSet={() => addSetMutation.mutate(group)}
          onRemoveSet={(setId) => removeSetMutation.mutate(setId)}
        />
      ))}

      {/* Add exercise */}
      <Card>
        <CardTitle className="mb-3">Add exercise</CardTitle>
        <ExercisePicker onSelect={(exercise) => addExerciseMutation.mutate(exercise)} />
        {addExerciseMutation.isPending ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <Spinner /> Adding…
          </p>
        ) : null}
      </Card>

      {/* Notes */}
      <Card>
        <CardTitle className="mb-3">Notes</CardTitle>
        <TextArea
          value={notes}
          placeholder="How did it go? (optional)"
          rows={4}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => updateMetaMutation.mutate({ notes: notes.trim() || null })}
        />
      </Card>

      {/* Delete */}
      <Button
        variant="ghost"
        className="w-full"
        style={{ color: 'var(--down)' }}
        disabled={deleteMutation.isPending}
        onClick={() => {
          if (confirm('Delete this session? All sets will be permanently removed.')) {
            deleteMutation.mutate();
          }
        }}
      >
        {deleteMutation.isPending ? <Spinner /> : <Trash2 className="h-4 w-4" />}
        Delete session
      </Button>
    </div>
  );
}
