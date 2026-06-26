'use client';
import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Pencil, Trash2, Plus } from 'lucide-react';
import {
  journalKeys,
  listJournalWeeks,
  upsertJournalWeek,
  deleteJournalWeek,
  weekRangeLabel,
  groupByMonth,
  targetWeekStart,
} from '@/lib/queries/journal';
import type { JournalWeek } from '@/lib/db/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { TextArea } from '@/components/ui/TextArea';

// ---------------------------------------------------------------------------
// Week card row
// ---------------------------------------------------------------------------

function WeekCard({
  week,
  onOpen,
  onEdit,
}: {
  week: JournalWeek;
  onOpen: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer rounded-2xl border border-border bg-[var(--surface)] p-4 transition-colors hover:border-accent/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{weekRangeLabel(week.week_start)}</p>
          {week.content && (
            <p className="mt-1 text-sm text-muted line-clamp-2 whitespace-pre-line">
              {week.content}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function JournalReview() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: journalKeys.list(),
    queryFn: () => listJournalWeeks(supabase),
  });

  // Focus overlay state — retain last week so content survives exit animation
  const [focusWeek, setFocusWeek] = useState<JournalWeek | null>(null);
  const lastFocusWeek = useRef<JournalWeek | null>(null);
  if (focusWeek) lastFocusWeek.current = focusWeek;
  const displayWeek = focusWeek ?? lastFocusWeek.current;

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Backfill (past week) state
  const [addingPast, setAddingPast] = useState(false);
  const [pastWeekStart, setPastWeekStart] = useState('');
  const [pastContent, setPastContent] = useState('');

  // 12 recent completed weeks that aren't already in the loaded list
  const candidateWeeks = useMemo(() => {
    const base = new Date(targetWeekStart() + 'T00:00:00Z');
    const candidates: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getTime() - 7 * i * 86_400_000);
      candidates.push(d.toISOString().slice(0, 10));
    }
    const existing = new Set((data ?? []).map((w) => w.week_start));
    return candidates.filter((ws) => !existing.has(ws));
  }, [data]);

  // Mutation for editing an existing entry
  const saveMutation = useMutation({
    mutationFn: (input: { week_start: string; content: string }) =>
      upsertJournalWeek(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
      setEditingId(null);
    },
  });

  // Separate mutation for backfilling a past week
  const backfillMutation = useMutation({
    mutationFn: (input: { week_start: string; content: string }) =>
      upsertJournalWeek(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
      setAddingPast(false);
      setPastWeekStart('');
      setPastContent('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJournalWeek(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
      setEditingId(null);
    },
  });

  function handleEdit(week: JournalWeek) {
    setFocusWeek(null);
    setEditingId(week.id);
    setEditContent(week.content);
  }

  function handleOpenBackfill() {
    setAddingPast(true);
    setPastWeekStart(candidateWeeks[0] ?? '');
    setPastContent('');
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const weeks = data ?? [];
  const months = groupByMonth(weeks);

  return (
    <div className="space-y-6">
      {/* Backfill: "+ Add a past week" button */}
      {candidateWeeks.length > 0 && !addingPast && (
        <Button variant="secondary" size="sm" onClick={handleOpenBackfill}>
          <Plus className="h-3.5 w-3.5" />
          Add a past week
        </Button>
      )}

      {/* Backfill form */}
      {addingPast && (
        <div className="space-y-3 rounded-2xl border border-accent/40 bg-card p-4">
          <p className="text-sm font-semibold">Add a past week</p>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Week</label>
            <select
              value={pastWeekStart}
              onChange={(e) => setPastWeekStart(e.target.value)}
              className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {candidateWeeks.map((ws) => (
                <option key={ws} value={ws}>
                  {weekRangeLabel(ws)}
                </option>
              ))}
            </select>
          </div>
          <TextArea
            value={pastContent}
            onChange={(e) => setPastContent(e.target.value)}
            placeholder="What happened this week…"
            maxRows={12}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (pastWeekStart && pastContent.trim()) {
                  backfillMutation.mutate({
                    week_start: pastWeekStart,
                    content: pastContent,
                  });
                }
              }}
              disabled={!pastWeekStart || !pastContent.trim() || backfillMutation.isPending}
            >
              {backfillMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setAddingPast(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {weeks.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No summaries yet"
          description="Head to the home dashboard to write your first weekly summary."
        />
      )}

      {/* Month sections — weeks stacked inside each */}
      {months.map((month) => (
        <section key={month.key} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
            {month.label}
          </h3>
          <div className="space-y-3">
            {month.weeks.map((week) =>
              editingId === week.id ? (
                <div
                  key={week.id}
                  className="space-y-3 rounded-2xl border border-accent/40 bg-card p-4"
                >
                  <p className="text-sm font-semibold">
                    {weekRangeLabel(week.week_start)}
                  </p>
                  <TextArea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    maxRows={12}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        saveMutation.mutate({
                          week_start: week.week_start,
                          content: editContent,
                        })
                      }
                      disabled={!editContent.trim() || saveMutation.isPending}
                    >
                      {saveMutation.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => deleteMutation.mutate(week.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <WeekCard
                  key={week.id}
                  week={week}
                  onOpen={() => setFocusWeek(week)}
                  onEdit={() => handleEdit(week)}
                />
              ),
            )}
          </div>
        </section>
      ))}

      {/* Read-only focus overlay */}
      <FocusOverlay
        open={!!focusWeek}
        onClose={() => setFocusWeek(null)}
        title={displayWeek ? weekRangeLabel(displayWeek.week_start) : undefined}
        label={
          displayWeek
            ? `Week of ${weekRangeLabel(displayWeek.week_start)}`
            : 'Journal entry'
        }
        action={
          displayWeek ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Edit entry"
              onClick={() => {
                const w = displayWeek;
                setFocusWeek(null);
                setEditingId(w.id);
                setEditContent(w.content);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null
        }
      >
        {displayWeek && (
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
            {displayWeek.content}
          </p>
        )}
      </FocusOverlay>
    </div>
  );
}
