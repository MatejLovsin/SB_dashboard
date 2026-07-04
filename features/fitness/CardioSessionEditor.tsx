'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  cardioKeys,
  getCardioSessionWithEntries,
  updateCardioSession,
  updateCardioEntry,
  addCardioEntry,
  deleteCardioEntry,
  deleteCardioSession,
  type CardioSessionWithEntries,
  type CardioEntryPatch,
} from '@/lib/queries/cardio';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { PageHeader } from '@/components/ui/PageHeader';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  sessionId: string;
}

export function CardioSessionEditor({ sessionId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: cardioKeys.session(sessionId),
    queryFn: () => getCardioSessionWithEntries(supabase, sessionId),
    staleTime: Infinity,
  });

  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (data) {
      setDate(data.session.performed_at.slice(0, 10));
      setNotes(data.session.notes ?? '');
    }
  }, [data?.session.id]);

  const patch = (updater: (prev: CardioSessionWithEntries) => CardioSessionWithEntries) =>
    queryClient.setQueryData<CardioSessionWithEntries>(cardioKeys.session(sessionId), (prev) =>
      prev ? updater(prev) : prev,
    );

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: cardioKeys.sessions() });
    queryClient.invalidateQueries({ queryKey: cardioKeys.activityLibrary() });
  };

  const updateSessionMutation = useMutation({
    mutationFn: (p: { notes?: string | null; performed_at?: string }) =>
      updateCardioSession(supabase, sessionId, p),
    onSuccess: invalidateLists,
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, fields }: { entryId: string; fields: CardioEntryPatch }) =>
      updateCardioEntry(supabase, entryId, fields),
    onSuccess: (entry) => {
      patch((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => (e.id === entry.id ? entry : e)),
      }));
      invalidateLists();
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: () => {
      const position = data ? data.entries.length : 0;
      return addCardioEntry(supabase, sessionId, position, {
        activity: '',
        duration_minutes: 0,
        intensity: 5,
      });
    },
    onSuccess: (entry) =>
      patch((prev) => ({ ...prev, entries: [...prev.entries, entry] })),
  });

  const removeEntryMutation = useMutation({
    mutationFn: (entryId: string) => deleteCardioEntry(supabase, entryId),
    onSuccess: (_d, entryId) => {
      patch((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== entryId) }));
      invalidateLists();
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: () => deleteCardioSession(supabase, sessionId),
    onSuccess: () => {
      invalidateLists();
      queryClient.removeQueries({ queryKey: cardioKeys.session(sessionId) });
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
    return <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>;

  const { entries } = data;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader title="Edit cardio session" />

      <Card className="space-y-3">
        <Input
          label="Date"
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          onBlur={() => {
            if (date) updateSessionMutation.mutate({ performed_at: date + 'T12:00:00.000Z' });
          }}
        />
      </Card>

      <div className="space-y-4">
        {entries.map((entry, index) => (
          <Card key={entry.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle>Activity {index + 1}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeEntryMutation.mutate(entry.id)}
                disabled={removeEntryMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-muted" />
              </Button>
            </div>

            <Input
              label="Machine / activity"
              defaultValue={entry.activity}
              onBlur={(e) =>
                updateEntryMutation.mutate({ entryId: entry.id, fields: { activity: e.target.value.trim() } })
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Duration (min)"
                type="number"
                min="0"
                step="1"
                defaultValue={entry.duration_minutes}
                onBlur={(e) =>
                  updateEntryMutation.mutate({
                    entryId: entry.id,
                    fields: { duration_minutes: Number(e.target.value) },
                  })
                }
              />
              <Input
                label="Distance (km)"
                type="number"
                min="0"
                step="0.1"
                defaultValue={entry.distance_km ?? ''}
                onBlur={(e) =>
                  updateEntryMutation.mutate({
                    entryId: entry.id,
                    fields: { distance_km: e.target.value ? Number(e.target.value) : null },
                  })
                }
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Intensity (RPE)</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateEntryMutation.mutate({ entryId: entry.id, fields: { intensity: d } })}
                    className={`h-8 w-8 rounded-full text-xs font-semibold transition-colors ${
                      d <= entry.intensity
                        ? 'bg-accent text-white'
                        : 'border border-border text-muted'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <TextArea
              label="Notes"
              defaultValue={entry.notes ?? ''}
              rows={2}
              onBlur={(e) =>
                updateEntryMutation.mutate({
                  entryId: entry.id,
                  fields: { notes: e.target.value.trim() || null },
                })
              }
            />
          </Card>
        ))}
      </div>

      <Button
        variant="secondary"
        className="w-full"
        onClick={() => addEntryMutation.mutate()}
        disabled={addEntryMutation.isPending}
      >
        <Plus className="h-4 w-4" />
        Add another activity
      </Button>

      <Card>
        <CardTitle className="mb-3">Session notes</CardTitle>
        <TextArea
          value={notes}
          placeholder="Anything about the session overall (optional)"
          rows={3}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => updateSessionMutation.mutate({ notes: notes.trim() || null })}
        />
      </Card>

      <Button
        variant="ghost"
        className="w-full"
        style={{ color: 'var(--down)' }}
        disabled={deleteSessionMutation.isPending}
        onClick={() => {
          if (confirm('Delete this cardio session? All activities will be permanently removed.')) {
            deleteSessionMutation.mutate();
          }
        }}
      >
        {deleteSessionMutation.isPending ? <Spinner /> : <Trash2 className="h-4 w-4" />}
        Delete session
      </Button>
    </div>
  );
}
