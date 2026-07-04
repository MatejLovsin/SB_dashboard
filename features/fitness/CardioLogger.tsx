'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cardioKeys, createCardioSession, listRecentActivityNames } from '@/lib/queries/cardio';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type DraftEntry = {
  localId: string;
  activity: string;
  duration_minutes: string;
  intensity: number | null;
  distance_km: string;
  notes: string;
};

function blankEntry(localId: string): DraftEntry {
  return { localId, activity: '', duration_minutes: '', intensity: null, distance_km: '', notes: '' };
}

export function CardioLogger() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const nextId = useRef(0);
  const makeId = () => String(nextId.current++);

  const [date, setDate] = useState(todayISO());
  const [sessionNotes, setSessionNotes] = useState('');
  const [entries, setEntries] = useState<DraftEntry[]>([blankEntry(makeId())]);
  const [savedCount, setSavedCount] = useState(0);

  const { data: recentActivities } = useQuery({
    queryKey: cardioKeys.recentActivities(),
    queryFn: () => listRecentActivityNames(supabase),
    staleTime: 60_000,
  });

  const patchEntry = (localId: string, fields: Partial<DraftEntry>) =>
    setEntries((prev) => prev.map((e) => (e.localId === localId ? { ...e, ...fields } : e)));

  const addEntry = () => setEntries((prev) => [...prev, blankEntry(makeId())]);
  const removeEntry = (localId: string) =>
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.localId !== localId) : prev));

  const saveMutation = useMutation({
    mutationFn: () =>
      createCardioSession(supabase, {
        performed_at: date ? date + 'T12:00:00.000Z' : undefined,
        notes: sessionNotes.trim() || null,
        entries: entries.map((e) => ({
          activity: e.activity.trim(),
          duration_minutes: Number(e.duration_minutes),
          intensity: e.intensity as number,
          distance_km: e.distance_km ? Number(e.distance_km) : null,
          notes: e.notes.trim() || null,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardioKeys.sessions() });
      queryClient.invalidateQueries({ queryKey: cardioKeys.recentActivities() });
      setSavedCount((n) => n + 1);
      setDate(todayISO());
      setSessionNotes('');
      setEntries([blankEntry(makeId())]);
    },
  });

  const canSave =
    entries.length > 0 &&
    entries.every(
      (e) =>
        e.activity.trim().length > 0 &&
        Number(e.duration_minutes) > 0 &&
        e.intensity !== null,
    );

  return (
    <div className="space-y-5 pb-8">
      <PageHeader title="Log cardio" description="One entry per activity — RPE keeps intensity comparable across machines." />

      {savedCount > 0 ? (
        <p className="rounded-xl border border-border bg-card-2 px-3.5 py-2.5 text-sm text-muted">
          Session saved. Log another below, or head back to Fitness.
        </p>
      ) : null}

      <Card className="space-y-3">
        <Input
          label="Date"
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
        />
      </Card>

      {recentActivities && recentActivities.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {recentActivities.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                const last = entries[entries.length - 1];
                if (last && !last.activity.trim()) patchEntry(last.localId, { activity: name });
                else setEntries((prev) => [...prev, { ...blankEntry(makeId()), activity: name }]);
              }}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {entries.map((entry, index) => (
          <Card key={entry.localId} className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle>Activity {index + 1}</CardTitle>
              {entries.length > 1 ? (
                <Button variant="ghost" size="icon" onClick={() => removeEntry(entry.localId)}>
                  <Trash2 className="h-4 w-4 text-muted" />
                </Button>
              ) : null}
            </div>

            <Input
              label="Machine / activity"
              placeholder="e.g. Treadmill, Stairmaster, Outdoor hike"
              value={entry.activity}
              onChange={(e) => patchEntry(entry.localId, { activity: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Duration (min)"
                type="number"
                min="0"
                step="1"
                value={entry.duration_minutes}
                onChange={(e) => patchEntry(entry.localId, { duration_minutes: e.target.value })}
              />
              <Input
                label="Distance (km) — optional"
                type="number"
                min="0"
                step="0.1"
                value={entry.distance_km}
                onChange={(e) => patchEntry(entry.localId, { distance_km: e.target.value })}
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">
                Intensity (RPE, 1 = very light, 10 = max effort)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      patchEntry(entry.localId, { intensity: entry.intensity === d ? null : d })
                    }
                    className={`h-8 w-8 rounded-full text-xs font-semibold transition-colors ${
                      entry.intensity != null && d <= entry.intensity
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
              label="Notes (optional)"
              placeholder="How did it feel? Any details specific to this activity."
              rows={2}
              value={entry.notes}
              onChange={(e) => patchEntry(entry.localId, { notes: e.target.value })}
            />
          </Card>
        ))}
      </div>

      <Button variant="secondary" className="w-full" onClick={addEntry}>
        <Plus className="h-4 w-4" />
        Add another activity
      </Button>

      <Card>
        <CardTitle className="mb-3">Session notes (optional)</CardTitle>
        <TextArea
          placeholder="Anything about the session overall (optional)"
          rows={3}
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
        />
      </Card>

      {saveMutation.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {(saveMutation.error as Error).message}
        </p>
      ) : null}

      <Button
        className="w-full"
        disabled={!canSave || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? <Spinner /> : null}
        Save cardio session
      </Button>
    </div>
  );
}
